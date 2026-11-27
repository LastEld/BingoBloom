import test from 'node:test';
import assert from 'node:assert/strict';
import { boardPage, boardTile, boardOptions } from '../public/ui/board-view.js';
import { basketPage, bookPage, sidebar } from '../public/ui/herbarium-view.js';
import { newStudio, startBoard, completeCell, pressPlant, decodeStudio } from '../public/game/progress.js';
import { createBoard } from '../public/game/board.js';

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
  assert.ok(!sheet.includes(plant.seed));
  assert.doesNotMatch(sheet, /Код рисунка|Paint seed|форма v\d/i);
  assert.match(sheet, /data-do="turn:1"[^>]+disabled/);
});

test('The shared six-slot basket keeps each harvest in issuance order across pressing and reload', () => {
  const store = newStudio();
  const first = store.boards[0], second = createBoard('cozy', 3, 'Доска <2>');
  store.boards.push(second);
  for (const board of [first, second]) {
    startBoard(board, store.settings);
    for (const i of [1, 2, 3, 6, 0]) completeCell(store, board, i);
  }
  const [oldDaisy, oldClover, newDaisy, newClover] = store.basket;
  for (const p of store.basket) p.collectedAt = '2026-04-10T12:00:00.000Z';
  const html = basketPage(decodeStudio(JSON.stringify(store)), {from: 'board', origin: {cellId: 'target'}});
  const uids = html => Array.from(html.matchAll(/data-basket-uid="([^"]+)"/g), match => match[1]);
  assert.deepEqual(uids(html), [newDaisy.uid, newClover.uid, oldDaisy.uid, oldClover.uid]);
  assert.equal((html.match(/class="basket-vacant"/g) ?? []).length, 2);
  assert.match(html, /Вернуться к клетке/);
  assert.match(html, /Доска &lt;2&gt; · A1–B1–C1/);
  assert.match(html, /<time datetime="2026-04-10/);
  assert.ok(html.includes('data-do="press:' + newDaisy.uid + '"'));
  assert.match(html, /<details><summary>Ещё<\/summary>/);
  const compact = sidebar(store, first, false);
  assert.match(compact, /4 из 6 мест/);
  assert.match(compact, />\+1</);
  assert.equal((compact.match(/canvas width=/g) ?? []).length, 3);
  assert.match(compact, /data-do="basket">Открыть корзинку/);
  assert.match(bookPage(store, 'daisy', null, false), /data-do="basket">Открыть корзинку/);

  pressPlant(store, newDaisy.uid);
  const restored = decodeStudio(JSON.stringify(store));
  assert.deepEqual(uids(basketPage(restored)), [newClover.uid, oldDaisy.uid, oldClover.uid]);
  assert.equal(restored.book[0].uid, newDaisy.uid);
  assert.match(sidebar(restored, second, false), /3 из 6 мест/);
});

test('The empty basket explains how to earn a flower and offers a route to the board', () => {
  const html = basketPage(newStudio(), {from: 'book'});
  assert.equal((html.match(/class="basket-vacant"/g) ?? []).length, 6);
  assert.match(html, /0 из 6 мест/);
  assert.match(html, /Соберите линию/);
  assert.match(html, /href="#board">К доске/);
  assert.match(html, />К гербарию</);
});

test('Board progress, panel order and compact bonus reflect the device layout', () => {
  const store = newStudio(), board = store.boards[0];
  startBoard(board, store.settings);
  for (const index of [0, 1, 2]) completeCell(store, board, index);
  const desktop = boardPage(store, board, false);
  const mobile = boardPage(store, board, false, false, true, true);
  assert.match(desktop, /В процессе/);
  assert.match(desktop, /<progress value="3" max="9"/);
  assert.ok(desktop.indexOf('bonus-panel') < desktop.indexOf('basket-panel'));
  assert.match(desktop, /<details class="panel bonus-panel" open>/);
  assert.ok(mobile.indexOf('basket-panel') < mobile.indexOf('bonus-panel'));
  assert.ok(mobile.indexOf('latest-flower') < mobile.indexOf('cycle-panel'));
  assert.match(mobile, /board-started large-field/);
  assert.doesNotMatch(mobile, /bonus-panel" open/);
  assert.match(boardOptions(board, true), /id="large-field" checked/);
  board.cells[0].reward = '';
  assert.match(boardTile(board.cells[0], 0, board, true, true), /class="task-text">Выполнено</);
});
