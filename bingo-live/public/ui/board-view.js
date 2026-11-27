import { artNames, esc, lineIds, periods, covers, templates } from '../game/board.js';
import { boardPeriod, calendarRange, formatPeriod, periodStatus } from '../game/calendar.js';
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
  const face = completed ? (cell.reward.trim() || 'Выполнено') : task;
  const label = `${position} · ${task}` + (completed ? ' · Выполнено.' + (cell.reward.trim() ? ' Награда: ' + cell.reward : '') : '');
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

export function boardOptions(board, largeField) {
  const sizes = board.size === 4 ? [3, 4, 5] : [3, 5];
  return `<div class="board-options-form">
    <label class="field"><span>Размер поля</span><select id="grid-size">${selectOptions(sizes, board.size)}</select></label>
    <label class="field"><span>Длительность цикла</span><select id="duration">${selectOptions(periods, board.durationLabel)}</select></label>
    <label class="check-label"><input type="checkbox" id="large-field" ${largeField ? 'checked' : ''}>Крупное поле</label>
    <p class="hint">Скрывает обложку и сворачивает бонус на всех досках этого устройства.</p>
    <div class="actions">${button('Сменить обложку', 'covers', 'palette')}${button('Календарь досок', 'calendar', 'calendar')}</div>
    <div class="actions">${button('Готово', 'close', '', 'primary')}</div></div>`;
}

export function boardPage(store, board, hint, firstRun = false, largeField = false, mobile = false) {
  if (!board) return `<section class="panel empty-state empty-board">${img('icon-letter')}
    <h1>Соберите свою первую доску</h1><p>Выберите готовые задачи или впишите свои в пустое поле.</p>
    <div class="actions"><a class="btn primary" href="#templates">Выбрать шаблон</a>${button('Создать пустую', 'new:blank')}</div>
    <a class="quiet" href="#boards">Мои доски</a> · <a class="quiet" href="#history">Завершённые</a>
    <div class="actions">${button('Открыть корзинку','basket')}<a class="btn" href="#book">Открыть гербарий</a></div></section>`;
  const period = boardPeriod(board);
  const lines = lineIds(board);
  const inLine = new Set(lines.flat());
  const setup = !board.started;
  const total = board.cells.length;
  const completed = board.cells.filter(cell => cell.done).length;
  const ready = board.cells.filter(cell => cell.task.trim() && cell.reward.trim()).length;
  const tiles = board.cells.map((cell, index) =>
    boardTile(cell, index, board, store.settings.coordinates, inLine.has(index))
  ).join('');

  return `
    <div class="board-workspace ${setup ? 'board-setup' : 'board-started'}${largeField ? ' large-field' : ''}">
    <section class="hero journal-cover" style="--cover-image:url('/assets/covers/${(covers[board.cover] || covers.glasshouse).file}')">
      <div class="hero-copy">
        <div class="board-heading">
          <h1>${esc(board.title)}</h1>
          <div class="board-heading-actions"><a class="quiet board-collection-link" href="#boards">${icon('boards', 15)} Мои доски</a>
            ${button('Параметры', 'board-options', 'tune', 'board-options')}</div>
        </div>
        ${firstRun ? `<div class="first-run">
          <p>Выполняй задачи и открывай личные награды. Каждая новая линия приносит цветок для гербария.</p>
          <p class="hint">Первая задача начнёт цикл. После старта задачи и награды закрепятся.</p>
          <div class="actions">${button('Открыть первую задачу', 'first-task', 'play', 'primary')}
            ${button('Настроить доску', 'first-setup')}</div>
          <button type="button" class="quiet" data-do="first-help">Как устроен гербарий</button>
        </div>` : setup ? `<p>${esc(board.subtitle)}</p>` : ''}
        <p class="board-period"><span class="board-state">${setup ? 'Подготовка' : 'В процессе'}</span> · ${esc(board.durationLabel)} · <span title="${formatPeriod(period)}">${calendarRange(period)}</span>
          <small id="period-status">${periodStatus(period)}</small></p>
        <div class="board-progress"><progress value="${completed}" max="${total}" aria-label="Выполнено задач"></progress>
          <span>${completed} из ${total}</span></div>
      </div>
    </section>
    <div class="layout">
      <section class="journal-page">
        <div class="board-tools">
          <div>
            <h2>Моё поле бинго</h2>
            <a class="quiet board-template" href="#templates">${board.template==='blank'?'Выбрать шаблон':'Шаблон · '+esc(templates[board.template].title)} ›</a>
            <p class="field-note">${setup ? 'Выберите клетку, чтобы изменить задачу или награду.' : 'Выберите выполненную задачу и сотрите карточку.'}</p>
          </div>
          ${setup ? (firstRun ? '' : button('Начать бинго', 'start', 'play', 'primary')) : button('Выбрать несколько', 'group-start', 'grid')}
        </div>
        <div class="setup-tools">
          ${setup
            ? `<span>Готово клеток: ${ready} из ${total}</span><button class="quiet" data-do="shuffle">${icon('shuffle', 14)} Перемешать</button>`
            : `<span>Линий: ${lines.length}</span>
               <button class="quiet" data-do="board-rewards">${icon('gift', 14)} Личные награды</button>`}
        </div>
        <div class="task-grid" style="--n:${board.size}" data-size="${board.size}">${tiles}</div>
        ${setup ? '' : `<div class="group-tools" hidden>
          <p role="status" class="group-count"></p><p role="alert" class="group-error"></p>
          <div class="actions">${button('Отменить выбор', 'group-cancel')}${button('Отметить выбранные', 'group-confirm', 'check', 'primary')}</div>
        </div>`}
      </section>
      ${sidebar(store, board, hint, largeField, mobile)}
    </div></div>`;
}
