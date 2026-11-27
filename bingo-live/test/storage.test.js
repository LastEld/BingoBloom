import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, STORE } from '../public/game/board.js';
import { completeCell, decodeStudio, newStudio, pressPlant, startBoard } from '../public/game/progress.js';
import { openProgress } from '../public/game/storage.js';
import { guidePreferences } from '../public/ui/first-run.js';

function game() {
  const state = newStudio(), b = state.boards[0];
  startBoard(b, state.settings);
  for (const i of [1, 2, 3, 6]) completeCell(state, b, i);
  return state;
}

function device(state = game()) {
  const data = new Map([[STORE, JSON.stringify(state)]]);
  const storage = {
    rejectWrites: false,
    getItem: key => data.get(key) ?? null,
    setItem(key, value) {
      if (this.rejectWrites) throw new Error('QuotaExceededError');
      data.set(key, value);
    }
  };
  let queue = Promise.resolve();
  function lock(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  return {data, storage, tab: () => openProgress(() => storage, lock)};
}

const mark = index => state => completeCell(state, state.boards[0], index);

test('A rejected two-line move rolls back the cell, both flowers and the harvest ledger, including after reload', async () => {
  const d = device(), tab = d.tab(), original = d.data.get(STORE);
  d.storage.rejectWrites = true;
  assert.equal((await tab.commit(mark(0))).status, 'unavailable');
  assert.equal(d.data.get(STORE), original);
  assert.equal(JSON.stringify(tab.state), original);
  assert.equal(JSON.stringify(d.tab().state), original);
  d.storage.rejectWrites = false;
  assert.equal((await tab.commit(mark(0))).result.added, 2);
  const restored = d.tab().state;
  assert.ok(restored.boards[0].cells[0].done);
  assert.deepEqual(restored.basket.map(p => p.uid), restored.boards[0].harvest.map(p => p.uid));
});

test('Stale tabs marking different cells get an explicit conflict and can repeat against the updated board', async () => {
  const d = device(), a = d.tab(), b = d.tab();
  const [first, second] = await Promise.all([a.commit(mark(4)), b.commit(mark(8))]);
  assert.equal(first.status, 'saved');
  assert.equal(second.status, 'conflict');
  assert.ok(b.state.boards[0].cells[4].done);
  assert.equal(b.state.boards[0].cells[8].done, 0);
  assert.equal((await b.commit(mark(8))).status, 'saved');
  assert.ok([4,8].every(i => d.tab().state.boards[0].cells[i].done));
});

test('Two stale tabs cannot mint or press the same specimens twice, and a failed press stays fresh on restart', async () => {
  const d = device(), a = d.tab(), b = d.tab();
  const marks = await Promise.all([a.commit(mark(0)), b.commit(mark(0))]);
  assert.deepEqual(marks.map(r => r.status), ['saved', 'conflict']);
  const snapshot = d.data.get(STORE), uid = a.state.basket[0].uid;
  const press = state => pressPlant(state, uid);
  d.storage.rejectWrites = true;
  assert.equal((await a.commit(press)).status, 'unavailable');
  assert.equal(d.data.get(STORE), snapshot);
  assert.equal(a.state.book.length, 0);
  assert.equal(d.tab().state.basket.find(p => p.uid === uid).state, 'fresh');
  d.storage.rejectWrites = false;
  const presses = await Promise.all([a.commit(press), b.commit(press)]);
  assert.deepEqual(presses.map(r => r.status), ['saved', 'conflict']);
  const restored = d.tab().state;
  assert.equal(restored.boards[0].harvest.length, 2);
  assert.deepEqual(restored.book.map(p => p.uid), [uid]);
  assert.equal(restored.basket.length, 1);
});

test('Import preview and cancellation leave prior bytes intact; a failed replacement is recoverable and device settings survive', async () => {
  const d = device(), tab = d.tab(), original = d.data.get(STORE);
  const preference = 'bingo-bloom.large-field';
  d.data.set(preference, 'true');
  const imported = game();
  mark(0)(imported);
  for (const p of [...imported.basket]) pressPlant(imported, p.uid);
  const preview = decodeStudio(JSON.stringify(imported));
  assert.equal(preview.basket.length, 0);
  assert.equal(preview.book.length, 2);
  assert.equal(d.data.get(STORE), original);
  d.storage.rejectWrites = true;
  assert.equal((await tab.commit(null, preview)).status, 'unavailable');
  assert.equal(d.tab().raw, original);
  d.storage.rejectWrites = false;
  assert.equal((await tab.commit(null, preview)).status, 'saved');
  assert.deepEqual(d.tab().state, imported);
  assert.equal(d.data.get(preference), 'true');
});

test('Malformed current saves require an explicit replacement, and unsupported or inconsistent files fail validation', async () => {
  const d = device();
  d.data.set(STORE, '{');
  const tab = d.tab();
  assert.equal(tab.initial, 'invalid');
  assert.equal(tab.recovery, 'invalid');
  assert.equal(tab.state.boards.length, 0);
  assert.equal((await tab.commit(mark(2))).status, 'invalid');
  assert.equal(d.data.get(STORE), '{');
  assert.throws(() => decodeStudio('{'));
  const s = game();
  assert.throws(() => decodeStudio(JSON.stringify({...s, version: 3})));
  mark(0)(s);
  s.basket[1].sourceBoardId = 'mismatched';
  assert.throws(() => decodeStudio(JSON.stringify(s)));
  const old = createBoard('cozy', 4);
  const migrated = decodeStudio(JSON.stringify({version: 1, active: old.id, boards: [old], sound: false}));
  assert.equal((await tab.commit(null, migrated)).status, 'saved');
  assert.equal(tab.recovery, null);
  assert.equal(d.tab().state.boards[0].cells.length, 16);
});

test('Only a successful read of an absent save prepares a new guide and ready draft', async () => {
  const d = device();
  d.data.delete(STORE);
  const denied = openProgress(() => { throw Error('storage is disabled'); });
  assert.equal(denied.recovery, 'unavailable');
  assert.equal(denied.state.boards.length, 0);
  const first = d.tab(), initial = first.state.boards[0];
  assert.equal(first.recovery, null);
  assert.equal(first.state.guideId, initial.id);
  assert.ok(initial.cells.every(c => c.task && c.reward && !c.done));
  await first.commit();
  assert.deepEqual(d.tab().state, first.state);
  const old = structuredClone(first.state);
  delete old.guideId;
  assert.equal((await first.commit(null, old)).status, 'saved');
  assert.equal(d.tab().state.guideId, undefined);
  Object.assign(old, {boards: [], active: null});
  assert.equal((await first.commit(null, old)).status, 'saved');
  assert.deepEqual(d.tab().state, old);
  assert.equal(d.tab().recovery, null);
});

test('Guide flags survive reload independently without changing a save or preventing completion', async () => {
  const d = device(), tab = d.tab(), id = tab.state.guideId;
  const preferences = () => guidePreferences(() => d.storage);
  const original = d.data.get(STORE);
  for (const name of ['welcome', 'scratch', 'collected', 'press']) {
    assert.ok(preferences().available(id, name));
    preferences().mark(id, name);
    assert.equal(preferences().available(id, name), false);
    assert.equal(preferences().available(undefined, name), false);
  }
  assert.equal(d.data.get(STORE), original);
  d.storage.rejectWrites = true;
  const transient = preferences();
  transient.mark('next-profile', 'scratch');
  assert.equal(transient.available('next-profile', 'scratch'), false);
  d.storage.rejectWrites = false;
  assert.equal((await tab.commit(mark(0))).result.added, 2);
});
