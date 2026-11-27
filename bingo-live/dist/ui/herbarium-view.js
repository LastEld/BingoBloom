import { esc, lineIds, themes } from '../game/board.js';
import { boardPeriod, formatPeriod } from '../game/calendar.js';
import { capacity, sourceTitle, species } from '../game/progress.js';
import { icon } from './icons.js';
import { drawSpecimen } from '../plants/specimen.js';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const date = value => dateFormat.format(new Date(value));

function flowerHead(speciesId) {
  return `<img class="species-head" alt="" src="/assets/plants/${speciesId}/${speciesId}-heads-1.png">`;
}

export function specimenCanvas(plant, large = false) {
  const state = plant.state === 'fresh' ? 'Свежий цветок' : 'Засушенный цветок';
  const label = [state, species[plant.speciesId].name, plant.sourceLine].join(' · ');
  return `<canvas width="${large ? 650 : 150}" height="${large ? 806 : 186}"
    data-plant="${esc(plant.uid)}" role="img" aria-label="${esc(label)}"></canvas>`;
}

export function paintVisible(container, store) {
  const plants = new Map([...store.book, ...store.basket].map(plant => [plant.uid, plant]));
  for (const canvas of container.querySelectorAll('canvas[data-plant]')) {
    drawSpecimen(canvas, plants.get(canvas.dataset.plant), {paper: !!canvas.closest('.specimen-picture')}).catch(() => {
      if (canvas.isConnected) canvas.replaceWith('Не удалось загрузить рисунок');
    });
  }
}

function sourceAttributes(plant) {
  return plant ? `data-source="${esc(plant.sourceBoardId)}" data-line="${esc(plant.sourceLine)}"` : '';
}

function newestCollections(basket) {
  const collections = new Map();
  for (const [index, plant] of basket.entries()) {
    const key = plant.collectionId ?? plant.uid;
    const time = Date.parse(plant.collectedAt);
    if (!collections.has(key)) collections.set(key, {time, index, plants: []});
    const group = collections.get(key);
    group.time = Math.max(group.time, time);
    group.plants.push(plant);
  }
  return [...collections.values()]
    .sort((a, b) => b.time - a.time || b.index - a.index)
    .flatMap(group => group.plants);
}

function basketItem(plant) {
  return `<article class="basket-item" data-basket-uid="${esc(plant.uid)}" ${sourceAttributes(plant)}>
    ${specimenCanvas(plant, true)}
    <div><h2 tabindex="-1">${species[plant.speciesId].name}</h2><small>Свежий</small>
      <p>Собран <time datetime="${esc(plant.collectedAt)}">${date(plant.collectedAt)}</time></p>
      <p>${esc(sourceTitle(plant))} · ${esc(plant.sourceLine)}</p></div>
    <div class="basket-actions">
      <button class="btn" data-do="press:${esc(plant.uid)}">Засушить в гербарий</button>
      <details><summary>Ещё</summary>
        <button class="quiet" data-do="discard:${esc(plant.uid)}">Удалить из корзинки</button></details>
    </div>
  </article>`;
}

export function basketPage(store, entry) {
  const plants = newestCollections(store.basket);
  const vacant = Array.from({length: capacity - plants.length}, () =>
    '<div class="basket-vacant">Свободное место</div>').join('');
  const backLabel = entry?.origin?.cellId ? 'Вернуться к клетке' : entry?.from === 'book' ? 'К гербарию' : 'К доске';
  return `<div class="page-head"><div><h1 tabindex="-1">Корзинка</h1>
    <p class="desc">${plants.length} из ${capacity} мест</p></div>
    <button class="btn" data-do="return-cell">${backLabel}</button></div>
    ${plants.length ? '' : '<p class="basket-empty">Соберите линию бинго на любой доске, и здесь появится свежий цветок.</p>'}
    ${!plants.length && entry?.from === 'book' ? '<a class="btn" href="#board">К доске</a>' : ''}
    <div class="basket-tray">${plants.map(basketItem).join('')}${vacant}</div>`;
}

function speciesSlot(id, name, plant) {
  return `<button class="species-slot ${plant ? '' : 'locked'}" data-do="species:${id}"
    ${sourceAttributes(plant)} aria-label="${name}${plant ? '' : ' · вид ещё не открыт'}">
    ${plant ? specimenCanvas(plant) : flowerHead(id)}<span>${name}</span>
  </button>`;
}

export function sidebar(store, board, hint, largeField = false, mobile = false) {
  const slots = Object.entries(species).map(([id, entry]) =>
    speciesSlot(id, entry.name, store.book.findLast(plant => plant.speciesId === id))
  ).join('');
  const collected = new Set(store.book.map(plant => plant.speciesId)).size;
  const fresh = newestCollections(store.basket);
  const basket = `<section class="panel basket-panel">
      <div class="spread"><h2>Корзинка</h2><span class="count">${fresh.length} из ${capacity} мест</span></div>
      ${fresh.length ? `<div class="basket-minis">${fresh.slice(0, 3).map(plant => specimenCanvas(plant)).join('')}
        ${fresh.length > 3 ? `<span aria-label="Ещё цветов: ${fresh.length - 3}">+${fresh.length - 3}</span>` : ''}</div>` :
        `<p class="basket-empty">${icon('flower', 23)}<span>Соберите линию бинго, и здесь появится цветок.</span></p>`}
      <p class="hint">Свободных мест: ${capacity - fresh.length}</p>
      <button class="btn wide" data-do="basket">Открыть корзинку</button>
    </section>`;
  const bonus = `<details class="panel bonus-panel" ${largeField ? '' : 'open'}>
      <summary>Награда за линию</summary>
      <p class="bonus-value">${esc(board.bonus)}</p>
      ${board.started ? '' : `<button class="quiet" data-do="bonus">${icon('edit', 15)} Изменить награду</button>`}
      <p class="hint">За горизонталь, вертикаль или диагональ.</p>
      <label class="check-label"><input type="checkbox" id="line-hint" ${hint ? 'checked' : ''}>
        Подсветить линию для нового цветка</label>
    </details>`;
  const last = board.harvest.at(-1);
  const isFresh = last && store.basket.some(plant => plant.uid === last.uid);
  return `<aside class="sidebar">
    ${mobile ? basket + bonus : bonus + basket}
    ${board.started ? `<section class="panel latest-flower"><h2>Последний цветок</h2>
      ${last ? `<div class="row" ${sourceAttributes({...last, sourceBoardId:board.id})}>${flowerHead(last.speciesId)}
        <div><strong>${species[last.speciesId].name}</strong><p>${esc(last.sourceLine)}</p></div></div>
        ${isFresh ? `<button class="quiet" data-do="basket:${esc(last.uid)}">Найти в корзинке</button>` : ''}` :
        '<p>Здесь появится последний цветок с этой доски.</p>'}
      </section>
      <section class="panel cycle-panel"><button class="btn wide" data-do="finish">Завершить цикл</button></section>` : ''}
    <section class="panel herb-summary">
      <div class="spread"><h2>Гербарий</h2><span class="count">${collected} / ${Object.keys(species).length} видов</span></div>
      <div class="species-slots">${slots}</div>
      <a class="btn wide" href="#book">Открыть гербарий</a>
    </section>
  </aside>`;
}

function specimenSheet(plant, position, total, sheetNumber) {
  const entry = species[plant.speciesId];
  return `
    <div class="specimen-folio"><div class="folio-art">
    <div class="sheet-heading"><div class="latin-name"><small>Ботаническое название</small><span lang="la">${entry.latin}</span></div><small>Лист № ${sheetNumber}</small></div>
    <div class="specimen-picture">${specimenCanvas(plant, true)}
    </div>
    </div><div class="folio-notes"><div class="sheet-caption"><h2>${entry.name}</h2>
      <div class="pager">
        <button data-do="turn:-1" aria-label="Предыдущий экземпляр" ${position === 1 ? 'disabled' : ''}>‹</button>
        <span>${position} / ${total}</span>
        <button data-do="turn:1" aria-label="Следующий экземпляр" ${position === total ? 'disabled' : ''}>›</button>
      </div>
    </div>
    <dl class="specimen-data">
      <dt>Дата сбора</dt><dd>${date(plant.collectedAt)}</dd>
      <dt>Дата сушки</dt><dd>${date(plant.pressedAt)}</dd>
      <dt>Источник</dt><dd>${esc(sourceTitle(plant))} · ${esc(plant.sourceLine)}</dd>
    </dl>
    <label class="note-label">Личная заметка
      <textarea id="plant-note" data-id="${esc(plant.uid)}" maxlength="1200"
        placeholder="Что запомнилось в этот день?">${esc(plant.note)}</textarea>
    </label>
    <button class="btn" data-do="postcard">${icon('download', 16)} Сохранить открытку</button></div></div>`;
}

export function bookPage(store, selected, plantId, showIndex, origin = 'board') {
  const entry = species[selected];
  const specimens = store.book.filter(plant => plant.speciesId === selected);
  const plant = specimens.find(plant => plant.uid === plantId) ?? specimens.at(-1);
  const index = Object.entries(species).map(([id, entry]) => {
    const count = store.book.filter(plant => plant.speciesId === id).length;
    return `<button class="index-entry ${id === selected ? 'selected' : ''} ${count ? '' : 'locked'}"
      data-do="species:${id}" aria-pressed="${id === selected}">
      ${flowerHead(id)}<span>${entry.name}</span><small>${count}</small>
    </button>`;
  }).join('');
  const sheet = plant
    ? specimenSheet(plant, specimens.indexOf(plant) + 1, specimens.length, String(store.book.indexOf(plant) + 1).padStart(3, '0'))
    : `<div class="empty-leaf">${flowerHead(selected)}<h2>${entry.name}</h2><i lang="la">${entry.latin}</i>
       <p>Здесь появится первый засушенный экземпляр этого вида.</p><a class="btn" href="#board">К моей доске</a></div>`;

  const pageIndex = store.book.indexOf(plant);
  const destinations = {board:'К моей доске', basket:'К корзинке', boards:'К моим доскам', templates:'К шаблонам', history:'К истории'};
  const back = Object.hasOwn(destinations, origin) ? origin : 'board';
  return `<a class="quiet book-back" href="#${back}">← ${destinations[back]}</a>
    <div class="page-head"><div><h1>Книга-гербарий</h1>
    <p class="desc">Засушено экземпляров: ${store.book.length}</p></div>
    <button class="btn" data-do="basket">Открыть корзинку</button></div>
    <div class="book-spread ${showIndex ? 'mobile-index' : 'mobile-sheet'}">
      <nav class="book-turns" aria-label="Листы гербария">
        <button data-do="leaf:-1" aria-label="Перелистнуть назад" ${pageIndex <= 0 ? 'disabled' : ''}>← <span>Назад</span></button>
        <span aria-live="polite">${plant ? `Лист ${pageIndex+1} из ${store.book.length}` : 'Оглавление'}</span>
        <button data-do="leaf:1" aria-label="Перелистнуть вперёд" ${pageIndex+1 >= store.book.length ? 'disabled' : ''}><span>Вперёд</span> →</button>
        <button class="index-first" data-do="first-leaf" ${store.book.length ? '' : 'disabled'}>Первый лист →</button>
      </nav>
      <section class="index-page"><h2>Оглавление</h2>
        <div class="book-index">${index}</div>
        <section class="passport"><h2>${entry.name}</h2><i lang="la">${entry.latin}</i>
          <p>${entry.description}</p><small>Засушено экземпляров: ${specimens.length}</small></section>
      </section>
      <section class="specimen-page"><button class="quiet mobile-contents" data-do="contents">К оглавлению</button>
        ${sheet}
      </section>
    </div>`;
}

export function cycleSummary(board) {
    const completed = board.cells.filter(cell => cell.done);
    const flowers = board.harvest.map(plant =>
      `<li>${species[plant.speciesId].name} · ${esc(plant.sourceLine)}</li>`).join('');
    const rewards = completed.filter(cell => cell.reward.trim()).map(cell =>
      `<li>${esc(cell.task)} — ${esc(cell.reward)}</li>`).join('');
    return `<p>${esc(board.durationLabel)} · ${formatPeriod(boardPeriod(board))}</p>
      <p>Выполнено задач: ${completed.length} из ${board.cells.length} · Линий на поле: ${lineIds(board).length} · Собрано цветов: ${board.harvest.length}</p>
        <p>Начало игры · <time datetime="${esc(board.startedAt)}">${new Date(board.startedAt).toLocaleString('ru-RU')}</time><br>
           Завершение · <time datetime="${esc(board.finishedAt)}">${new Date(board.finishedAt).toLocaleString('ru-RU')}</time></p>
        <p>Награда за линию · ${esc(board.bonus)}</p>
        <h3>Личные награды</h3>${rewards ? '<ul>' + rewards + '</ul>' : '<p>Личных наград в этом цикле нет.</p>'}
        <h3>Собранные цветы</h3>${flowers ? '<ul>' + flowers + '</ul>' : '<p>В этом цикле цветов не собрано.</p>'}
      `;
}

const boardFilters = {
  started: {label: 'Текущие', route: 'boards/started', empty: 'Начатых досок пока нет'},
  drafts: {label: 'Подготовка', route: 'boards/drafts', empty: 'Черновиков пока нет'},
  history: {label: 'Завершённые', route: 'history', empty: 'Завершённых циклов пока нет'}
};

function boardEntry(board, filter, active) {
  const archived = filter === 'history';
  const action = (key, label) => `<button class="btn" type="button" data-do="${key}:${esc(board.id)}">${label}</button>`;
  const theme = themes[board.theme];
  const menu = archived
    ? action('repeat', 'Повторить доску') + action('archive-png', 'Скачать PNG')
    : board.started
      ? action('board-png', 'Скачать PNG') + action('finish', 'Завершить цикл')
      : action('rename-board', 'Переименовать') + action('duplicate-board', 'Дублировать');
  const status = archived ? 'Цикл завершён' : board.started ? 'Начата' : 'Подготовка';
  return `<article class="panel board-entry" data-board-id="${esc(board.id)}" ${archived ? 'data-archive-id="' + esc(board.id) + '"' : ''}>
    <div class="spread"><h2>${esc(board.title)}</h2>${board.id === active ? '<small class="board-entry-current">Открыта сейчас</small>' : ''}</div>
    <p>${esc(board.durationLabel)} · ${formatPeriod(boardPeriod(board))}</p>
    <p>${status} · ${board.cells.filter(cell => cell.done).length} из ${board.cells.length} задач · ${board.size} × ${board.size}</p>
    <p><span class="board-entry-theme" aria-hidden="true" style="background:linear-gradient(90deg,${theme.hero} 50%,${theme.accent} 50%)"></span> ${esc(theme.name)}</p>
    <div class="board-entry-actions">
      ${archived ? action('cycle-summary', 'Открыть итог') : action('open', 'Открыть')}
      <details class="board-entry-menu"><summary class="btn" aria-label="Действия с доской «${esc(board.title)}»">Действия</summary>
        <div>${menu}${action('delete-board', archived ? 'Удалить запись' : 'Удалить доску')}</div>
      </details>
    </div></article>`;
}

export function boardCollection(store, filter) {
  const lists = {
    started: store.boards.filter(board => board.started),
    drafts: store.boards.filter(board => !board.started),
    history: store.history
  };
  const tabs = Object.entries(boardFilters).map(([id, tab]) =>
    `<a class="btn" href="#${tab.route}" ${id === filter ? 'aria-current="page"' : ''}>${tab.label} (${lists[id].length})</a>`).join('');
  const cards = lists[filter].map(board => boardEntry(board, filter, store.active)).join('');
  return `<div class="page-head"><div><a class="quiet" href="#board">← К моей доске</a><h1>Мои доски</h1></div>
    <div class="actions"><button type="button" class="btn" data-do="calendar">${icon('calendar', 16)} Календарь</button>
      <button type="button" class="btn primary" data-do="choose-board">Новая доска</button></div></div>
    <nav class="period-filters board-filters" aria-label="Состояние досок">${tabs}</nav>
    ${cards ? '<div class="board-library">' + cards + '</div>' : '<p class="panel empty-state">' + boardFilters[filter].empty + '</p>'}`;
}

export function archive(store) {
  return boardCollection(store, 'history');
}
