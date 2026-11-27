import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard, resizeBoard} from '../public/game/board.js';
import {completeCell, decodeStudio, duplicateDraft, finishBoard, newStudio, pressPlant, removeBoard, startBoard} from '../public/game/progress.js';
import {archive, basketPage, boardCollection, bookPage} from '../public/ui/herbarium-view.js';

test('Board filters distinguish cycles with matching names and attach actions to their IDs', () => {
  const store = newStudio();
  const first = store.boards[0];
  const second = createBoard('language', 5, first.title);
  const draft = createBoard();
  store.boards.push(second, draft);
  for (const board of [first, second]) startBoard(board, store.settings);
  for (const i of [1, 2, 3, 6]) completeCell(store, first, i);
  completeCell(store, second, 0);
  const live = boardCollection(store, 'started');
  for (const board of [first, second]) {
    assert.ok(live.includes('data-do="open:' + board.id + '"'));
    assert.ok(live.includes('data-do="board-png:' + board.id + '"'));
  }
  assert.match(live, /4 из 9 задач/);
  assert.match(live, /1 из 25 задач/);
  assert.match(live, /На неделю/);
  assert.match(live, /На месяц/);
  assert.equal(live.split('Открыта сейчас').length - 1, 1);
  assert.ok(!live.includes(draft.id));
  assert.ok(boardCollection(store, 'drafts').includes('data-do="duplicate-board:' + draft.id + '"'));
  finishBoard(store, second);
  assert.equal(store.active, first.id);
  const history = archive(store);
  for (const key of ['cycle-summary', 'repeat', 'archive-png', 'delete-board']) {
    assert.ok(history.includes('data-do="' + key + ':' + second.id + '"'));
  }
  for (const page of [live, history, boardCollection(newStudio(), 'drafts')]) {
    for (const route of ['boards/started', 'boards/drafts', 'history']) assert.ok(page.includes('href="#' + route + '"'));
  }
});

test('A duplicated draft retains visible and hidden content with independent IDs and a fresh seed', () => {
  const original = createBoard('language', 5, 'Вопросы');
  original.cells[24].task = 'Скрытая задача';
  resizeBoard(original, 3);
  original.theme = 'nordic';
  const copy = duplicateDraft(original);
  assert.equal(copy.title, 'Вопросы — копия');
  assert.equal(copy.theme, original.theme);
  assert.equal(copy.started, false);
  assert.notEqual(copy.id, original.id);
  assert.notEqual(copy.boardSeed, original.boardSeed);
  assert.deepEqual(copy.harvest, []);
  assert.deepEqual(copy.legacyLines, []);
  for (const key of ['cells', 'overflow']) {
    assert.equal(copy[key].length, original[key].length);
    for (const [i, cell] of copy[key].entries()) {
      assert.notEqual(cell.id, original[key][i].id);
      assert.deepEqual(cell, {...original[key][i], id: cell.id, done: 0});
    }
    copy[key][0].task = 'Новая задача';
    assert.notEqual(copy[key][0].task, original[key][0].task);
  }
});

for (const archived of [false, true]) {
  test('Deleting a ' + (archived ? 'finished' : 'live') + ' cycle preserves both flower records through backup', () => {
    const store = newStudio();
    const board = store.boards[0];
    startBoard(board, store.settings);
    for (const i of [1, 2, 3, 6, 0]) completeCell(store, board, i);
    const pressed = pressPlant(store, store.basket[0].uid);
    pressed.note = 'На память';
    const original = structuredClone([pressed, store.basket[0]]);
    if (archived) {
      finishBoard(store, board);
      removeBoard(store, store.active);
      assert.equal(store.history[0].id, board.id);
      assert.deepEqual(decodeStudio(JSON.stringify(store)), store);
    }
    removeBoard(store, board.id);
    const restored = decodeStudio(JSON.stringify(store));
    assert.deepEqual(restored.boards, []);
    assert.equal(restored.active, null);
    assert.deepEqual([restored.book[0], restored.basket[0]], original.map(plant => ({...plant, sourceBoardDeleted: true})));
    assert.match(basketPage(restored), /Удалённая доска/);
    assert.match(bookPage(restored, pressed.speciesId, pressed.uid, false), /Удалённая доска/);
    assert.throws(() => decodeStudio(JSON.stringify({...restored, active: board.id})));
    delete restored.book[0].sourceBoardDeleted;
    assert.throws(() => decodeStudio(JSON.stringify(restored)));
  });
}

test('Deleting the open board selects the first started board, then the first draft', () => {
  const store = newStudio(), draft = store.boards[0];
  const first = createBoard(), second = createBoard(), other = createBoard();
  store.boards.push(first, second, other);
  startBoard(first, store.settings);
  startBoard(second, store.settings);
  store.active = second.id;
  removeBoard(store, other.id);
  assert.equal(store.active, second.id);
  removeBoard(store, second.id);
  assert.equal(store.active, first.id);
  removeBoard(store, first.id);
  assert.equal(store.active, draft.id);
  assert.equal(draft.started, false);
});
