import { capacity } from '../game/progress.js';
import { drawSpecimen } from '../plants/specimen.js';
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

function visibleCenter(element, bounds) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
  const top = Math.max(bounds.top, rect.top), bottom = Math.min(bounds.bottom, rect.bottom);
  return right - left >= 8 && bottom - top >= 8 ? {x: (left + right) / 2, y: (top + bottom) / 2} : null;
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

function positionTarget(run) {
  const bounds = viewport();
  const countPoint = visibleCenter(run.count, bounds);
  run.notice.hidden = Boolean(countPoint);
  if (countPoint) return countPoint;

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
  return visibleCenter(run.notice.querySelector('.harvest-open'), bounds);
}

export function clearHarvest() {
  if (!active) return;
  const run = active;
  active = null;
  run.controller.abort();
  run.animation?.cancel();
  clearTimeout(run.timer);
  run.flyer?.remove();
  run.notice.remove();
  run.status.remove();
  run.count.classList.remove('harvest-count');
  run.lines.flat().forEach(cell => cell.classList.remove('harvest-line'));
}

async function fly(run, plant, cells) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 198;
  canvas.className = 'harvest-flyer';
  canvas.dataset.plant = plant.uid;
  canvas.setAttribute('aria-hidden', 'true');
  try {
    await drawSpecimen(canvas, plant);
  } catch {
    return;
  }
  if (active !== run || run.static) return;

  const bounds = viewport();
  const points = cells.map(cell => visibleCenter(cell, bounds)).filter(Boolean);
  const end = positionTarget(run);
  if (!points.length || !end) return;
  const start = points.reduce((p, point) => ({x: p.x + point.x / points.length, y: p.y + point.y / points.length}), {x: 0, y: 0});
  const pose = (x, y, angle, scale) => `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${scale})`;
  const lift = Math.min(42, Math.max(0, start.y - bounds.top - 24));
  const high = start.y - lift;
  const frames = [
    {transform: pose(start.x, start.y, -9, .7), opacity: 0, offset: 0},
    {transform: pose(start.x, high, -6, 1), opacity: 1, offset: .19},
    {transform: pose(start.x, high, -6, 1), opacity: 1, offset: .25}
  ];
  // Sample a quadratic arc from the hovering flower to the basket.
  const controlY = Math.max(bounds.top + 16, Math.min(high, end.y) - 54);
  for (let step = 1; step <= 12; step++) {
    const t = step / 12;
    const x = start.x + (end.x - start.x) * t;
    const y = (1 - t) ** 2 * high + 2 * (1 - t) * t * controlY + t ** 2 * end.y;
    frames.push({transform: pose(x, y, -6 + 19 * t, 1 - .7 * t * t), opacity: 1 - t ** 6, offset: .25 + .60 * t});
  }
  frames.push({...frames.at(-1), offset: 1});
  run.flyer = canvas;
  document.body.append(canvas);
  run.animation = canvas.animate(frames, {delay: 120, duration: 600, fill: 'both'});
  await run.animation.finished.catch(() => {});
  canvas.remove();
  run.flyer = null;
}

export async function playHarvest(awards, store, onBasket) {
  clearHarvest();
  if (!awards?.length) return;
  const grid = document.querySelector('.task-grid');
  const count = document.querySelector('.basket-panel .count');
  if (!grid || !count || document.querySelector('dialog[open]')) return;
  const cells = [...grid.querySelectorAll('[data-cell]')];
  const plants = new Map(store.basket.map(plant => [plant.uid, plant]));
  const fresh = awards.filter(award => plants.has(award.uid));
  if (!fresh.length || !cells.length) return;

  const {notice, text} = basketNotice(fresh, store, onBasket);
  const status = document.createElement('div');
  status.className = 'harvest-status';
  status.setAttribute('role', 'status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const run = active = {
    controller: new AbortController(), count, notice, status,
    returnFocus: grid.contains(document.activeElement) ? document.activeElement : cells[fresh[0].cellIndices[0]],
    lastCell: cells.at(-1), lines: fresh.map(award => award.cellIndices.map(i => cells[i]).filter(Boolean)),
    static: store.settings.simpleMotion || motion.matches || !Element.prototype.animate
  };
  const {signal} = run.controller;
  document.body.append(notice, status);
  status.textContent = text;
  count.classList.add('harvest-count');
  positionTarget(run);
  window.addEventListener('resize', clearHarvest, {signal});
  window.addEventListener('pagehide', clearHarvest, {signal});
  window.addEventListener('hashchange', clearHarvest, {signal});
  const showLines = () => {
    if (run.settled) return;
    run.static = true;
    run.animation?.cancel();
    run.lines.flat().forEach(cell => cell.classList.add('harvest-line'));
  };
  motion.addEventListener('change', showLines, {signal});
  window.addEventListener('scroll', () => {
    showLines();
    positionTarget(run);
  }, {signal, passive: true});
  if (run.static) showLines();
  for (const [i, award] of fresh.entries()) {
    if (run.static) break;
    const line = run.lines[i];
    line.forEach(cell => cell.classList.add('harvest-line'));
    await fly(run, plants.get(award.uid), line);
    if (active !== run) return;
    if (!run.static) line.forEach(cell => cell.classList.remove('harvest-line'));
  }
  run.timer = setTimeout(() => {
    run.settled = true;
    if (run.notice.hidden) clearHarvest();
    else {
      run.count.classList.remove('harvest-count');
      run.lines.flat().forEach(cell => cell.classList.remove('harvest-line'));
    }
  }, 1600);
}
