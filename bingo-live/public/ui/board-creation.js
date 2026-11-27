import {animations, covers, createBoard, esc, iconNames, periods, resizeBoard, shuffleBoard, templates, themes} from '../game/board.js';
import {endOfPeriod, formatPeriod, localInput} from '../game/calendar.js';
import {coord} from '../game/progress.js';
import {art, button} from './board-view.js';
import {blossom, icon} from './icons.js';

const catalogPeriods = ['На неделю', 'На месяц', 'На год'];
const colors = ['Шалфейный', 'Персиковый', 'Голубой', 'Терракотовый', 'Сиреневый', 'Песочный', 'Мятный', 'Розовый', 'Серый'];
const list = values => Object.fromEntries(values.map(value => [value, value]));
const options = (values, selected) => Object.entries(values).map(([key, value]) =>
  `<option value="${esc(key)}" ${key === String(selected) ? 'selected' : ''}>${esc(value.name || value)}</option>`).join('');
const field = (label, control) => `<label class="field"><span>${label}</span>${control}</label>`;

export function templateCatalog(period, returnRoute) {
  const filters = catalogPeriods.map(label => `<button type="button" class="btn" aria-pressed="${period === label}"
    data-do="period:${label}">${label}</button>`).join('');
  const cards = Object.entries(templates).filter(([, t]) => t.period === period).map(([key, t]) => {
    const examples = t.tasks.split('\n').slice(0, 3).map(task => `<li>${esc(task)}</li>`).join('');
    return `<article class="lib-card period-card seed-packet">
      <div class="template-heading"><span class="lib-art">${art(t.icon)}</span><div><h2>${esc(t.title)}</h2>
        <small>${t.period} · ${t.recommendedSize} × ${t.recommendedSize}</small></div></div>
      <p>${esc(t.subtitle)}</p><ul>${examples}</ul><p class="template-reward">${icon('gift', 15)} ${esc(t.bonus)}</p>
      ${button('Использовать шаблон', 'new:' + key)}</article>`;
  }).join('');
  return `<div class="page-head"><div><h1>Новая доска</h1><p class="desc">Выберите пустое поле или готовый шаблон.</p></div>
    <a class="btn" href="#${esc(returnRoute)}">Отмена</a></div>
    <div class="period-filters" role="group" aria-label="Длительность шаблона">${filters}</div>
    <div class="library"><article class="lib-card period-card seed-packet">
      <div class="template-heading"><span class="lib-art">${blossom}</span><div><h2>Пустое поле</h2><small>${period} · 3 × 3</small></div></div>
      <p>Придумайте свои задачи и награды. Размер и период можно изменить.</p>
      ${button('Выбрать пустое поле', 'new:blank', 'plus')}</article>${cards}</div>`;
}

export function creationDraft(key, period, current) {
  const t = templates[key];
  const draft = createBoard(key, t?.recommendedSize || 3, t?.title || 'Моя доска');
  draft.durationLabel = t?.period || period;
  draft.calendarStart = localInput(new Date(draft.calendarStart));
  draft.theme = current?.theme || draft.theme;
  draft.animation = current?.animation || draft.animation;
  return draft;
}

function rowSummary(cell, address) {
  return `<b>${address}</b> · <span data-row-task>${esc(cell.task.trim() || 'Пустая задача')}</span>
    <small data-row-reward>${esc(cell.reward.trim() || 'Без личной награды')}</small>`;
}

function rows(draft) {
  return draft.cells.map((cell, index) => {
    const address = coord(index, draft.size);
    return `<details class="creation-row" data-index="${index}" data-empty="${!cell.task.trim()}">
      <summary draggable="true">${rowSummary(cell, address)}</summary>
      ${field('Задача ' + address, `<textarea data-cell-field="task" maxlength="160" placeholder="Добавить задачу">${esc(cell.task)}</textarea>`)}
      ${field('Личная награда ' + address, `<textarea data-cell-field="reward" maxlength="160">${esc(cell.reward)}</textarea>`)}
      ${field('Значок', `<select data-cell-field="icon">${options(iconNames, cell.icon)}</select>`)}
      ${field('Цвет клетки', `<select data-cell-field="color">${options(colors, cell.color)}</select>`)}
      <div class="actions"><button type="button" class="btn" data-move="-1" ${index === 0 ? 'disabled' : ''}>← Раньше</button>
        <button type="button" class="btn" data-move="1" ${index === draft.cells.length - 1 ? 'disabled' : ''}>Позже →</button></div>
    </details>`;
  }).join('');
}

export function creationForm(draft) {
  const t = templates[draft.template];
  return `<form id="new-board" class="creation-form" data-preview="false">
    <div class="actions"><button type="button" class="quiet" data-choice>← К выбору основы</button>
      <button type="button" class="btn creation-preview-toggle" data-preview-on>Посмотреть поле</button></div>
    <div class="creation-body"><div class="creation-fields">
      <p class="hint">${t ? 'Шаблон «' + esc(t.title) + '» · ' + t.period + ' · ' + t.recommendedSize + ' × ' + t.recommendedSize : 'Пустое поле'}</p>
      ${field('Название доски', `<input name="title" maxlength="60" required value="${esc(draft.title)}">`)}
      ${field('Начало периода', `<input type="datetime-local" name="begin" required value="${esc(draft.calendarStart)}">`)}
      ${field('Длительность', `<select name="duration">${options(list(periods), draft.durationLabel)}</select>`)}
      <p class="hint schedule-preview" id="date-preview"></p>
      ${field('Размер сетки', `<select name="size">${options({3:'3 × 3', 5:'5 × 5'}, draft.size)}</select>`)}
      <div class="panel" data-shrink hidden><p>Клетки за пределами 3 × 3 будут скрыты. Верните 5 × 5, чтобы увидеть их снова.</p>
        <button type="button" class="btn" data-resize="3">Уменьшить до 3 × 3</button>
        <button type="button" class="btn" data-resize="5">Оставить 5 × 5</button></div>
      ${field('Награда за линию', `<input name="bonus" required maxlength="120" value="${esc(draft.bonus)}">`)}
      <details class="creation-style"><summary>Оформление доски</summary>
        ${field('Цветовая тема', `<select name="theme">${options(themes, draft.theme)}</select>`)}
        ${field('Эффект после стирания', `<select name="animation">${options(animations, draft.animation)}</select>`)}
        ${field('Обложка', `<select name="cover">${options(covers, draft.cover)}</select>`)}
      </details>
      <details class="template-tasks"><summary>Задачи и личные награды · <span data-count></span></summary>
        <button class="btn" type="button" data-shuffle>${icon('shuffle', 16)} Перемешать</button>
        <div data-rows></div></details>
    </div><aside class="creation-preview" aria-label="Предпросмотр доски">
      <button type="button" class="btn creation-edit-toggle" data-preview-off>← К настройке</button>
      <div data-cover><h3 data-title></h3></div><p data-preview-period></p>
      <div class="creation-mini" aria-label="Клетки поля"></div><p data-preview-bonus></p>
    </aside></div>
    <div class="actions">${button('Отмена', 'close')}<button type="submit" class="btn primary">Создать доску</button></div>
  </form>`;
}

export function bindCreationForm(form, draft, choose, save) {
  const q = selector => form.querySelector(selector);
  let dragged = null, submitting = false;
  function preview() {
    const theme = themes[draft.theme], cover = covers[draft.cover];
    const start = new Date(draft.calendarStart);
    const dates = Number.isFinite(+start) ? formatPeriod({start, end:endOfPeriod(start, draft.durationLabel)}) : '';
    q('#date-preview').textContent = dates;
    q('[data-title]').textContent = draft.title;
    q('[data-cover]').style.setProperty('--cover-image', `url('/assets/covers/${cover.file}')`);
    q('[data-preview-period]').textContent = draft.durationLabel + ' · ' + draft.size + ' × ' + draft.size;
    q('[data-preview-bonus]').textContent = 'Награда за линию · ' + draft.bonus;
    const mini = q('.creation-mini');
    mini.style.setProperty('--n', draft.size);
    mini.innerHTML = draft.cells.map((cell, i) => {
      const address = coord(i, draft.size), task = cell.task.trim() || 'Пустая задача';
      return `<button type="button" data-edit="${i}" style="background:${theme['tile' + cell.color]};color:${theme.ink}"
        title="${esc(task)}" aria-label="${esc(address + ' · ' + task)}"><small>${address}</small>${art(cell.icon)}<span>${esc(task)}</span></button>`;
    }).join('');
  }
  function refreshRows() {
    q('[data-count]').textContent = draft.cells.length;
    q('[data-rows]').innerHTML = rows(draft);
    preview();
  }
  function edit(index) {
    form.dataset.preview = 'false';
    q('.template-tasks').open = true;
    const row = q(`[data-index="${index}"]`);
    row.open = true;
    row.querySelector('textarea').focus();
  }
  function move(from, to) {
    if (from === to || to < 0 || to >= draft.cells.length) return;
    draft.cells.splice(to, 0, draft.cells.splice(from, 1)[0]);
    refreshRows();
    edit(to);
  }
  function resize(size) {
    resizeBoard(draft, size);
    form.elements.size.value = draft.size;
    q('[data-shrink]').hidden = true;
    refreshRows();
    form.elements.size.focus();
  }
  form.oninput = ({target}) => {
    const key = target.dataset.cellField;
    if (key) {
      const row = target.closest('[data-index]'), cell = draft.cells[Number(row.dataset.index)];
      cell[key] = key === 'color' ? Number(target.value) : target.value;
      row.dataset.empty = String(!cell.task.trim());
      row.querySelector('summary').innerHTML = rowSummary(cell, coord(Number(row.dataset.index), draft.size));
    } else {
      const prop = {title:'title', bonus:'bonus', begin:'calendarStart', duration:'durationLabel', theme:'theme', cover:'cover', animation:'animation'}[target.name];
      if (!prop) return;
      draft[prop] = target.value;
      target.setCustomValidity('');
    }
    preview();
  };
  form.elements.size.onchange = event => {
    const size = Number(event.target.value);
    if (size >= draft.size) return resize(size);
    form.elements.size.value = draft.size;
    q('[data-shrink]').hidden = false;
    q('[data-resize]').focus();
  };
  form.onclick = event => {
    const btn = event.target.closest('button');
    if (!btn || submitting) return;
    if (btn.hasAttribute('data-choice')) choose();
    if (btn.hasAttribute('data-preview-on')) {
      form.dataset.preview = 'true';
      q('[data-preview-off]').focus();
    }
    if (btn.hasAttribute('data-preview-off')) {
      form.dataset.preview = 'false';
      q('[data-preview-on]').focus();
    }
    if (btn.hasAttribute('data-edit')) edit(Number(btn.dataset.edit));
    if (btn.hasAttribute('data-resize')) resize(Number(btn.dataset.resize));
    if (btn.hasAttribute('data-shuffle')) { shuffleBoard(draft); refreshRows(); }
    if (btn.hasAttribute('data-move')) {
      const index = Number(btn.closest('[data-index]').dataset.index);
      move(index, index + Number(btn.dataset.move));
    }
  };
  const rowOf = target => target.closest('.creation-row');
  form.ondragstart = event => {
    if (!event.target.matches('summary[draggable]')) return;
    dragged = Number(rowOf(event.target).dataset.index);
    event.dataTransfer.setData('text/plain', coord(dragged, draft.size));
    event.dataTransfer.effectAllowed = 'move';
  };
  form.ondragover = event => { if (dragged !== null && rowOf(event.target)) event.preventDefault(); };
  form.ondrop = event => {
    const row = rowOf(event.target);
    if (dragged === null || !row) return;
    event.preventDefault();
    move(dragged, Number(row.dataset.index));
    dragged = null;
  };
  form.ondragend = () => { dragged = null; };
  form.addEventListener('invalid', () => { form.dataset.preview = 'false'; }, true);
  form.onsubmit = async event => {
    event.preventDefault();
    if (submitting || !form.isConnected) return;
    if (!q('[data-shrink]').hidden) { q('[data-resize]').focus(); return; }
    for (const name of ['title', 'bonus']) {
      if (draft[name].trim()) continue;
      form.elements[name].setCustomValidity(name === 'title' ? 'Введите название доски.' : 'Введите награду за линию.');
      form.reportValidity();
      return;
    }
    submitting = true;
    q('[type=submit]').disabled = true;
    const record = structuredClone(draft);
    record.calendarStart = new Date(draft.calendarStart).toISOString();
    record.title = record.title.trim();
    record.bonus = record.bonus.trim();
    for (const cell of [...record.cells, ...(record.overflow || [])]) {
      cell.task = cell.task.trim();
      cell.reward = cell.reward.trim();
    }
    await save(record);
  };
  refreshRows();
}
