import test from 'node:test';
import assert from 'node:assert/strict';
import { boardTile } from '../public/ui/board-view.js';
import { bookPage } from '../public/ui/herbarium-view.js';
import { newStudio, startBoard, completeCell, pressPlant } from '../public/game/progress.js';

test('A completed tile exposes its reward and keeps the original task in its accessible name', () => {
  const store = newStudio();
  const board = store.boards[0];
  const cell = board.cells[0];
  cell.task = 'Прочитать <главу>';
  cell.reward = 'Кофе & торт';
  const face = () => boardTile(cell, 0, board, true, false);
  assert.match(face(), /class="task-text">Прочитать &lt;главу&gt;/);
  assert.doesNotMatch(face(), /Кофе/);

  startBoard(board, store.settings);
  completeCell(store, board, 0);
  assert.match(face(), /class="task-text">Кофе &amp; торт/);
  assert.match(face(), /aria-label="A1 · Прочитать &lt;главу&gt; · Выполнено. Награда: Кофе &amp; торт"/);
  assert.doesNotMatch(face(), /aria-description/);
  assert.match(boardTile(cell, 0, board, true, true), /aria-description="Входит в собранную линию бинго"/);
});

test('The herbarium shows the pressed flower, its source and the saved note as text', () => {
  const store = newStudio();
  const board = store.boards[0];
  startBoard(board, store.settings);
  for (const index of [0, 1, 2]) completeCell(store, board, index);
  const plant = pressPlant(store, store.basket[0].uid);
  plant.note = 'Сегодня <солнечно>';
  const sheet = bookPage(store, plant.speciesId, plant.uid, false);
  assert.match(sheet, /Лист № 001/);
  assert.ok(sheet.includes(`data-plant="${plant.uid}" role="img"`));
  assert.match(sheet, /Сегодня &lt;солнечно&gt;/);
  assert.ok(sheet.includes(plant.sourceLine));
  assert.match(sheet, /data-do="turn:1"[^>]+disabled/);
});
