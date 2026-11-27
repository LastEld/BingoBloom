import { capacity } from '../game/progress.js';
import { icon } from './icons.js';

let active;

function viewport() {
  const head = document.querySelector('#head')?.getBoundingClientRect();
  const nav = document.querySelector('#head nav')?.getBoundingClientRect();
  return {
    top: head && head.top <= 0 ? Math.max(0, head.bottom) : 0,
    bottom: nav && nav.top > innerHeight / 2 && nav.bottom <= innerHeight ? nav.top : innerHeight
  };
}

function visibleInViewport(element, bounds) {
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
  const top = Math.max(bounds.top, rect.top), bottom = Math.min(bounds.bottom, rect.bottom);
  return right - left >= 8 && bottom - top >= 8;
}

function basketNotice(awards, store, onBasket) {
  const count = awards.length;
  const flowers = count === 1 ? 'новый цветок' : count < 5 ? 'новых цветка' : 'новых цветов';
  const text = `${count} ${flowers} · Корзинка ${store.basket.length}/${capacity}`;
  const notice = document.createElement('div');
  notice.className = 'harvest-notice';
  notice.innerHTML = `<button type="button" class="harvest-open">${icon('flower', 17)}<span></span></button>
    <button type="button" class="harvest-dismiss" aria-label="Закрыть уведомление о сборе">${icon('close', 16)}</button>`;
  notice.querySelector('span').textContent = text;
  notice.querySelector('.harvest-open').onclick = () => {
    clearHarvest();
    onBasket(awards[0].uid);
  };
  notice.querySelector('.harvest-dismiss').onclick = () => {
    const origin = active?.returnFocus;
    clearHarvest();
    if (origin?.isConnected) origin.focus({preventScroll: true});
  };
  return {notice, text};
}

function positionNotice(run) {
  const bounds = viewport();
  run.notice.hidden = visibleInViewport(run.count, bounds);
  if (run.notice.hidden) return;

  // Leave the last tile and the navigation usable while the result stays on screen.
  const inset = Math.max(10, innerHeight - bounds.bottom + 8);
  run.notice.style.bottom = `max(${inset}px, env(safe-area-inset-bottom))`;
  const noticeRect = run.notice.getBoundingClientRect();
  const tile = run.lastCell.getBoundingClientRect();
  if (noticeRect.top < tile.bottom && noticeRect.bottom > tile.top &&
      noticeRect.left < tile.right && noticeRect.right > tile.left) {
    const top = Math.max(bounds.top + 4, tile.top - noticeRect.height - 6);
    run.notice.style.bottom = `${innerHeight - top - noticeRect.height}px`;
  }
}

export function clearHarvest() {
  if (!active) return;
  const run = active;
  active = null;
  run.controller.abort();
  run.notice.remove();
  run.status.remove();
}

export function playHarvest(awards, store, onBasket) {
  clearHarvest();
  if (!awards?.length) return;
  const grid = document.querySelector('.task-grid');
  const count = document.querySelector('.basket-panel .count');
  if (!grid || !count || document.querySelector('dialog[open]')) return;
  const cells = [...grid.querySelectorAll('[data-cell]')];
  const plants = new Set(store.basket.map(plant => plant.uid));
  const fresh = awards.filter(award => plants.has(award.uid));
  if (!fresh.length || !cells.length) return;

  const {notice, text} = basketNotice(fresh, store, onBasket);
  const status = document.createElement('div');
  status.className = 'harvest-status';
  status.setAttribute('role', 'status');
  const run = active = {
    controller: new AbortController(), count, notice, status,
    returnFocus: grid.contains(document.activeElement) ? document.activeElement : cells[fresh[0].cellIndices[0]],
    lastCell: cells.at(-1)
  };
  const {signal} = run.controller;
  document.body.append(notice, status);
  status.textContent = text;
  positionNotice(run);
  window.addEventListener('resize', () => positionNotice(run), {signal});
  window.addEventListener('scroll', () => positionNotice(run), {signal, passive: true});
  window.addEventListener('pagehide', clearHarvest, {signal});
  window.addEventListener('hashchange', clearHarvest, {signal});
}
