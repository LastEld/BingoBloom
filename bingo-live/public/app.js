import {boardPeriod, calendarMonth, endOfPeriod, formatPeriod, localInput, periodStatus} from './game/calendar.js';
import { startBoard, completeCell, pressPlant, newStudio, decodeStudio, finishBoard, repeatBoard, lineKey, species } from './game/progress.js';
import { boardPage, img, art, button } from './ui/board-view.js';
import { bookPage, archive, paintVisible } from './ui/herbarium-view.js';
import { postcard, seedCode } from './plants/specimen.js';
import { templates, themes, animations, artNames, iconNames, rewards, createBoard, resizeBoard, shuffleBoard, allLines, lineIds, periods, covers, esc, STORE } from './game/board.js';
import { icon, blossom } from './ui/icons.js';
import { sound, petals } from './ui/effects.js';
import { liftCard, scratchFace } from './ui/focus-card.js';
import { makePNG } from './export/board-png.js';
const $ = s => document.querySelector(s),
  root = $('#main'),
  dialog = $('#dialog');
let store,
  warning = '',
  stopScratch = null,
  toastTimer,
  exportUrl = '',
  exportRun = 0,
  returnIndex = null;
let savedRaw = null,
  selectedSpecies = 'daisy',
  selectedPlant = null,
  showIndex = true,
  hint = false,
  calendarView = new Date(),
  templatePeriod = 'На неделю',
  bookOrigin = 'board';
try {
  savedRaw = localStorage.getItem(STORE);
  store = savedRaw ? decodeStudio(savedRaw) : newStudio();
} catch {
  store = newStudio();
  warning = 'Предыдущее сохранение недоступно. Его можно заменить импортом резервной копии в настройках.';
}
selectedSpecies = store.book[0]?.speciesId || 'daisy';
selectedPlant = store.book[0]?.uid ?? null;
const board = () => store.boards.find(b => b.id === store.active);
const page = () => ['templates', 'boards', 'history', 'book'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'board';

function save() {
  if (!warning) {
    try {
      const latest = localStorage.getItem(STORE);
      if (latest !== savedRaw) {
        store = latest ? decodeStudio(latest) : newStudio();
        savedRaw = latest;
        dialog.close();
        render();
        toast('Доска изменилась в другой вкладке. Повторите действие.');
        return false;
      }
      const raw = JSON.stringify(store);
      localStorage.setItem(STORE, raw);
      savedRaw = raw;
    } catch {
      warning = 'Не удалось сохранить изменения. Проверьте свободное место в браузере.';
      toast(warning);
    }
  }
  const status = $('#save-status');
  if (status) status.textContent = warning || 'Сохранено на устройстве';
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}

function setTheme() {
  const b = board(),
    t = themes[b.theme] || themes.matcha;
  document.documentElement.dataset.theme = b.theme;
  document.documentElement.dataset.simpleMotion = store.settings.simpleMotion;
  for (const [k, v] of Object.entries(t)) if (k !== 'name') document.documentElement.style.setProperty('--' + k, v);
  document.querySelector('meta[name="theme-color"]').content = t.paper;
}

function modal(title, content) {
  stopScratch?.();
  stopScratch = null;
  dialog.classList.remove('card-stage');
  if (exportUrl) {
    URL.revokeObjectURL(exportUrl);
    exportUrl = '';
  }
  exportRun++;
  dialog.innerHTML = '<div class="dlg-head"><h2 id="modal-title">' + esc(title) + '</h2><button class="round" data-do="close" aria-label="Закрыть">' + icon('close', 16) + '</button></div>' + content;
  if (!dialog.open) dialog.showModal();
}

function header() {
  const p = page();
  $('#head').innerHTML = '<div class="bar"><a class="wordmark" href="#board" aria-label="Bingo Bloom — моя доска">' + blossom + '<span>Bingo <i>Bloom</i></span></a><nav aria-label="Главное меню">' + [['board', 'Моя доска', 'grid'], ['book', 'Гербарий', 'leaf'], ['templates', 'Шаблоны', 'layers'], ['history', 'История', 'clock']].map(([key, title, ic]) => '<a class="nav-link ' + (p === key ? 'active' : '') + '" href="#' + key + '" ' + (p === key ? 'aria-current="page"' : '') + '>' + icon(ic, 15) + title + '</a>').join('') + '</nav><div class="bar-actions">' + button('Экспорт', 'export', 'download') + '<button class="round" data-do="settings" title="Настройки доски" aria-label="Настройки доски">' + icon('tune', 17) + '</button></div></div>';
  $('#foot').innerHTML = '<a href="#boards" class="quiet">' + icon('boards', 15) + ' Мои доски (' + store.boards.length + ')</a><span class="row">' + icon(warning ? 'bulb' : 'check', 14) + '<span id="save-status">' + esc(warning || 'Сохранено на устройстве') + '</span></span>';
}

function library() {
  const groups = ['На неделю', 'На месяц', 'На год'];
  const filters = groups.map(period => `<button type="button" class="btn" aria-pressed="${period === templatePeriod}"
    data-do="period:${period}">${period}</button>`).join('');
  const cards = Object.entries(templates).filter(([, t]) => t.period === templatePeriod).map(([key, t]) => {
    const examples = t.tasks.split('\n').slice(0, 3).map(task => `<li>${esc(task)}</li>`).join('');
    return `<article class="lib-card period-card"><div class="template-heading">
      <span class="lib-art">${art(t.icon)}</span><div><h2>${esc(t.title)}</h2>
      <small>${t.period} · ${t.recommendedSize} × ${t.recommendedSize}</small></div></div>
      <p>${esc(t.subtitle)}</p><ul>${examples}</ul><p class="template-reward">${icon('gift',15)} ${esc(t.bonus)}</p>
      ${button('Использовать шаблон', 'new:' + key)}</article>`;
  }).join('');
  root.innerHTML = `<div class="page-head"><div><h1>Шаблоны досок</h1><p class="desc">Шаблон заполняет поле задачами, задаёт награду за линию и период в календаре.</p></div>${button('Пустая доска', 'new:blank', 'plus', 'primary')}</div>
    <div class="period-filters" role="group" aria-label="Длительность шаблона">${filters}</div>
    <div class="library">${cards}</div>`;
}

function collection() {
  root.innerHTML = '<div class="page-head"><div><h1>Мои доски</h1><p class="desc">Сохранённые задачи и награды на этом устройстве.</p></div>' + button('Новая доска', 'new:blank', 'plus', 'primary') + '</div><div class="library">' + store.boards.map(b => '<button class="lib-card" data-do="open:' + esc(b.id) + '"><span class="lib-art">' + art(templates[b.template]?.icon || 'pen') + '</span><div><h2>' + esc(b.title) + '</h2><p>' + b.cells.filter(c => c.done).length + ' из ' + b.cells.length + ' задач · ' + b.size + ' × ' + b.size + '</p><span class="small-help">' + themes[b.theme].name + '</span></div>' + icon('chevron', 16) + '</button>').join('') + '</div>';
}

function history() {
  const b = board(),
    cells = b.cells.filter(c => c.done).sort((a, b) => b.done - a.done);
  root.innerHTML = archive(store) + '<div class="page-head"><div><h2>Награды на текущей доске</h2><p class="desc">' + esc(b.title) + '</p></div><a class="btn" href="#board">' + icon('grid', 15) + ' К доске</a></div><section class="panel">' + (cells.length ? cells.map(c => '<div class="history-row">' + art(c.icon) + '<div><h3>' + esc(c.task) + '</h3><p>' + esc(c.reward) + '</p></div><time>' + new Date(c.done).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  }) + '</time><button class="quiet" data-do="detail:' + b.cells.indexOf(c) + '" aria-label="Подробнее о задаче ' + esc(c.task) + '">' + icon('chevron', 16) + '</button></div>').join('') : '<div class="empty-state">' + img('icon-letter') + '<h2>Награды ещё впереди</h2><p class="desc">Выполните первую задачу. Её награда появится здесь.</p><a class="btn space-top" href="#board">Открыть доску</a></div>') + '</section>';
}

function render() {
  setTheme();
  header();
  const p = page();
  if (p === 'board') root.innerHTML = boardPage(store, board(), hint);else if (p === 'templates') library();else if (p === 'boards') collection();else if (p === 'book') root.innerHTML = bookPage(store, selectedSpecies, selectedPlant, showIndex, bookOrigin);else history();
  paintVisible(root, store);
  if (p === 'board') highlight();
  document.title = (p === 'board' ? board().title : {
    book: 'Книга-гербарий',
    templates: 'Шаблоны',
    boards: 'Мои доски',
    history: 'История наград'
  }[p]) + ' · Bingo Bloom';
}

function navigate(p) {
  if (page() === p) render();else location.hash = p;
}
const field = (s, html) => '<label class="field"><span>' + s + '</span>' + html + '</label>';

function editCell(i) {
  if (board().started) return;
  const c = board().cells[i];
  modal('Редактировать клетку', '<form id="cell-form">' + field('Задача · лицевая сторона', '<textarea name="task" required maxlength="160" placeholder="Например, прочитать главу книги">' + esc(c.task) + '</textarea>') + field('Награда · обратная сторона', '<textarea name="reward" required maxlength="160" placeholder="Чем себя порадовать?">' + esc(c.reward) + '</textarea>') + '<button type="button" id="random-reward" class="quiet">' + icon('shuffle', 15) + ' Случайная награда</button><p class="space-top">Значок клетки</p><div class="choice-list">' + artNames.map(k => '<label title="' + iconNames[k] + '"><input type="radio" name="art" value="' + k + '" ' + (k === c.icon ? 'checked' : '') + ' aria-label="' + iconNames[k] + '"><span>' + art(k) + '</span></label>').join('') + '</div>' + field('Или свой эмодзи', '<input name="emoji" maxlength="16" placeholder="Например, 🌷" value="' + esc(artNames.includes(c.icon) ? '' : c.icon) + '">') + '<div class="actions">' + button('Отмена', 'close') + '<button class="btn primary">Сохранить</button></div></form>');
  const form = $('#cell-form');
  $('#random-reward').onclick = () => {
    const pool = rewards.filter(s => s !== form.reward.value);
    form.reward.value = pool[Math.floor(Math.random() * pool.length)];
  };
  form.querySelectorAll('[name=art]').forEach(r => r.onchange = () => form.emoji.value = '');
  form.onsubmit = e => {
    e.preventDefault();
    const task = form.task.value.trim(),
      reward = form.reward.value.trim();
    if (!task || !reward) {
      toast('Заполните задачу и награду');
      return;
    }
    const emoji = form.emoji.value.trim();
    if (emoji && !/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(emoji)) {
      toast('Для своего значка выберите эмодзи');
      return;
    }
    Object.assign(c, {
      task,
      reward,
      icon: emoji || form.art.value || 'leaf'
    });
    save();
    dialog.close();
    render();
    focusCell(i);
  };
}

function newBoard(key) {
  const t = templates[key];
  const period = t?.period || templatePeriod;
  const name = t?.title || 'Моя доска';
  modal(t ? 'Применить шаблон' : 'Новая доска', `<form id="new-board">
    ${field('Название доски', '<input name="title" required maxlength="60" value="'+esc(name)+'">')}
    ${field('Начало периода', '<input type="datetime-local" name="begin" required value="'+localInput(new Date())+'">')}
    ${field('Длительность', '<select name="duration">'+periods.map(v=>'<option '+(v===period?'selected':'')+'>'+v+'</option>').join('')+'</select>')}
    <p class="hint schedule-preview" id="date-preview" aria-live="polite"></p>
    ${field('Размер сетки', '<select name="size">'+[3,5].map(n=>'<option value="'+n+'" '+(n===(t?.recommendedSize || 3)?'selected':'')+'>'+n+' × '+n+'</option>').join('')+'</select>')}
    ${t ? '<details class="template-tasks"><summary></summary><ol></ol></details>' : ''}
    ${field('Награда за линию', '<input name="bonus" maxlength="120" required value="'+esc(t?.bonus || 'Вечер для себя')+'">')}
    <p class="hint">В календаре появится один период этой доски.</p>
    <div class="actions">${button('Отмена','close')}<button class="btn primary">${t?'Применить к моей доске':'Создать доску'}</button></div></form>`);
  const f = $('#new-board');
  const preview = () => {
    const start = new Date(f.elements.begin.value);
    $('#date-preview').textContent = Number.isFinite(+start) ? formatPeriod({start,end:endOfPeriod(start,f.duration.value)}) : '';
    if (t) {
      const tasks=t.tasks.split('\n').slice(0,Number(f.size.value)**2);
      f.querySelector('summary').textContent='Задачи на поле · '+tasks.length;
      f.querySelector('ol').innerHTML=tasks.map(task=>'<li>'+esc(task)+'</li>').join('');
    }
  };
  f.addEventListener('input',preview); preview();
  f.onsubmit = e => {
    e.preventDefault();
    const name = f.title.value.trim(),
      bonus = f.bonus.value.trim();
    if (!name || !bonus) {
      toast('Введите название и награду');
      return;
    }
    const b = createBoard(key, Number(f.size.value), name);
    b.theme = board().theme;
    b.animation = board().animation;
    b.bonus = bonus;
    b.durationLabel = f.duration.value;
    b.calendarStart = new Date(f.elements.begin.value).toISOString();
    store.boards.unshift(b);
    store.active = b.id;
    hint = false;
    save();
    dialog.close();
    navigate('board');
  };
}

function bonus() {
  const b = board();
  modal('Супернаграда', '<form id="bonus-form">' + field('За горизонталь, вертикаль или диагональ', '<textarea name="bonus" maxlength="120" required>' + esc(b.bonus) + '</textarea>') + '<div class="actions"><button class="btn primary">Сохранить</button></div></form>');
  const f = $('#bonus-form');
  f.onsubmit = e => {
    e.preventDefault();
    const value = f.bonus.value.trim();
    if (!value) {
      toast('Введите награду за линию');
      return;
    }
    b.bonus = value;
    save();
    dialog.close();
    render();
  };
}

function focusCell(i) {
  root.querySelector('[data-cell="' + i + '"]')?.focus({
    preventScroll: true
  });
}

function openCard(i, origin = null) {
  const b = board(),
    c = b.cells[i];
  returnIndex = i;
  const coord = String.fromCharCode(65 + i % b.size) + (Math.floor(i / b.size) + 1);
  modal('Карточка ' + coord, `
    <div class="spotlight">
      <div class="stage-head"><span>${esc(b.title)} · ${coord}</span>
        <button class="round" data-do="close" aria-label="Вернуться к полю">${icon('close', 17)}</button></div>
      <div class="keepsake" data-color="${c.color}">
        <div class="keepsake-back" aria-hidden="true" inert>${img('icon-heart', 'reward-art')}<p>${esc(c.reward)}</p><span class="keepsake-sign">Bingo Bloom</span></div>
        <canvas tabindex="0" role="button" aria-label="${esc(c.task + '. Стирайте движением указателя. Пробел стирает одну полосу.')}"></canvas>
      </div>
      <div class="stage-info" aria-live="polite"></div>
      <div class="stage-foot">
        <button class="quiet undo-card" data-do="undo:${i}" ${c.done ? '' : 'hidden'}>${icon('reset', 14)} Отменить отметку</button></div>
    </div>`);
  dialog.classList.add('card-stage');
  const card = dialog.querySelector('.keepsake');
  const info = dialog.querySelector('.stage-info');
  function showReward(newLine) {
    card.classList.add('uncovered', 'finish-' + b.animation);
    card.querySelector('canvas').remove();
    const reward = card.querySelector('.keepsake-back');
    reward.inert = false;
    reward.removeAttribute('aria-hidden');
    dialog.querySelector('.undo-card').hidden = false;
    info.innerHTML = newLine ? '<div class="line-reward">' + icon('spark', 17) + ' <strong>Бинго!</strong> ' + esc(b.bonus) + '</div>' : '<div class="task-receipt">' + icon('check', 16) + ' ' + esc(c.task) + '</div>';
    info.insertAdjacentHTML('beforeend', button('К моему полю', 'close', '', 'primary'));
    info.querySelector('button').focus({
      preventScroll: true
    });
  }
  if (c.done) showReward(false);else {
    info.innerHTML = '<p>Сотрите половину карточки. Дальше она раскроется от ваших штрихов.</p><div class="scratch-meter"><div class="scratch-track" role="progressbar" aria-label="Стёрто" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><i></i></div><span>0%</span></div>';
    const progress = info.querySelector('i');
    const style = getComputedStyle(document.documentElement);
    const canvas = card.querySelector('canvas');
    const source = root.querySelector('[data-cell="' + i + '"] .front img');
    const meter = info.querySelector('.scratch-track');
    stopScratch = scratchFace({
      canvas,
      cell: c,
      picture: source,
      tone: style.getPropertyValue('--tile' + c.color).trim(),
      ink: style.getPropertyValue('--ink').trim(),
      coord: store.settings.coordinates ? coord : '',
      onRub: () => sound('scratch', store.sound),
      onProgress: value => {
        progress.style.width = value + '%';
        meter.setAttribute('aria-valuenow', value);
        meter.nextElementSibling.textContent = value + '%';
      },
      onDone: () => {
        if (!dialog.open || !card.isConnected) return;
        const result = completeCell(store, b, i);
        if (result.needed) {
          modal('Корзинка заполнена', '<p>Для этого сбора нужно освободить мест: ' + result.needed + '. Засушите или удалите цветы и снова отметьте задачу.</p><div class="actions">' + button('К корзинке', 'basket', '', 'primary') + '</div>');
          return;
        }
        if (save() === false) return;
        render();
        const newLine = result.added > 0;
        showReward(newLine);
        sound(newLine ? 'line' : 'flip', store.sound);
        if (newLine) info.querySelector('.line-reward').append(' · В корзинке новых цветов: ' + result.added);
        if (newLine) petals(dialog);
      }
    });
    canvas.focus({
      preventScroll: true
    });
  }
  liftCard(card, origin);
}

async function exportModal() {
  modal('Скачать доску', '<p class="desc">Текущий прогресс и открытые награды в одной картинке.</p><div class="choice-list"><label><input type="radio" name="format" value="square" checked><span>Квадрат · 1:1</span></label><label><input type="radio" name="format" value="story"><span>Сторис · 9:16</span></label></div><div id="preview-box" aria-live="polite"></div><div class="actions"><a id="download" class="btn primary" hidden>' + icon('download', 16) + ' Скачать PNG</a></div>');
  async function update() {
    const run = ++exportRun,
      format = dialog.querySelector('[name=format]:checked').value,
      link = $('#download');
    link.hidden = true;
    $('#preview-box').textContent = 'Готовим изображение…';
    try {
      const blob = await makePNG(board(), format);
      if (run !== exportRun || !dialog.open) return;
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(blob);
      $('#preview-box').innerHTML = '<img class="frame-preview" src="' + exportUrl + '" alt="Предпросмотр PNG-доски">';
      link.href = exportUrl;
      link.download = board().title.replace(/[<>:"/\\|?*]/g, '-') + '-' + (format === 'story' ? '9x16' : '1x1') + '.png';
      link.hidden = false;
    } catch {
      if (run === exportRun) $('#preview-box').textContent = 'Не удалось создать PNG. Попробуйте ещё раз.';
    }
  }
  dialog.querySelectorAll('[name=format]').forEach(el => el.onchange = update);
  await update();
}
document.addEventListener('click', async e => {
  const cell = e.target.closest('[data-cell]');
  if (cell) {
    const i = Number(cell.dataset.cell);
    if (!board().started) editCell(i);else openCard(i, cell.getBoundingClientRect());
    return;
  }
  const action = e.target.closest('[data-do]')?.dataset.do;
  if (!action) return;
  const [k, v] = action.split(':');
  if (k === 'close') dialog.close();
  if (k === 'start') {
    const b = board(),
      missing = b.cells.findIndex(c => !c.task.trim() || !c.reward.trim());
    if (missing >= 0) {
      editCell(missing);
      return;
    }
    startBoard(b, store.settings);
    save();
    render();
    focusCell(0);
    toast('Бинго готово. Выберите карточку.');
  }
  if (k === 'settings') settings();
  if (k === 'bonus' && !board().started) bonus();
  if (k === 'new') newBoard(v);
  if (k === 'collection') {
    dialog.close();
    navigate('boards');
  }
  if (k === 'open') {
    store.active = v;
    save();
    navigate('board');
  }
  if (k === 'shuffle' && !board().started) {
    shuffleBoard(board());
    save();
    render();
    toast('Клетки перемешаны');
  }
  if (k === 'detail') openCard(Number(v));
  if (k === 'undo') {
    board().cells[Number(v)].done = 0;
    save();
    dialog.close();
    render();
    focusCell(Number(v));
    toast('Выполнение отменено');
  }
  if (k === 'export') chooseExport();
  await gardenAction(k, v);
});
root.addEventListener('keydown', e => {
  const el = e.target.closest('[data-cell]');
  if (!el) return;
  const i = Number(el.dataset.cell),
    n = board().size;
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    editCell(i);
    return;
  }
  const d = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -n,
    ArrowDown: n
  }[e.key];
  if (d) {
    e.preventDefault();
    focusCell(Math.max(0, Math.min(n * n - 1, i + d)));
  }
});
dialog.addEventListener('click', e => {
  if (e.target === dialog) {
    const b = dialog.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close();
  }
});
dialog.addEventListener('close', () => {
  stopScratch?.();
  stopScratch = null;
  dialog.classList.remove('card-stage');
  if (returnIndex !== null) {
    focusCell(returnIndex);
    returnIndex = null;
  }
  exportRun++;
  if (exportUrl) {
    URL.revokeObjectURL(exportUrl);
    exportUrl = '';
  }
});
window.addEventListener('hashchange', event => {
  if (page() === 'book') bookOrigin = new URL(event.oldURL).hash.slice(1) || 'board';
  dialog.close();
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('storage', e => {
  if (e.key !== STORE || !e.newValue) return;
  try {
    savedRaw = localStorage.getItem(STORE);
    store = decodeStudio(savedRaw);
    dialog.close();
    render();
  } catch {
    toast('Обновите страницу для загрузки изменений');
  }
});

function settings() {
  const b = board(),
    o = store.settings;
  const options = (set, selected) => Object.entries(set).map(([v, label]) => '<option value="' + esc(v) + '" ' + (v === selected ? 'selected' : '') + '>' + esc(label) + '</option>').join('');
  modal('Настройки', '<form id="settings-form">' + field('Название доски', '<input required name="title" maxlength="60" ' + (b.started ? 'readonly' : '') + ' value="' + esc(b.title) + '">') + field('Цветовая тема', '<select name="theme">' + options(Object.fromEntries(Object.entries(themes).map(([k, t]) => [k, t.name])), b.theme) + '</select>') + field('Эффект после стирания', '<select name="animation">' + options(animations, b.animation) + '</select>') + field('Код следующего цикла', '<select name="seedMode">' + options({
    auto: 'Автоматический',
    manual: 'Ручной ввод'
  }, o.seedMode) + '</select>') + '<label class="field" id="manual-field">Свой код<input name="seed" maxlength="120" value="' + esc(o.manualSeed) + '"></label>' + [['coordinates', 'Показывать координаты клеток', o.coordinates], ['simpleMotion', 'Упрощённые анимации', o.simpleMotion], ['sound', 'Мягкие звуки при выполнении', store.sound]].map(([k, label, value]) => '<label class="check-label"><input type="checkbox" name="' + k + '" ' + (value ? 'checked' : '') + '>' + label + '</label>').join('') + '<div class="actions">' + button('Мои доски', 'collection', 'boards') + '<button class="btn primary">Сохранить</button></div></form>' + '<section class="backup-controls"><h3>Данные и резервная копия</h3><p class="hint">' + esc(warning || 'Сохранено на устройстве') + '</p>' + button('Экспортировать сохранение (.json)', 'backup') + '<label class="btn import-file">Импортировать сохранение (.json)<input id="import-file" type="file" accept=".json,application/json"></label>' + button('Сбросить весь прогресс', 'reset', '', 'plain') + '</section>');
  const form = $('#settings-form'),
    f = form.elements;
  function seedField() {
    const manual = f.seedMode.value === 'manual';
    $('#manual-field').hidden = !manual;
    f.seed.required = manual;
  }
  f.seedMode.onchange = seedField;
  seedField();
  form.onsubmit = e => {
    e.preventDefault();
    const title = f.title.value.trim(),
      manualSeed = f.seed.value.trim();
    if (!title || f.seedMode.value === 'manual' && !manualSeed) {
      toast('Заполните название и выбранный seed');
      return;
    }
    if (!b.started) b.title = title;
    b.theme = f.theme.value;
    b.animation = f.animation.value;
    store.sound = f.sound.checked;
    Object.assign(o, {
      manualSeed,
      seedMode: f.seedMode.value,
      coordinates: f.coordinates.checked,
      simpleMotion: f.simpleMotion.checked
    });
    save();
    dialog.close();
    render();
    toast('Настройки сохранены');
  };
  $('#import-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = decodeStudio(await file.text());
      confirmAction('Восстановить резервную копию?', 'Текущие данные будут заменены. В копии досок: ' + imported.boards.length + ', цветов в корзинке: ' + imported.basket.length + ', в книге: ' + imported.book.length + ', завершённых циклов: ' + imported.history.length + '.', 'Восстановить', () => replaceStudio(imported));
    } catch {
      modal('Не удалось импортировать файл', '<p>Проверьте формат и версию сохранения. Текущий прогресс сохранён.</p><div class="actions">' + button('К настройкам', 'settings') + '</div>');
    }
  };
}

function confirmAction(title, message, label, yes) {
  modal(title, '<p class="confirm-text">' + esc(message) + '</p><div class="actions">' + button('Отмена', 'close') + '<button class="btn primary" id="confirm-action">' + esc(label) + '</button></div>');
  $('#confirm-action').onclick = yes;
}

function replaceStudio(next) {
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(STORE, raw);
    store = next;
    savedRaw = raw;
    warning = '';
  } catch {
    toast('Не удалось записать данные в хранилище браузера');
    return;
  }
  hint = false;
  selectedPlant = null;
  selectedSpecies = store.book[0]?.speciesId || 'daisy';
selectedPlant = store.book[0]?.uid ?? null;
  showIndex = true;
  dialog.close();
  navigate('board');
  toast('Данные сохранены на устройстве');
}

function download(blob, name) {
  const link = document.createElement('a'),
    url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function chooseExport() {
  modal('Экспорт', '<div class="export-options">' + button('Сохранить доску в PNG', 'board-png', 'grid') + (page() === 'book' && currentPlant() ? button('Сохранить открытку в PNG', 'postcard', 'leaf') : '') + button('Резервная копия (.json)', 'backup', 'download') + '</div>');
}

function currentPlant() {
  const list = store.book.filter(p => p.speciesId === selectedSpecies);
  return list.find(p => p.uid === selectedPlant) || list.at(-1);
}

function highlight(source) {
  const b = board(),
    targets = new Set();
  if (source?.dataset.source === b.id) {
    source.dataset.line.split('–').forEach(key => targets.add(key));
  } else if (hint) {
    const awarded = new Set([...b.harvest.map(p => p.sourceLine), ...b.legacyLines]);
    const options = allLines(b).filter(l => !awarded.has(lineKey(l, b.size)));
    options.sort((a, c) => c.filter(i => b.cells[i].done).length - a.filter(i => b.cells[i].done).length);
    if (options.length) lineKey(options[0], b.size).split('–').forEach(key => targets.add(key));
  }
  root.querySelectorAll('[data-cell]').forEach(t => {
    const i = Number(t.dataset.cell),
      key = String.fromCharCode(65 + i % b.size) + (1 + Math.floor(i / b.size));
    t.classList.toggle('highlighted', targets.has(key));
  });
}

function turnLeaf(next, direction, action) {
  if (!next) return;
  const old = root.querySelector('.specimen-page');
  const animated = !store.settings.simpleMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveal = () => {
    selectedSpecies = next.speciesId; selectedPlant = next.uid; showIndex = false;
    render();
    const sheet = root.querySelector('.specimen-page');
    if (animated) sheet.animate([
      {transform: `perspective(1000px) rotateY(${direction * 38}deg)`, opacity: .58},
      {transform: 'perspective(1000px) rotateY(0deg)', opacity: 1}
    ], {duration: 260, easing:'ease-out'});
    const button = root.querySelector('[data-do="'+action+'"]:not(:disabled)')
      || root.querySelector('.book-turns button:not(:disabled)');
    button?.focus({preventScroll:true});
  };
  if (!animated || !old.offsetWidth) { reveal(); return; }
  if (old.dataset.turning) return;
  old.dataset.turning = 'true';
  old.animate([
    {transform:'perspective(1000px) rotateY(0deg)', opacity:1},
    {transform:`perspective(1000px) rotateY(${-direction * 55}deg)`, opacity:.55}
  ], {duration:170, easing:'ease-in', fill:'forwards'}).onfinish = () => {
    if (old.isConnected && page() === 'book') reveal();
  };
}

function showCalendar() {
  const b = board(), period = boardPeriod(b);
  const hidden = store.boards.filter(item=>item.calendarHidden);
  modal('Календарь досок', `<div id="calendar-month-view">${calendarMonth(store,calendarView)}</div>
    <form class="calendar-plan"><h3>${esc(b.title)}</h3>
      ${field('Начало периода','<input name="begin" type="datetime-local" required value="'+localInput(period.start)+'">')}
      <p class="hint calendar-preview">${formatPeriod(period)}</p>
      <button class="btn">Сохранить начало периода</button>
    </form>
    ${hidden.length ? `<details class="calendar-hidden"><summary>Вне календаря · ${hidden.length}</summary>${hidden.map(item=>`<div class="spread"><span>${esc(item.title)}</span><button class="quiet" data-do="relist:${esc(item.id)}">Вернуть</button></div>`).join('')}</details>` : ''}
    ${hidden.length<store.boards.length?button('Очистить календарь','clear-calendar','','plain'):''}`);
  const form=dialog.querySelector('.calendar-plan');
  form.elements.begin.oninput=()=>{
    const start=new Date(form.elements.begin.value);
    form.querySelector('.calendar-preview').textContent=Number.isFinite(+start)?formatPeriod({start,end:endOfPeriod(start,b.durationLabel)}):'';
  };
  form.onsubmit=e=>{
    e.preventDefault(); const start=new Date(form.elements.begin.value);
    b.calendarStart=start.toISOString(); calendarView=start;
    save();render();showCalendar();
  };
}

async function gardenAction(k, v) {
  const b = board();
  if (k === 'calendar') {calendarView=boardPeriod(b).start;showCalendar();}
  if (k === 'month') {
    calendarView=v==='today'?new Date():new Date(calendarView.getFullYear(),calendarView.getMonth()+Number(v),1);
    $('#calendar-month-view').innerHTML=calendarMonth(store,calendarView);
  }
  if (k === 'calendar-open') {store.active=v;save();dialog.close();navigate('board');}
  if (k === 'unlist' || k === 'relist') {
    const item=store.boards.find(item=>item.id===v);
    if(item){item.calendarHidden=k==='unlist';if(!item.calendarHidden)calendarView=boardPeriod(item).start;
      save();showCalendar();toast(item.calendarHidden?'Период убран из календаря':'Период возвращён');}
  }
  if (k === 'clear-calendar') {
    confirmAction('Очистить календарь?', 'Скрыть периоды всех досок? Задачи и цветы сохранятся. Периоды можно вернуть из списка «Вне календаря».','Очистить',()=>{
      store.boards.forEach(item=>{item.calendarHidden=true;});save();showCalendar();
    });
  }
  if (k === 'period') {
    templatePeriod = v;
    library();
    root.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  }
  if (k === 'covers') {
    const choices = Object.entries(covers).map(([id, cover]) =>
      `<button class="cover-choice" data-do="cover:${id}" aria-pressed="${id === (b.cover || 'glasshouse')}">
      <img alt="" src="/assets/covers/${cover.file}"><span>${cover.name}</span></button>`).join('');
    modal('Фон доски', '<div class="cover-choices">'+choices+'</div>');
  }
  if (k === 'cover' && Object.hasOwn(covers, v)) {
    b.cover = v;
    save(); dialog.close(); render();
    root.querySelector('.cover-picker')?.focus({preventScroll:true});
  }
  if (k === 'press') {
    const p = pressPlant(store, v);
    if (!p) return;
    selectedSpecies = p.speciesId;
    selectedPlant = p.uid;
    showIndex = false;
    save();
    render();
    toast(species[p.speciesId].name + ' теперь в гербарии');
    if (!store.settings.simpleMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelector('.species-slot canvas[data-plant="' + p.uid + '"]')?.animate([{
        opacity: .25,
        transform: 'scale(1.09) rotate(-8deg)'
      }, {
        opacity: 1,
        transform: 'none'
      }], {
        duration: 480,
        easing: 'ease-out'
      });
    }
    root.querySelector('[href="#book"].wide')?.focus({
      preventScroll: true
    });
  }
  if (k === 'discard') {
    const plant = store.basket.find(p => p.uid === v);
    if (!plant) return;
    confirmAction('Удалить из корзинки?', species[plant.speciesId].name + ' · ' + seedCode(plant.seed) + '. Запись о сборе останется в истории цикла.', 'Удалить', () => {
      store.basket = store.basket.filter(p => p.uid !== v);
      save();
      dialog.close();
      render();
    });
  }
  if (k === 'basket') {
    dialog.close();
    root.querySelector('.basket-panel')?.scrollIntoView({
      block: 'center'
    });
  }
  if (k === 'species' && Object.hasOwn(species, v)) {
    selectedSpecies = v;
    selectedPlant = null;
    showIndex = false;
    navigate('book');
  }
  if (k === 'contents') {
    showIndex = true;
    render();
  }
  if (k === 'first-leaf') turnLeaf(store.book[0], 1, 'leaf:1');
  if (k === 'turn' || k === 'leaf') {
    const list = k === 'leaf' ? store.book : store.book.filter(p => p.speciesId === selectedSpecies);
    const step = Number(v);
    turnLeaf(list[list.indexOf(currentPlant()) + step], step, k + ':' + v);
  }
  if (k === 'copy' && currentPlant()) {
    try {
      await navigator.clipboard.writeText(currentPlant().seed);
      toast('Код рисунка скопирован');
    } catch {
      modal('Код рисунка', field('Скопируйте значение', '<input readonly value="' + esc(currentPlant().seed) + '">'));
      dialog.querySelector('input').select();
    }
  }
  if (k === 'postcard') {
    const plant = currentPlant();
    if (!plant) return;
    try {
      download(await postcard(plant, store.book.indexOf(plant) + 1), 'Bingo-Bloom-' + seedCode(plant.seed) + '.png');
    } catch {
      toast('Не удалось создать открытку');
    }
  }
  if (k === 'finish' && b.started) {
    confirmAction('Завершить цикл?', 'Доска и полученные награды появятся в истории. Свежие цветы останутся в корзинке.', 'Завершить цикл', () => {
      finishBoard(store, b);
      hint = false;
      save();
      dialog.close();
      render();
    });
  }
  if (k === 'repeat') {
    const archived = store.history.find(x => x.id === v);
    if (!archived) return;
    const repeat = () => {
      const next = repeatBoard(archived);
      if (b.started) finishBoard(store, b, next);else {
        store.boards.unshift(next);
        store.active = next.id;
      }
      hint = false;
      save();
      dialog.close();
      navigate('board');
    };
    if (b.started) confirmAction('Повторить доску?', 'Текущий цикл будет сохранён в истории. Повтор начнётся с пустого поля выполнения.', 'Повторить доску', repeat);else repeat();
  }
  if (k === 'board-png') await exportModal();
  if (k === 'backup') download(new Blob([JSON.stringify(store, null, 2)], {
    type: 'application/json'
  }), 'Bingo-Bloom.json');
  if (k === 'reset') confirmAction('Сбросить весь прогресс?', 'Удалить все доски, корзинку, книгу и историю с этого устройства?', 'Продолжить', () => {
    confirmAction('Подтвердите удаление', 'Восстановление возможно только из ранее экспортированной копии.', 'Удалить весь прогресс', () => replaceStudio(newStudio()));
  });
}
root.addEventListener('change', e => {
  if (e.target.id === 'line-hint') {
    hint = e.target.checked;
    highlight();
  }
  if (['duration', 'grid-size'].includes(e.target.id)) {
    const b = board(), control = e.target.id;
    if (control === 'duration') b.durationLabel = e.target.value;
    else {
      resizeBoard(b, Number(e.target.value));
      // A geometry change alone must not mint another flower when a cell is rechecked.
      if (b.started) b.legacyLines = [...new Set([...b.legacyLines, ...lineIds(b).map(line => lineKey(line, b.size))])];
    }
    save(); render();
    document.getElementById(control)?.focus({preventScroll:true});
  }
});
root.addEventListener('input', e => {
  if (e.target.id === 'plant-note') {
    const p = store.book.find(p => p.uid === e.target.dataset.id);
    if (p) {
      p.note = e.target.value;
      save();
    }
  }
});
for (const event of ['pointerover', 'focusin', 'pointerout', 'focusout']) {
  root.addEventListener(event, e => {
    const el = e.target.closest('[data-source]');
    if (el && !el.contains(e.relatedTarget)) highlight(event === 'pointerover' || event === 'focusin' ? el : null);
  });
}
function refreshPeriodStatus() {
  const status=$('#period-status');
  if(status)status.textContent=periodStatus(boardPeriod(board()));
}
setInterval(refreshPeriodStatus,60000);
document.addEventListener('visibilitychange',refreshPeriodStatus);
render();
save();
