import {boardPeriod, calendarMonth, endOfPeriod, formatPeriod, localInput, periodStatus} from './game/calendar.js';
import { startBoard, completeCell, completeCells, capacity, coord, pressPlant, newStudio, decodeStudio, finishBoard, repeatBoard, duplicateDraft, removeBoard, lineKey, species } from './game/progress.js';
import { boardPage, boardOptions, img, art, button } from './ui/board-view.js';
import { bindGroupSelection } from './ui/group-selection.js';
import { bookPage, basketPage, archive, boardCollection, cycleSummary, paintVisible } from './ui/herbarium-view.js';
import { postcard } from './plants/specimen.js';
import { themes, animations, artNames, iconNames, rewards, resizeBoard, shuffleBoard, allLines, lineIds, covers, esc, STORE } from './game/board.js';
import {templateCatalog, creationDraft, creationForm, bindCreationForm} from './ui/board-creation.js';
import { icon, blossom } from './ui/icons.js';
import { sound, petals } from './ui/effects.js';
import { liftCard, scratchFace } from './ui/focus-card.js';
import { makePNG } from './export/board-png.js';
import { openProgress } from './game/storage.js';
import { harvestReceipt, capacityMessage } from './ui/harvest.js';
import { guidePreferences, contextTip } from './ui/first-run.js';
import { playHarvest, clearHarvest } from './ui/harvest-flight.js';
import { showPressPreview } from './ui/press-preview.js';
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
let basketOrigin = null;
let pendingHarvest = null;
let stopPressPreview = null;
let returnCellTop = null;
let optionsReturn = false;
const mobileBoard = matchMedia('(max-width: 860px)');
const largeFieldKey = 'bingo-bloom.large-field';
let largeField = false;
try { largeField = localStorage.getItem(largeFieldKey) === '1'; } catch {}

function showPendingHarvest() {
  const event = pendingHarvest;
  pendingHarvest = null;
  if (event && !dialog.open && page() === 'board' && store.active === event.origin.boardId) {
    playHarvest(event.awards, store, uid => openBasket(uid, event.origin));
  }
}
let leafReturn = null;
const noteWrites = new WeakMap();
let retryWrite = null,
  selectedSpecies = 'daisy',
  selectedPlant = null,
  showIndex = true,
  hint = false,
  calendarView = new Date(),
  templatePeriod = 'На неделю',
  catalogReturn = window.history.state?.catalogReturn ?? 'boards',
  retainedDraft = null,
  bookOrigin = 'board';
const progressStore = openProgress();
const guide = guidePreferences();
const storageMessages = {
  invalid: 'Сохранение повреждено. Восстановите резервную копию JSON в настройках.',
  unavailable: 'Не удалось сохранить изменения. Проверьте доступ к хранилищу и свободное место в браузере.',
  conflict: 'Другая вкладка изменила прогресс. Показаны актуальные данные. Повторите нужное действие.'
};
store = progressStore.state;
warning = storageMessages[progressStore.initial] || '';
selectedSpecies = store.book[0]?.speciesId || 'daisy';
selectedPlant = store.book[0]?.uid ?? null;
const board = () => store.boards.find(b => b.id === store.active);
function page(hash = location.hash) {
  const route = hash.slice(1).split('/')[0];
  return ['templates', 'boards', 'history', 'book', 'basket'].includes(route) ? route : 'board';
}

async function save(change, replacement, mergeLocal = false, afterRetry) {
  const expected = progressStore.raw;
  const boardId = store.active;
  const outcome = await progressStore.commit(
    change && (draft => change(draft, draft.boards.find(item => item.id === boardId))), replacement, mergeLocal
  );
  store = progressStore.state;
  warning = storageMessages[outcome.status] || '';
  retryWrite = null;
  if (outcome.status === 'saved') {
    header();
    return outcome;
  }
  if (outcome.status === 'unavailable') {
    retryWrite = async () => {
      if (expected !== progressStore.raw) return showStorageChange('conflict');
      const saved = await save(change, replacement, mergeLocal, afterRetry);
      if (saved && afterRetry) afterRetry(saved);
      else if (saved) {
        render();
        toast('Изменения сохранены на устройстве');
      }
    };
  }
  dialog.close();
  render();
  toast(warning);
  return false;
}

function showStorageChange(status) {
  store = progressStore.state;
  retryWrite = null;
  warning = storageMessages[status] || storageMessages.conflict;
  dialog.close();
  render();
  toast(warning);
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}

function setTheme() {
  const theme = board()?.theme || 'matcha', t = themes[theme];
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.simpleMotion = store.settings.simpleMotion;
  document.querySelector('meta[name="theme-color"]').content = t.paper;
}

function modal(title, content) {
  stopPressPreview?.();
  stopPressPreview = null;
  pendingHarvest = null;
  clearHarvest();
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
  if (progressStore.recovery) {
    $('#head').innerHTML = '<div class="bar"><span class="wordmark">' + blossom + '<span>Bingo <i>Bloom</i></span></span></div>';
    $('#foot').innerHTML = '';
    return;
  }
  const p = page();
  const inHerbarium = p === 'book' || (p === 'basket' && window.history.state?.basketEntry?.from !== 'board');
  const current = inHerbarium ? 'book' : 'board';
  const links = [['board', 'Доска', 'grid'], ['book', 'Гербарий', 'leaf']].map(([route, label, symbol]) =>
    `<a class="nav-link${route === current ? ' active' : ''}" href="#${route}"${route === current ? ' aria-current="page"' : ''}>${icon(symbol, 15)}<span>${label}</span></a>`).join('');
  $('#head').innerHTML = '<div class="bar"><a class="wordmark" href="#board" aria-label="Bingo Bloom — моя доска">' + blossom + '<span>Bingo <i>Bloom</i></span></a><nav aria-label="Главное меню">' + links + '</nav><div class="bar-actions">' + button('Экспорт', 'export', 'download') + '<button class="round" data-do="settings" title="Настройки доски" aria-label="Настройки доски">' + icon('tune', 17) + '</button></div></div>';
  $('#foot').innerHTML = '<a href="#boards" class="quiet">' + icon('boards', 15) + ' Мои доски (' + store.boards.length + ')</a><span class="row">' + icon(warning ? 'bulb' : 'check', 14) + '<span id="save-status">' + esc(warning || (progressStore.raw ? 'Сохранено на устройстве' : 'Подготовка сохранения…')) + '</span>' + (retryWrite ? button('Повторить запись','retry-write') : warning ? button('Настройки','settings') : '') + '</span>';
}

function library() {
  if (!window.history.state?.catalogReturn) {
    window.history.replaceState({...window.history.state, catalogReturn}, '');
  }
  root.innerHTML = templateCatalog(templatePeriod, catalogReturn);
}

function collection() {
  const requested = location.hash.split('/')[1];
  const filter = requested === 'drafts' ? 'drafts' : 'started';
  root.innerHTML = boardCollection(store, filter);
}

function showBoardRewards() {
  const b = board();
  const cells = b.cells.filter(cell => cell.done).sort((a, z) => z.done - a.done);
  const rows = cells.map(cell => {
    const time = new Date(cell.done);
    return `<button class="history-row" data-do="detail:${esc(cell.id)}">
      ${art(cell.icon)}<span><strong>${esc(cell.task)}</strong><span class="reward-text">${esc(cell.reward || 'Без личной награды')}</span></span>
      <time datetime="${time.toISOString()}">${time.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}</time>
      ${icon('chevron', 16)}</button>`;
  }).join('');
  modal('Личные награды', `<p class="desc">${esc(b.title)}</p>${rows || '<p>Выполните задачу на этой доске, чтобы увидеть здесь её награду.</p>'}`);
}

function renameDraft(board) {
  modal('Переименовать доску', `<form id="rename-board-form">
    ${field('Название доски', '<input name="title" required maxlength="60" value="' + esc(board.title) + '">')}
    <div class="actions">${button('Отмена', 'close')}<button class="btn primary">Сохранить</button></div></form>`);
  const form = $('#rename-board-form');
  const input = form.elements.title;
  input.select();
  input.oninput = () => input.setCustomValidity('');
  form.onsubmit = async event => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) {
      input.setCustomValidity('Введите название доски.');
      input.reportValidity();
      return;
    }
    if (!await save(draft => { draft.boards.find(item => item.id === board.id).title = title; })) return;
    dialog.close();
    render();
    root.querySelector('[data-do="open:' + CSS.escape(board.id) + '"]')?.focus();
  };
}

function render() {
  pendingHarvest = null;
  clearHarvest();
  setTheme();
  header();
  if (progressStore.recovery) {
    const invalid = progressStore.recovery === 'invalid';
    root.innerHTML = '<section class="panel empty-state recovery-state">' + icon('reset', 32) +
      '<h1>' + (invalid ? 'Восстановление сохранения' : 'Хранилище недоступно') + '</h1><p>' +
      (invalid ? 'Не удалось прочитать сохранённый прогресс. Выберите резервную копию JSON, чтобы вернуть свои доски и цветы.' :
        'Разрешите браузеру доступ к локальному хранилищу и повторите чтение.') + '</p><div class="actions">' +
      (invalid ? '<label class="btn primary import-file">Восстановить из копии<input id="import-file" type="file" accept=".json,application/json"></label>' : '') +
      button('Повторить чтение', 'retry-read') + '</div>' +
      (invalid ? button('Начать заново', 'reset', '', 'plain') : '') + '</section>';
    if (invalid) bindImport($('#import-file'));
    document.title = 'Восстановление · Bingo Bloom';
    return;
  }
  const p = page();
  const firstRun = board() && !board().started && store.guideId === store.active && guide.available(store.guideId, 'welcome');
  if (p === 'board') {
    root.innerHTML = boardPage(store, board(), hint, firstRun, largeField, mobileBoard.matches);
    bindGroupSelection(root.querySelector('.journal-page') || root, confirmGroup);
  } else if (p === 'templates') library();else if (p === 'boards') collection();else if (p === 'book') root.innerHTML = bookPage(store, selectedSpecies, selectedPlant, showIndex, bookOrigin);else if (p === 'basket') root.innerHTML = basketPage(store, window.history.state?.basketEntry);else root.innerHTML = archive(store);
  if (p === 'basket') {
    const uid = window.history.state?.basketEntry?.uid;
    const target = uid && root.querySelector('[data-basket-uid="' + CSS.escape(uid) + '"] .basket-actions');
    presentTip(target || root.querySelector('.basket-actions'), 'press');
  }
  if (p === 'board' && store.basket.length && !dialog.open) presentTip(root.querySelector('.basket-panel'), 'collected');
  paintVisible(root, store);
  if (p === 'board') highlight();
  document.title = (p === 'board' ? (board()?.title || 'Моя доска') : {
    book: 'Книга-гербарий',
    basket: 'Корзинка',
    templates: 'Шаблоны',
    boards: 'Мои доски',
    history: 'Завершённые доски'
  }[p]) + ' · Bingo Bloom';
}

function presentTip(target, name) {
  if (target && guide.available(store.guideId, name)) {
    target.insertAdjacentHTML('beforeend', contextTip(name));
    guide.mark(store.guideId, name);
  }
}

function navigate(p) {
  if (location.hash === '#' + p || (!location.hash && p === 'board')) {
    render();
    focusPage();
  } else location.hash = p;
}

function focusPage() {
  const heading = root.querySelector('h1');
  heading.tabIndex = -1;
  window.scrollTo(0, 0);
  heading.focus({preventScroll: true});
}

function rememberBook() {
  const nav = window.history;
  nav.replaceState({...nav.state, bookOrigin, leafReturn, bookView: {selectedSpecies, selectedPlant, showIndex}}, '');
}

function readBook(previous) {
  const state = window.history.state;
  bookOrigin = state?.bookOrigin ?? previous;
  leafReturn = state?.leafReturn ?? null;
  if (state?.bookView) {
    selectedSpecies = state.bookView.selectedSpecies;
    selectedPlant = state.bookView.selectedPlant;
    showIndex = state.bookView.showIndex;
  }
  rememberBook();
}

function openPressedLeaf(uid) {
  const plant = store.book.find(item => item.uid === uid);
  if (!plant || page() !== 'basket') return;
  const nav = window.history;
  const fromBoard = nav.state?.basketEntry?.from === 'board';
  // The field and this leaf are consecutive entries, including after a reload.
  if (fromBoard) nav.replaceState({}, '', '#book');
  else nav.pushState({}, '', '#book');
  leafReturn = bookOrigin = fromBoard ? 'board' : 'basket';
  selectedSpecies = plant.speciesId;
  selectedPlant = plant.uid;
  showIndex = false;
  rememberBook();
  dialog.close();
  render();
  focusPage();
}

function pressedReceipt(saved) {
  const plant = saved?.result;
  if (!plant || page() !== 'basket') return;
  const freshCanvas = root.querySelector('[data-basket-uid="' + CSS.escape(plant.uid) + '"] canvas');
  const name = species[plant.speciesId].name;
  const date = new Date(plant.pressedAt).toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'});
  render();
  const next = root.querySelector('[data-do^="press:"]') ?? root.querySelector('[data-do="return-cell"]');
  next?.focus({preventScroll: true});
  modal('Цветок засушен', '<figure class="press-preview"><canvas width="325" height="403" role="img" aria-label="' + name + '"></canvas>' +
    '<figcaption><strong>' + name + '</strong> <time datetime="' + esc(plant.pressedAt) + '">' + date + '</time></figcaption></figure><div class="actions">' +
    button('Остаться в корзинке', 'close') + button('Открыть лист', 'open-leaf:' + plant.uid, '', 'primary') + '</div>');
  stopPressPreview = showPressPreview(dialog.querySelector('.press-preview'), plant, freshCanvas, store.settings.simpleMotion);
  dialog.querySelector('[data-do^="open-leaf:"]').focus({preventScroll:true});
}

function focusBasket(uid) {
  const card = uid && root.querySelector('[data-basket-uid="' + CSS.escape(uid) + '"]');
  if (card) {
    card.scrollIntoView({block: 'center', behavior: 'instant'});
    card.querySelector('h2').focus({preventScroll: true});
    card.classList.add('basket-highlight');
    setTimeout(() => card.classList.remove('basket-highlight'), 1400);
  } else {
    focusPage();
  }
}

function openBasket(uid, source) {
  const from = page();
  const origin = source || (dialog.open && basketOrigin) || {boardId: store.active, scrollY: window.scrollY,
    top: root.querySelector('[data-do="basket"]')?.getBoundingClientRect().top};
  const entry = {from, origin, uid};
  const navigation = window.history;
  navigation.replaceState({...navigation.state, basketReturn: entry, bookOrigin}, '');
  navigation.pushState({basketEntry: entry}, '', '#basket');
  returnIndex = null;
  dialog.close();
  render();
  focusBasket(uid);
}

async function restoreBasketOrigin(entry) {
  const origin = entry.origin;
  let target;
  if (page() === 'board') {
    const source = store.boards.find(b => b.id === origin.boardId);
    if (source && source.id !== store.active) {
      if (!await save(draft => { draft.active = source.id; })) return;
      render();
    }
    if (source && origin.cellId) {
      const index = source.cells.findIndex(cell => cell.id === origin.cellId);
      target = root.querySelector('[data-cell="' + index + '"]');
    }
  }
  target ??= root.querySelector('[data-do="basket"]');
  window.scrollTo(0, origin.scrollY);
  if (target) {
    const rect = target.getBoundingClientRect();
    if (Number.isFinite(origin.top) && origin.top >= 0 && origin.top < window.innerHeight) {
      window.scrollBy(0, rect.top - origin.top);
    } else if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      target.scrollIntoView({block: 'center', behavior: 'instant'});
    }
  }
  target?.focus({preventScroll: true});
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
  form.onsubmit = async e => {
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
    const updated = {task, reward, icon: emoji || form.art.value || 'leaf'};
    if (!await save((_, b) => Object.assign(b.cells[i], updated))) return;
    dialog.close();
    render();
    focusCell(i);
  };
}

function newBoard(key) {
  const draft = retainedDraft?.template === key ? retainedDraft : creationDraft(key, templatePeriod, board());
  retainedDraft = null;
  modal('Настройка новой доски', creationForm(draft));
  dialog.scrollTop = 0;
  const choose = () => {
    retainedDraft = draft;
    dialog.close();
    if (page() !== 'templates') navigate('templates');
    else root.querySelector('[data-do="new:' + CSS.escape(key) + '"]')?.focus();
  };
  const created = () => {
    hint = false;
    dialog.close();
    navigate('board');
  };
  bindCreationForm($('#new-board'), draft, choose, async record => {
    const saved = await save(studio => {
      if (!studio.boards.some(item => item.id === record.id)) studio.boards.unshift(record);
      studio.active = record.id;
    }, null, false, created);
    if (saved) created();
  });
}

function bonus() {
  const b = board();
  modal('Супернаграда', '<form id="bonus-form">' + field('За горизонталь, вертикаль или диагональ', '<textarea name="bonus" maxlength="120" required>' + esc(b.bonus) + '</textarea>') + '<div class="actions"><button class="btn primary">Сохранить</button></div></form>');
  const f = $('#bonus-form');
  f.onsubmit = async e => {
    e.preventDefault();
    const value = f.bonus.value.trim();
    if (!value) {
      toast('Введите награду за линию');
      return;
    }
    if (!await save((_, current) => { current.bonus = value; })) return;
    dialog.close();
    render();
  };
}

function focusCell(i) {
  root.querySelector('[data-cell="' + i + '"]')?.focus({
    preventScroll: true
  });
}

async function confirmGroup(indices) {
  const b = board();
  const last = indices.at(-1);
  const origin = {boardId:b.id, cellId:b.cells[last].id, scrollY:window.scrollY,
    top:root.querySelector('[data-cell="' + last + '"]').getBoundingClientRect().top};
  function showResult(saved) {
    if (page() !== 'board' || store.active !== b.id) return;
    const result = saved.result;
    if (result.needed) {
      return result.required > capacity
        ? `Новых линий: ${result.required}. В корзинке всего ${capacity} мест. Уменьшите выбор.`
        : `Для новых цветов нужно мест: ${result.required}. Свободно: ${result.free}. Уменьшите выбор или освободите корзинку.`;
    }
    render();
    returnIndex = last;
    returnCellTop = origin.top;
    const rewards = indices.map(i => {
      const cell = b.cells[i];
      return `<li><strong>${coord(i,b.size)} · ${esc(cell.task)}</strong><p>${esc(cell.reward.trim() || 'Выполнено')}</p></li>`;
    }).join('');
    modal('Задачи выполнены', `<p>Отмечено клеток: ${indices.length} · Новых линий: ${result.added}</p>
      <details class="group-rewards" open><summary>Личные награды</summary><ul>${rewards}</ul></details>
      ${result.added ? '<p class="line-reward">Бинго! ' + esc(b.bonus) + '</p>' + harvestReceipt(store, b, result.awards) : ''}
      <div class="actions">${button('Вернуться к доске', 'close', '', 'primary')}</div>`);
    basketOrigin = origin;
    if (result.added) {
      pendingHarvest = {awards:result.awards, origin};
      paintVisible(dialog, store);
    }
    sound(result.added ? 'line' : 'flip', store.sound);
    dialog.querySelector('[data-do="close"].primary').focus({preventScroll:true});
  }
  const saved = await save((draft, current) => completeCells(draft, current, indices), null, false, showResult);
  if (saved) return showResult(saved);
}

function openCard(i, origin = null) {
  const b = board(),
    c = b.cells[i];
  returnIndex = i;
  returnCellTop = origin?.top ?? null;
  basketOrigin = null;
  const cellOrigin = {boardId: b.id, cellId: c.id, scrollY: window.scrollY, top: origin?.top};
  const coord = String.fromCharCode(65 + i % b.size) + (Math.floor(i / b.size) + 1);
  const personal = c.reward.trim();
  modal('Карточка ' + coord, `
    <div class="spotlight">
      <div class="stage-head"><span>${esc(b.title)} · ${coord}</span>
        <button class="round" data-do="close" aria-label="Вернуться к полю">${icon('close', 17)}</button></div>
      <div class="keepsake" data-color="${c.color}">
        <div class="keepsake-back" aria-hidden="true" inert>${img('icon-heart', 'reward-art')}<p>${esc(personal || c.task)}</p><span class="keepsake-sign">Bingo Bloom</span></div>
        <canvas tabindex="0" role="button" aria-label="${esc('Открыть карточку. ' + c.task)}" aria-describedby="scratch-hint"></canvas>
      </div>
      <div class="stage-info" aria-live="polite"></div>
      <div class="stage-foot">
        <button class="quiet undo-card" data-do="undo:${i}" ${c.done ? '' : 'hidden'}>${icon('reset', 14)} Снять отметку</button></div>
    </div>`);
  dialog.classList.add('card-stage');
  const card = dialog.querySelector('.keepsake');
  const info = dialog.querySelector('.stage-info');
  function showReward(firstReveal = false, awards = []) {
    card.classList.add('uncovered', 'finish-' + b.animation);
    if (firstReveal) card.classList.add('first-reveal');
    card.querySelector('canvas').remove();
    const reward = card.querySelector('.keepsake-back');
    reward.inert = false;
    reward.removeAttribute('aria-hidden');
    dialog.querySelector('.undo-card').hidden = firstReveal;
    info.innerHTML = '<div class="task-receipt">' + icon('check', 16) + ' Задача выполнена' + (personal ? ' · ' + esc(c.task) : '') + '</div>';
    if (awards.length) {
      basketOrigin = cellOrigin;
      info.insertAdjacentHTML('beforeend', '<div class="line-reward">' + icon('spark', 17) + ' <strong>Бинго!</strong> ' + esc(b.bonus) + '</div>' + harvestReceipt(store, b, awards));
      presentTip(info.querySelector('.harvest-receipt'), 'collected');
      paintVisible(info, store);
    }
    info.insertAdjacentHTML('beforeend', button('Вернуться к доске', 'close', '', 'primary'));
    info.querySelector('[data-do="close"]').focus({
      preventScroll: true
    });
  }
  if (c.done) showReward();else {
    info.innerHTML = '<p class="task-receipt">' + esc(c.task) + '</p><p id="scratch-hint">Сотрите половину слоя, чтобы открыть карточку.</p><button type="button" class="btn primary">Открыть без стирания</button>';
    presentTip(info, 'scratch');
    const style = getComputedStyle(document.documentElement);
    const canvas = card.querySelector('canvas');
    const source = root.querySelector('[data-cell="' + i + '"] .front img');
    let result;
    stopScratch = scratchFace({
      canvas,
      openButton: info.querySelector('button'),
      cell: c,
      picture: source,
      tone: style.getPropertyValue('--tile' + c.color).trim(),
      ink: style.getPropertyValue('--ink').trim(),
      coord: store.settings.coordinates ? coord : '',
      onRub: () => sound('scratch', store.sound),
      onThreshold: async () => {
        if (!dialog.open || !card.isConnected) return false;
        const saved = await save((draft, current) => completeCell(draft, current, i));
        if (!saved) return false;
        const returnFocus = !dialog.open && root.querySelector('[data-cell="' + i + '"]') === document.activeElement;
        render();
        if (returnFocus) focusCell(i);
        if (saved.result.awards?.length && page() === 'board' && store.active === b.id && (!dialog.open || card.isConnected)) {
          pendingHarvest = {awards: saved.result.awards, origin: cellOrigin};
          if (!dialog.open) showPendingHarvest();
        }
        if (!dialog.open || !card.isConnected) return false;
        result = saved.result;
        if (result.needed) {
          basketOrigin = cellOrigin;
          modal('Корзинка заполнена', '<p>' + capacityMessage(result) + '</p><p>Личная награда · ' + esc(c.reward || c.task) + '</p><div class="actions">' + button('Вернуться к клетке', 'close') + button('Открыть корзинку', 'basket', '', 'primary') + '</div>');
          return false;
        }
        return true;
      },
      onDone: () => {
        if (!dialog.open || !card.isConnected) return;
        const newLine = result.added > 0;
        showReward(true, result.awards || []);
        sound(newLine ? 'line' : 'flip', store.sound);
        if (newLine) petals(card);
      }
    });
    canvas.focus({
      preventScroll: true
    });
  }
  liftCard(card, origin);
}

async function exportModal(selectedBoard = board()) {
  if (!selectedBoard) return;
  modal('Скачать доску', '<p class="desc">Текущий прогресс и открытые награды в одной картинке.</p><div class="choice-list"><label><input type="radio" name="format" value="square" checked><span>Квадрат · 1:1</span></label><label><input type="radio" name="format" value="story"><span>Сторис · 9:16</span></label></div><div id="preview-box" aria-live="polite"></div><div class="actions"><a id="download" class="btn primary" hidden>' + icon('download', 16) + ' Скачать PNG</a></div>');
  async function update() {
    const run = ++exportRun,
      format = dialog.querySelector('[name=format]:checked').value,
      link = $('#download');
    link.hidden = true;
    $('#preview-box').textContent = 'Готовим изображение…';
    try {
      const blob = await makePNG(selectedBoard, format);
      if (run !== exportRun || !dialog.open) return;
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(blob);
      $('#preview-box').innerHTML = '<img class="frame-preview" src="' + exportUrl + '" alt="Предпросмотр PNG-доски">';
      link.href = exportUrl;
      link.download = selectedBoard.title.replace(/[<>:"/\\|?*]/g, '-') + '-' + (format === 'story' ? '9x16' : '1x1') + '.png';
      link.hidden = false;
    } catch {
      if (run === exportRun) $('#preview-box').textContent = 'Не удалось создать PNG. Попробуйте ещё раз.';
    }
  }
  dialog.querySelectorAll('[name=format]').forEach(el => el.onchange = update);
  await update();
}
document.addEventListener('click', async e => {
  if (e.target.closest('.book-back') && leafReturn && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    window.history.back();
    return;
  }
  const cell = e.target.closest('[data-cell]');
  if (cell) {
    const i = Number(cell.dataset.cell);
    if (!board().started) editCell(i);else openCard(i, cell.getBoundingClientRect());
    return;
  }
  const action = e.target.closest('[data-do]')?.dataset.do;
  if (!action) return;
  const [k, v] = action.split(':');
  if (k === 'retry-read') {
    const status = progressStore.refresh();
    store = progressStore.state;
    warning = storageMessages[status] || '';
    if (progressStore.raw === null) await save();
    render();
    focusPage();
    return;
  }
  if (k === 'dismiss-tip') {
    const tip = e.target.closest('.context-tip');
    const action = tip.parentElement.querySelector('button:not([data-do="dismiss-tip"])');
    tip.remove();
    action?.focus({preventScroll:true});
    return;
  }
  if (k === 'first-help') {
    modal('Как устроен гербарий', '<p>Соберите строку, столбец или диагональ из выполненных задач. За каждую новую линию в корзинке появится цветок.</p><p>Откройте корзинку и засушите цветок. В книге у него будет свой лист, где можно оставить заметку.</p><div class="actions">' + button('Вернуться к доске', 'close', '', 'primary') + '</div>');
    return;
  }
  if (k === 'first-setup') {
    guide.mark(store.guideId, 'welcome');
    render();
    const first = root.querySelector('[data-cell="0"]');
    first?.focus();
    return;
  }
  if (k === 'retry-write') { await retryWrite?.(); return; }
  if (k === 'close') dialog.close();
  if (k === 'start' || k === 'first-task') {
    const b = board(),
      missing = b.cells.findIndex(c => !c.task.trim() || !c.reward.trim());
    if (missing >= 0) {
      editCell(missing);
      return;
    }
    const started = () => {
      render();
      if (page() !== 'board' || store.active !== b.id) return;
      focusCell(0);
      if (k === 'first-task') openCard(0);
      else toast('Бинго готово. Выберите карточку.');
    };
    if (await save((draft, current) => startBoard(current, draft.settings), null, false, started)) started();
    return;
  }
  if (k === 'settings') settings();
  if (k === 'board-options') {
    optionsReturn = true;
    modal('Параметры доски', boardOptions(board(), largeField));
  }
  if (k === 'bonus' && !board().started) bonus();
  if (k === 'new') newBoard(v);
  if (k === 'choose-board') navigate('templates');
  if (k === 'collection') {
    dialog.close();
    navigate('boards');
  }
  if (k === 'open' || k === 'calendar-open') {
    if (!store.boards.some(item => item.id === v)) return;
    const show = () => { hint = false; dialog.close(); navigate('board'); };
    if (await save(draft => { draft.active = v; }, null, false, show)) show();
    return;
  }
  if (k === 'shuffle' && !board().started) {
    if (!await save((_, current) => shuffleBoard(current))) return;
    render();
    toast('Клетки перемешаны');
  }
  if (k === 'board-rewards') showBoardRewards();
  if (k === 'detail') {
    const index = board().cells.findIndex(cell => cell.id === v && cell.done);
    if (index >= 0) openCard(index);
  }
  if (k === 'undo') {
    if (!await save((_, current) => { current.cells[Number(v)].done = 0; })) return;
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
  if (dialog.open) return;
  stopPressPreview?.();
  stopPressPreview = null;
  stopScratch?.();
  stopScratch = null;
  dialog.classList.remove('card-stage');
  if (returnIndex !== null) {
    const tile = root.querySelector('[data-cell="' + returnIndex + '"]');
    if (tile && Number.isFinite(returnCellTop) && returnCellTop >= 0 && returnCellTop < innerHeight) {
      window.scrollBy(0, tile.getBoundingClientRect().top - returnCellTop);
    }
    focusCell(returnIndex);
    returnIndex = null;
    returnCellTop = null;
  }
  if (optionsReturn) root.querySelector('.board-options')?.focus({preventScroll:true});
  optionsReturn = false;
  showPendingHarvest();
  exportRun++;
  if (exportUrl) {
    URL.revokeObjectURL(exportUrl);
    exportUrl = '';
  }
});
window.addEventListener('hashchange', event => {
  const previousHash = new URL(event.oldURL).hash;
  const previous = page(previousHash);
  if (page() === 'templates' && previous !== 'templates') {
    const origin = ['#boards/started', '#boards/drafts'].includes(previousHash) ? previousHash.slice(1) : previous;
    catalogReturn = window.history.state?.catalogReturn ?? origin;
  }
  if (previous === 'templates' && page() !== 'templates') retainedDraft = null;
  const returning = (previous === 'basket' || previous === 'book' && leafReturn === 'board')
    && window.history.state?.basketReturn;
  if (page() === 'book') readBook(previous);
  dialog.close();
  render();
  if (returning) restoreBasketOrigin(returning);
  else if (page() === 'basket') focusBasket(window.history.state?.basketEntry?.uid);
  else focusPage();
});
window.addEventListener('storage', e => {
  if (e.key === largeFieldKey || e.key === null) {
    try { largeField = localStorage.getItem(largeFieldKey) === '1'; } catch {}
    if (page() === 'board') {
      root.querySelector('.board-workspace')?.classList.toggle('large-field', largeField);
      const bonus = root.querySelector('.bonus-panel');
      if (bonus) bonus.open = !largeField;
      const input = dialog.querySelector('#large-field');
      if (input) input.checked = largeField;
    }
  }
  if (e.key !== STORE && e.key !== null) return;
  const status = progressStore.refresh();
  if (status !== 'unchanged') showStorageChange(status);
});
mobileBoard.addEventListener('change', () => {
  const sidebar = root.querySelector('.sidebar');
  if (!sidebar) return;
  const focused = document.activeElement;
  sidebar.prepend(sidebar.querySelector(mobileBoard.matches ? '.basket-panel' : '.bonus-panel'));
  if (sidebar.contains(focused)) focused.focus({preventScroll:true});
});

function settings() {
  const b = board(),
    o = store.settings;
  const options = (set, selected) => Object.entries(set).map(([v, label]) => '<option value="' + esc(v) + '" ' + (v === selected ? 'selected' : '') + '>' + esc(label) + '</option>').join('');
  const boardFields = b ? field('Название доски', '<input required name="title" maxlength="60" ' + (b.started ? 'readonly' : '') + ' value="' + esc(b.title) + '">') + field('Цветовая тема', '<select name="theme">' + options(Object.fromEntries(Object.entries(themes).map(([k, t]) => [k, t.name])), b.theme) + '</select>') + field('Эффект после стирания', '<select name="animation">' + options(animations, b.animation) + '</select>') : '';
  modal('Настройки', '<form id="settings-form">' + boardFields + field('Код следующего цикла', '<select name="seedMode">' + options({
    auto: 'Автоматический',
    manual: 'Ручной ввод'
  }, o.seedMode) + '</select>') + '<label class="field" id="manual-field">Свой код<input name="seed" maxlength="120" value="' + esc(o.manualSeed) + '"></label>' + [['coordinates', 'Показывать координаты клеток', o.coordinates], ['simpleMotion', 'Упрощённые анимации', o.simpleMotion], ['sound', 'Мягкие звуки при выполнении', store.sound]].map(([k, label, value]) => '<label class="check-label"><input type="checkbox" name="' + k + '" ' + (value ? 'checked' : '') + '>' + label + '</label>').join('') + '<div class="actions">' + button('Мои доски', 'collection', 'boards') + '<button class="btn primary">Сохранить</button></div></form>' + '<section class="backup-controls"><h3>Данные и резервная копия</h3><p class="hint">' + esc(warning || 'Сохранено на устройстве') + '</p>' + button('Экспортировать сохранение (.json)', 'backup') + '<label class="btn import-file">Импортировать сохранение (.json)<input id="import-file" type="file" accept=".json,application/json"></label>' + button('Сбросить весь прогресс', 'reset', '', 'plain') + '</section><offline-settings></offline-settings>');
  const form = $('#settings-form'),
    f = form.elements;
  function seedField() {
    const manual = f.seedMode.value === 'manual';
    $('#manual-field').hidden = !manual;
    f.seed.required = manual;
  }
  f.seedMode.onchange = seedField;
  seedField();
  form.onsubmit = async e => {
    e.preventDefault();
    const title = f.title?.value.trim(),
      manualSeed = f.seed.value.trim();
    if (b && !title || f.seedMode.value === 'manual' && !manualSeed) {
      toast('Введите название доски и свой код для следующего цикла.');
      return;
    }
    const theme = f.theme?.value, animation = f.animation?.value, sound = f.sound.checked;
    const options = {manualSeed, seedMode: f.seedMode.value, coordinates: f.coordinates.checked, simpleMotion: f.simpleMotion.checked};
    if (!await save((draft, current) => {
      if (current) {
        if (!current.started) current.title = title;
        current.theme = theme;
        current.animation = animation;
      }
      draft.sound = sound;
      Object.assign(draft.settings, options);
    })) return;
    dialog.close();
    render();
    toast('Настройки сохранены');
  };
  bindImport($('#import-file'));
}

function bindImport(input) {
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    input.value = '';
    try {
      const imported = decodeStudio(await file.text());
      if (!input.isConnected || dialog.contains(input) && !dialog.open) return;
      confirmAction('Восстановить резервную копию?', 'Текущие данные будут заменены. В копии досок: ' + imported.boards.length + ', цветов в корзинке: ' + imported.basket.length + ', в книге: ' + imported.book.length + ', завершённых циклов: ' + imported.history.length + '.', 'Восстановить', () => replaceStudio(imported));
    } catch {
      if (input.isConnected && (!dialog.contains(input) || dialog.open)) {
        modal('Не удалось импортировать файл', '<p>Проверьте формат и версию сохранения. Текущий прогресс сохранён.</p><div class="actions">' + (progressStore.recovery ? button('Вернуться', 'close') : button('К настройкам', 'settings')) + '</div>');
      }
    }
  };
}

function confirmAction(title, message, label, yes, role = 'danger') {
  modal(title, '<p class="confirm-text">' + esc(message) + '</p><div class="actions">' + button('Отмена', 'close') + '<button class="btn ' + role + '" id="confirm-action">' + esc(label) + '</button></div>');
  const confirm = $('#confirm-action');
  confirm.onclick = async () => {
    if (confirm.disabled) return;
    confirm.disabled = true;
    confirm.setAttribute('aria-busy', 'true');
    try { await yes(); }
    finally {
      confirm.disabled = false;
      confirm.removeAttribute('aria-busy');
    }
  };
}

async function replaceStudio(next) {
  if (!await save(null, next)) return;
  hint = false;
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
  modal('Экспорт', '<p class="desc">JSON позволяет восстановить все доски, корзинку, книгу и историю. PNG сохраняет изображение выбранной доски или открытки.</p><div class="export-options">' + (board() ? button('Сохранить доску в PNG', 'board-png', 'grid') : '') + (page() === 'book' && currentPlant() ? button('Сохранить открытку в PNG', 'postcard', 'leaf') : '') + button('Резервная копия (.json)', 'backup', 'download') + '</div>');
}

function currentPlant() {
  const list = store.book.filter(p => p.speciesId === selectedSpecies);
  return list.find(p => p.uid === selectedPlant) || list.at(-1);
}

function highlight() {
  const b = board(),
    targets = new Set();
  if (!b) return;
  if (hint) {
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
    rememberBook();
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
  const b = board();
  if (!b) {
    modal('Календарь досок', '<div id="calendar-month-view">' + calendarMonth(store, calendarView) + '</div>');
    return;
  }
  const period = boardPeriod(b);
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
  form.onsubmit=async e=>{
    e.preventDefault(); const start=new Date(form.elements.begin.value);
    if (!await save((_, current) => { current.calendarStart = start.toISOString(); })) return;
    calendarView=start;render();showCalendar();
  };
}

async function gardenAction(k, v) {
  const b = board();
  if (k === 'calendar') {calendarView=b ? boardPeriod(b).start : new Date();showCalendar();}
  if (k === 'month') {
    calendarView=v==='today'?new Date():new Date(calendarView.getFullYear(),calendarView.getMonth()+Number(v),1);
    $('#calendar-month-view').innerHTML=calendarMonth(store,calendarView);
  }
  if (k === 'unlist' || k === 'relist') {
    const item=store.boards.find(item=>item.id===v);
    if(item){
      if (!await save(draft => { draft.boards.find(board => board.id === v).calendarHidden = k === 'unlist'; })) return;
      if(k === 'relist') calendarView=boardPeriod(item).start;
      showCalendar();toast(k === 'unlist'?'Период убран из календаря':'Период возвращён');
    }
  }
  if (k === 'clear-calendar') {
    confirmAction('Очистить календарь?', 'Скрыть периоды всех досок? Задачи и цветы сохранятся. Периоды можно вернуть из списка «Вне календаря».','Очистить',async ()=>{
      if (await save(draft => draft.boards.forEach(item=>{item.calendarHidden=true;}))) showCalendar();
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
    if (!await save((_, current) => { current.cover = v; })) return;
    render();
    modal('Параметры доски', boardOptions(board(), largeField));
    dialog.querySelector('[data-do="covers"]').focus({preventScroll:true});
  }
  if (k === 'press') {
    const control = root.querySelector('[data-do="press:' + CSS.escape(v) + '"]');
    if (!control || control.disabled) return;
    control.disabled = true;
    const saved = await save(draft => pressPlant(draft, v), null, false, pressedReceipt);
    if (control.isConnected && !dialog.open) pressedReceipt(saved);
  }
  if (k === 'open-leaf') openPressedLeaf(v);
  if (k === 'discard') {
    const plant = store.basket.find(p => p.uid === v);
    if (!plant) return;
    confirmAction('Удалить из корзинки?', species[plant.speciesId].name + ' · ' + plant.sourceLine + '. Запись о сборе останется в истории цикла.', 'Удалить', async () => {
      if (!await save(draft => { draft.basket = draft.basket.filter(p => p.uid !== v); })) return;
      dialog.close();
      render();
      (root.querySelector('[data-do^="press:"]') ?? root.querySelector('[data-do="return-cell"]'))?.focus();
    });
  }
  if (k === 'basket') openBasket(v);
  if (k === 'return-cell') {
    if (window.history.state?.basketEntry) window.history.back();
    else navigate('board');
  }
  if (k === 'species' && Object.hasOwn(species, v)) {
    selectedSpecies = v;
    selectedPlant = null;
    showIndex = false;
    if (page() === 'book') rememberBook();
    navigate('book');
  }
  if (k === 'contents') {
    showIndex = true;
    rememberBook();
    render();
  }
  if (k === 'first-leaf') turnLeaf(store.book[0], 1, 'leaf:1');
  if (k === 'turn' || k === 'leaf') {
    const list = k === 'leaf' ? store.book : store.book.filter(p => p.speciesId === selectedSpecies);
    const step = Number(v);
    turnLeaf(list[list.indexOf(currentPlant()) + step], step, k + ':' + v);
  }
  if (k === 'postcard') {
    const uid = currentPlant()?.uid;
    const noteWrite = noteWrites.get(root.querySelector('#plant-note'));
    if (noteWrite && !await noteWrite) return;
    const plant = store.book.find(item => item.uid === uid);
    if (!plant) return;
    try {
      const number = store.book.indexOf(plant) + 1;
      download(await postcard(plant, number), species[plant.speciesId].name + ' — лист ' + number + '.png');
    } catch {
      toast('Не удалось создать открытку');
    }
  }
  if (k === 'finish') {
    const selected = v ? store.boards.find(item => item.id === v) : b;
    if (!selected?.started) return;
    confirmAction('Завершить цикл «' + selected.title + '»?', 'Доска и полученные награды появятся в истории. Свежие цветы останутся в корзинке.', 'Завершить цикл', async () => {
      if (!await save(draft => finishBoard(draft, draft.boards.find(item => item.id === selected.id)))) return;
      hint = false;
      dialog.close();
      render();
    }, 'primary');
  }
  if (k === 'rename-board' || k === 'duplicate-board') {
    const selected = store.boards.find(item => item.id === v && !item.started);
    if (!selected) return;
    if (k === 'rename-board') return renameDraft(selected);
    const trigger = root.querySelector('[data-do="duplicate-board:' + CSS.escape(v) + '"]');
    if (trigger?.disabled) return;
    if (trigger) trigger.disabled = true;
    const copy = duplicateDraft(selected);
    if (!await save(draft => { draft.boards.push(copy); })) return;
    render();
    root.querySelector('[data-do="open:' + CSS.escape(copy.id) + '"]')?.focus();
    toast('Копия добавлена в подготовку');
  }
  if (k === 'delete-board') {
    const current = store.boards.find(item => item.id === v);
    const selected = current || store.history.find(item => item.id === v);
    if (!selected) return;
    const afterDelete = () => {
      dialog.close();
      if (current && !store.boards.length) navigate('board');
      else {
        render();
        root.querySelector('.board-filters [aria-current]')?.focus();
      }
    };
    confirmAction('Удалить «' + selected.title + '»?', 'Доска и её отметки будут удалены. Цветы, уже находящиеся в корзинке и гербарии, останутся.', 'Удалить', async () => {
      if (await save(draft => removeBoard(draft, v), null, false, afterDelete)) afterDelete();
    });
  }
  if (k === 'cycle-summary') {
    const selected = store.history.find(item => item.id === v);
    if (selected) modal('Итог цикла «' + selected.title + '»', cycleSummary(selected));
  }
  if (k === 'repeat') {
    const archived = store.history.find(x => x.id === v);
    if (!archived) return;
    const trigger = root.querySelector('[data-do="repeat:' + CSS.escape(v) + '"]');
    if (trigger?.disabled) return;
    if (trigger) trigger.disabled = true;
    const next = repeatBoard(archived);
    if (!await save(draft => {
      draft.boards.unshift(next);
      draft.active = next.id;
    })) return;
    hint = false;
    navigate('board');
  }
  if (k === 'board-png') {
    const selected = v ? store.boards.find(item => item.id === v) : b;
    if (selected) await exportModal(selected);
  }
  if (k === 'archive-png') {
    const archived = store.history.find(item => item.id === v);
    if (archived) await exportModal(archived);
  }
  if (k === 'backup') download(new Blob([JSON.stringify(store, null, 2)], {
    type: 'application/json'
  }), 'Bingo-Bloom.json');
  if (k === 'reset') confirmAction('Сбросить весь прогресс?', 'Удалить все доски, корзинку, книгу и историю с этого устройства?', 'Продолжить', () => {
    confirmAction('Подтвердите удаление', 'Восстановление возможно только из ранее экспортированной копии.', 'Удалить весь прогресс', () => replaceStudio(newStudio()));
  });
}
root.addEventListener('change', async e => {
  if (e.target.id === 'plant-note' && await noteWrites.get(e.target) && e.target.isConnected) {
    toast('Заметка сохранена на устройстве');
  }
  if (e.target.id === 'line-hint') {
    hint = e.target.checked;
    highlight();
  }
});
dialog.addEventListener('change', async e => {
  if (e.target.id === 'large-field') {
    largeField = e.target.checked;
    try { localStorage.setItem(largeFieldKey, largeField ? '1' : '0'); }
    catch { toast('Режим изменён до закрытия страницы. Настройку не удалось сохранить.'); }
    render();
  }
  if (['duration', 'grid-size'].includes(e.target.id)) {
    const control = e.target.id, value = e.target.value;
    if (!await save((_, b) => {
      if (control === 'duration') { b.durationLabel = value; return; }
      resizeBoard(b, Number(value));
      // A geometry change alone must not mint another flower when a cell is rechecked.
      if (b.started) b.legacyLines = [...new Set([...b.legacyLines, ...lineIds(b).map(line => lineKey(line, b.size))])];
    })) return;
    render();
    document.getElementById(control)?.focus({preventScroll:true});
  }
});
root.addEventListener('input', e => {
  if (e.target.id === 'plant-note') {
    const uid = e.target.dataset.id, note = e.target.value;
    noteWrites.set(e.target, save(draft => {
      const plant = draft.book.find(p => p.uid === uid);
      if (plant) plant.note = note;
    }, null, true));
  }
});
function refreshPeriodStatus() {
  const status=$('#period-status');
  if(status)status.textContent=periodStatus(boardPeriod(board()));
}
setInterval(refreshPeriodStatus,60000);
document.addEventListener('visibilitychange',refreshPeriodStatus);
if (page() === 'book') readBook('board');
render();
if (page() === 'basket') focusBasket(window.history.state?.basketEntry?.uid);
if (progressStore.raw === null) await save();
