import { esc, lineIds } from '../game/board.js';
import { capacity, species } from '../game/progress.js';
import { icon } from './icons.js';
import { seedCode, drawSpecimen } from '../plants/specimen.js';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const date = value => dateFormat.format(new Date(value));

function flowerHead(speciesId) {
  return `<img class="species-head" alt="" src="/assets/plants/${speciesId}/${speciesId}-heads-1.png">`;
}

function specimenCanvas(plant, large = false) {
  const state = plant.state === 'fresh' ? 'Свежий цветок' : 'Засушенный цветок';
  const label = [state, species[plant.speciesId].name, seedCode(plant.seed)].join(' · ');
  return `<canvas width="${large ? 650 : 150}" height="${large ? 806 : 186}"
    data-plant="${esc(plant.uid)}" role="img" aria-label="${esc(label)}"></canvas>`;
}

export function paintVisible(container, store) {
  const plants = new Map([...store.book, ...store.basket].map(plant => [plant.uid, plant]));
  for (const canvas of container.querySelectorAll('canvas[data-plant]')) {
    drawSpecimen(canvas, plants.get(canvas.dataset.plant)).catch(() => {
      if (canvas.isConnected) canvas.replaceWith('Не удалось загрузить рисунок');
    });
  }
}

function sourceAttributes(plant) {
  return plant ? `data-source="${esc(plant.sourceBoardId)}" data-line="${esc(plant.sourceLine)}"` : '';
}

function basketItem(plant) {
  return `<article class="basket-item" ${sourceAttributes(plant)}>
    ${specimenCanvas(plant)}
    <div><h3>${species[plant.speciesId].name}</h3><code>${seedCode(plant.seed)}</code></div>
    <div class="basket-actions">
      <button class="btn" data-do="press:${esc(plant.uid)}">Засушить в гербарий</button>
      <button class="quiet" data-do="discard:${esc(plant.uid)}">Удалить из корзинки</button>
    </div>
  </article>`;
}

function speciesSlot(id, name, plant) {
  return `<button class="species-slot ${plant ? '' : 'locked'}" data-do="species:${id}"
    ${sourceAttributes(plant)} aria-label="${name}${plant ? '' : ' · вид ещё не открыт'}">
    ${plant ? specimenCanvas(plant) : flowerHead(id)}<span>${name}</span>
  </button>`;
}

export function sidebar(store, board, hint) {
  const slots = Object.entries(species).map(([id, entry]) =>
    speciesSlot(id, entry.name, store.book.findLast(plant => plant.speciesId === id))
  ).join('');
  const collected = new Set(store.book.map(plant => plant.speciesId)).size;
  return `<aside class="sidebar">
    <section class="panel basket-panel">
      <div class="spread"><h2>Корзинка</h2><span class="count">${store.basket.length} / ${capacity}</span></div>
      ${store.basket.length ? store.basket.map(basketItem).join('') :
        `<p class="basket-empty">${icon('flower', 23)}<span>Соберите линию бинго, и здесь появится цветок.</span></p>`}
      ${store.basket.length === capacity ? '<p class="hint">Корзинка полна. Освободите место для следующего цветка.</p>' : ''}
    </section>
    <section class="panel herb-summary">
      <div class="spread"><h2>Гербарий</h2><span class="count">${collected} / ${Object.keys(species).length} видов</span></div>
      <div class="species-slots">${slots}</div>
      <a class="btn wide" href="#book">Открыть гербарий</a>
    </section>
    <section class="panel bonus-panel">
      <div class="spread"><h2>Награда за линию</h2>
        ${board.started ? '' : `<button class="quiet" data-do="bonus" aria-label="Изменить награду">${icon('edit', 15)}</button>`}
      </div>
      <p class="bonus-value">${esc(board.bonus)}</p>
      <p class="hint">За горизонталь, вертикаль или диагональ.</p>
      <label class="check-label"><input type="checkbox" id="line-hint" ${hint ? 'checked' : ''}>
        Подсветить линию для нового цветка</label>
    </section>
  </aside>`;
}

function specimenSheet(plant, position, total, sheetNumber) {
  const entry = species[plant.speciesId];
  return `
    <div class="sheet-heading"><div class="latin-name"><small>Ботаническое название</small><span lang="la">${entry.latin}</span></div><small>Лист № ${sheetNumber}</small></div>
    <div class="specimen-picture">${specimenCanvas(plant, true)}
      <span class="stamp">${date(plant.pressedAt)}<br>${seedCode(plant.seed)}</span>
    </div>
    <div class="sheet-caption"><h2>${entry.name}</h2>
      <div class="pager">
        <button data-do="turn:-1" aria-label="Предыдущий экземпляр" ${position === 1 ? 'disabled' : ''}>‹</button>
        <span>${position} / ${total}</span>
        <button data-do="turn:1" aria-label="Следующий экземпляр" ${position === total ? 'disabled' : ''}>›</button>
      </div>
    </div>
    <dl class="specimen-data">
      <dt>Код рисунка</dt><dd><code>${esc(plant.seed)}</code>
        <button class="quiet" data-do="copy" aria-label="Скопировать код рисунка">${icon('copy', 14)}</button></dd>
      <dt>Дата сбора</dt><dd>${date(plant.collectedAt)}</dd>
      <dt>Дата сушки</dt><dd>${date(plant.pressedAt)}</dd>
      <dt>Источник</dt><dd>${esc(plant.sourceBoardTitle)} · ${esc(plant.sourceLine)}</dd>
    </dl>
    <label class="note-label">Личная заметка
      <textarea id="plant-note" data-id="${esc(plant.uid)}" maxlength="1200"
        placeholder="Что запомнилось в этот день?">${esc(plant.note)}</textarea>
    </label>
    <button class="btn" data-do="postcard">${icon('download', 16)} Сохранить открытку</button>`;
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
  const destinations = {board:'К моей доске', boards:'К моим доскам', templates:'К шаблонам', history:'К истории'};
  const back = Object.hasOwn(destinations, origin) ? origin : 'board';
  return `<a class="quiet book-back" href="#${back}">← ${destinations[back]}</a>
    <div class="page-head"><div><h1>Книга-гербарий</h1>
    <p class="desc">Засушено экземпляров: ${store.book.length}</p></div></div>
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

export function archive(store) {
  const cycles = store.history.map(board => `
    <article class="panel cycle-entry">
      <div class="spread"><h2>${esc(board.title)}</h2><small>${board.size} × ${board.size}</small></div>
      <p>${date(board.startedAt)} — ${date(board.finishedAt)}</p>
      <p>Выполнено задач: ${board.cells.filter(cell => cell.done).length} из ${board.cells.length} · Линий: ${lineIds(board).length}</p>
      <p>Награда за линию · ${esc(board.bonus)}</p>
      <ul>${board.harvest.map(plant => `<li>${species[plant.speciesId].name} · <code>${esc(plant.seed)}</code></li>`).join('')}</ul>
      <button class="btn" data-do="repeat:${esc(board.id)}">Повторить доску</button>
    </article>`).join('');
  return `<div class="page-head"><h1>История циклов</h1></div>
    ${cycles || '<section class="panel empty-state"><h2>Завершённых циклов пока нет</h2><p class="desc">Здесь сохранятся ваши доски, награды и собранные цветы.</p></section>'}`;
}
