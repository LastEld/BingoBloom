import { STORE } from '../game/board.js';
import { icon } from './icons.js';

const messages = {
  scratch: 'Сотрите покрытие или откройте награду кнопкой',
  collected: 'Этот цветок уже в корзинке',
  press: 'Засушите цветок, чтобы сохранить его на листе книги'
};

// Each flag has its own key so concurrent tabs cannot overwrite another tip.
// Device preferences never take part in the game's save transaction.
export function guidePreferences(getStorage = () => localStorage) {
  const seen = new Set();
  const key = (id, name) => STORE + '.guide.' + id + '.' + name;
  function available(id, name) {
    if (!id || seen.has(key(id, name))) return false;
    try { return getStorage().getItem(key(id, name)) === null; }
    catch { return true; }
  }
  function mark(id, name) {
    if (!id) return;
    const flag = key(id, name);
    seen.add(flag);
    try { getStorage().setItem(flag, '1'); } catch { /* Continue in this session. */ }
  }
  return {available, mark};
}

export function contextTip(name) {
  return `<aside class="context-tip" data-tip="${name}"><span>${messages[name]}</span>
    <button type="button" class="quiet" data-do="dismiss-tip" aria-label="Закрыть подсказку">${icon('close', 14)}</button></aside>`;
}
