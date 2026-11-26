import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, lineIds, resizeBoard, shuffleBoard, templates } from '../public/bloom-data.js';

test('Each template fills every supported grid with distinct tasks and personal rewards', () => {
  for (const key of Object.keys(templates)) {
    for (const size of [3, 4, 5]) {
      const board = createBoard(key, size);
      assert.equal(board.cells.length, size ** 2);
      assert.equal(new Set(board.cells.map(cell => cell.task)).size, size ** 2);
      assert.ok(board.cells.every(cell => cell.task && cell.reward && !cell.done));
    }
  }
});

test('Horizontal, vertical and both diagonal lines unlock and undo correctly', () => {
  for (const n of [3, 4, 5]) {
    const b = createBoard('cozy', n);
    const seq = Array.from({length: n}, (_, i) => i);
    for (const indices of [seq, seq.map(r => r*n), seq.map(i => i*(n+1)), seq.map(i => (i+1)*(n-1))]) {
      b.cells.forEach(c => c.done = 0);
      indices.forEach(i => b.cells[i].done = 1);
      assert.deepEqual(lineIds(b), [indices]);
      b.cells[indices[0]].done = 0;
      assert.deepEqual(lineIds(b), []);
    }
    b.cells.forEach(c => c.done = 1);
    assert.equal(lineIds(b).length, 2*n+2);
  }
});

test('Resizing and shuffling preserve user content, icon, identity and reward history', () => {
  const b = createBoard('language', 5);
  Object.assign(b.cells[24], {task:'Моя задача', reward:'Моя награда', icon:'🌼', done:123});
  const original = JSON.stringify(b.cells);
  resizeBoard(b, 3);
  assert.equal(b.cells.length, 9);
  resizeBoard(b, 5);
  assert.equal(JSON.stringify(b.cells), original);
  shuffleBoard(b);
  const completed = b.cells.find(c => c.done);
  assert.equal(completed.reward, 'Моя награда');
  assert.equal(completed.icon, '🌼');
  assert.equal(new Set(b.cells.map(c => c.id)).size, 25);
});

test('Expanding a blank board retains empty editable cells', () => {
  const b = createBoard('blank', 3);
  b.cells[0].task = 'Первая задача';
  resizeBoard(b, 4);
  assert.equal(b.cells[0].task, 'Первая задача');
  assert.ok(b.cells.slice(1).every(c => c.task === '' && c.reward === ''));
});

test('An active grid preserves coordinates and restores hidden work after a JSON round trip', () => {
  const b = createBoard('cozy', 5);
  b.started = true;
  b.cells[11].done = 21;
  b.cells[24].done = 22;
  const before = structuredClone(b.cells);
  resizeBoard(b, 3);
  assert.deepEqual(b.cells[7], before[11]);
  assert.ok(b.overflow.some(c => c.id === before[24].id && c.done === 22));
  const restored = JSON.parse(JSON.stringify(b));
  resizeBoard(restored, 4);
  resizeBoard(restored, 5);
  assert.deepEqual(restored.cells, before);
});
