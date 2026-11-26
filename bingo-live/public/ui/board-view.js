import { artNames, esc, lineIds, periods, covers, templates } from '../game/board.js';
import { boardPeriod, formatPeriod, periodStatus } from '../game/calendar.js';
import { coord } from '../game/progress.js';
import { icon } from './icons.js';
import { sidebar } from './herbarium-view.js';

export function img(name, className = '', alt = '') {
  return `<img class="${className}" src="/assets/icons/${name}.png" alt="${esc(alt)}" draggable="false">`;
}

export function art(value, className = 'art') {
  return artNames.includes(value)
    ? img('icon-' + value, className)
    : `<span class="emoji" aria-hidden="true">${esc(value)}</span>`;
}

export function button(text, action, iconName = '', className = '') {
  return `<button type="button" class="btn ${className}" data-do="${action}">
    ${iconName ? icon(iconName, 16) : ''}${text}</button>`;
}

export function boardTile(cell, index, board, coordinates, inLine) {
  const position = coord(index, board.size);
  const completed = Boolean(cell.done);
  const task = cell.task || 'Добавить задачу';
  const face = completed ? cell.reward : task;
  const label = completed ? `${position} · ${task} · Выполнено. Награда: ${face}` : `${position} · ${task}`;
  const classes = ['tile', completed && 'checked-task', inLine && 'in-line', !cell.task && 'empty'];
  const mark = completed ? 'check' : board.started ? 'spark' : 'edit';
  const picture = completed ? art('heart') : cell.task ? art(cell.icon) : icon('plus', 26);

  return `<button type="button" class="${classes.filter(Boolean).join(' ')}"
      data-cell="${index}" data-color="${cell.color}" aria-label="${esc(label)}" title="${esc(face)}"
      ${inLine ? 'aria-description="Входит в собранную линию бинго"' : ''}>
    <span class="skin"><span class="side front" aria-hidden="true">
      <span class="cell-coord">${coordinates ? position : ''}</span>
      <span class="circle-mark">${icon(mark, 11)}</span>
      ${picture}
      <span class="task-text">${esc(face)}</span>
    </span></span>
  </button>`;
}

function selectOptions(values, current) {
  return values.map(value => {
    const label = typeof value === 'number' ? `${value} × ${value}` : value;
    return `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

export function boardPage(store, board, hint) {
  const period = boardPeriod(board);
  const lines = lineIds(board);
  const inLine = new Set(lines.flat());
  const setup = !board.started;
  const total = board.cells.length;
  const completed = board.cells.filter(cell => cell.done).length;
  const ready = board.cells.filter(cell => cell.task.trim() && cell.reward.trim()).length;
  const sizes = board.size === 4 ? [3, 4, 5] : [3, 5];
  const tiles = board.cells.map((cell, index) =>
    boardTile(cell, index, board, store.settings.coordinates, inLine.has(index))
  ).join('');

  return `
    <section class="hero journal-cover" style="--cover-image:url('/assets/covers/${(covers[board.cover] || covers.glasshouse).file}')">
      <div class="hero-copy">
        <h1>${esc(board.title)}</h1>
        <p>${esc(board.subtitle)}</p>
        <div class="badges">
          <label class="badge">${icon('calendar', 13)}
            <select id="duration" aria-label="Длительность цикла">
              ${selectOptions(periods, board.durationLabel)}
            </select>
          </label>
          <label class="badge">${icon('grid', 12)}
            <select id="grid-size" aria-label="Размер поля">
              ${selectOptions(sizes, board.size)}
            </select>
          </label>
          <button type="button" class="badge calendar-button" data-do="calendar">Календарь досок ↗</button>
        </div>
        <p class="board-period">${formatPeriod(period)}<br><small id="period-status">${periodStatus(period)}</small></p>
      </div>
      <button class="cover-picker" data-do="covers">${icon('palette', 15)} Сменить фон</button>
    </section>
    <div class="layout">
      <section class="journal-page">
        <div class="board-tools">
          <div>
            <h2>Моё поле бинго</h2>
            <a class="quiet board-template" href="#templates">${board.template==='blank'?'Выбрать шаблон':'Шаблон · '+esc(templates[board.template].title)} ›</a>
            <p class="field-note">${setup ? 'Выберите клетку, чтобы изменить задачу или награду.' : 'Выберите выполненную задачу и сотрите карточку.'}</p>
          </div>
          ${setup ? button('Начать бинго', 'start', 'play', 'primary') : button('Завершить цикл', 'finish', 'check', 'plain')}
        </div>
        <div class="setup-tools">
          ${setup
            ? `<span>Готово клеток: ${ready} из ${total}</span><button class="quiet" data-do="shuffle">${icon('shuffle', 14)} Перемешать</button>`
            : `<span>Выполнено задач: ${completed} из ${total}</span><strong>Линий: ${lines.length}</strong>`}
        </div>
        <div class="task-grid" style="--n:${board.size}" data-size="${board.size}">${tiles}</div>
      </section>
      ${sidebar(store, board, hint)}
    </div>`;
}
