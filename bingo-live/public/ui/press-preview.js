import {drawSpecimen, preparePress} from '../plants/specimen.js';

// The receipt owns the animation. Leaving it never changes the saved plant.
export function showPressPreview(figure, plant, freshCanvas, simpleMotion) {
  const canvas = figure.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let finalFrame = simpleMotion || reduced.matches || document.hidden;
  let frame = 0, draw;

  function display(progress) {
    draw(progress);
    figure.style.setProperty('--pressed', String(progress));
    if (progress === 1) {
      events.abort();
      draw = null;
    }
  }
  function finish() {
    finalFrame = true;
    cancelAnimationFrame(frame);
    if (draw && figure.closest('dialog')?.open) display(1);
  }
  function cancel() {
    events.abort();
    cancelAnimationFrame(frame);
    draw = null;
    figure.remove();
  }
  const active = () => figure.isConnected && figure.closest('dialog')?.open;
  async function play() {
    if (finalFrame) {
      freshCanvas = null;
      figure.style.setProperty('--pressed', '1');
      await drawSpecimen(canvas, plant, {paper:true});
      return;
    }
    if (freshCanvas) canvas.getContext('2d', {willReadFrequently:true}).drawImage(freshCanvas, 0, 0, canvas.width, canvas.height);
    freshCanvas = null;
    const renderFrame = await preparePress(canvas, plant, {paper:true});
    if (!active()) return;
    draw = renderFrame;
    if (finalFrame) { display(1); return; }
    display(0);
    const started = performance.now();
    function advance(now) {
      if (!active()) { cancel(); return; }
      const progress = Math.min(1, Math.max(0, (now - started) / 1100));
      display(progress);
      if (progress < 1) frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
  }
  if (!finalFrame) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, {signal:events.signal});
    reduced.addEventListener('change', () => { if (reduced.matches) finish(); }, {signal:events.signal});
    window.addEventListener('pagehide', finish, {signal:events.signal});
  }
  play().catch(() => {
    if (active()) {
      figure.style.setProperty('--pressed', '1');
      canvas.replaceWith('Не удалось загрузить рисунок.');
    }
    events.abort();
  });
  return cancel;
}
