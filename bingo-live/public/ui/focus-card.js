import { reduced } from './effects.js';
const WIDTH = 420;
const HEIGHT = 370;

function paintFace(ctx, cell, picture, tone, ink, coord) {
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  glow.addColorStop(0, '#ffffff38');
  glow.addColorStop(1, '#74785812');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = .24;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.roundRect(11, 11, WIDTH - 22, HEIGHT - 22, 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = .15;
  for (let y = 6; y < HEIGHT; y += 6) {
    for (let x = y % 12 ? 2 : 5; x < WIDTH; x += 7) {
      ctx.fillStyle = ink;
      ctx.fillRect(x, y, .65, .65);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = 'italic 16px Georgia';
  ctx.fillText('Bingo Bloom', 27, 38);
  ctx.textAlign = 'right';
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillText(coord, WIDTH - 27, 37);
  ctx.textAlign = 'center';
  const pictureSize = 125;
  const top = (HEIGHT - pictureSize) / 2;
  if (picture?.naturalWidth) {
    ctx.drawImage(picture, (WIDTH - pictureSize) / 2, top, pictureSize, pictureSize);
  } else {
    ctx.font = pictureSize * .7 + 'px "Segoe UI Emoji", sans-serif';
    ctx.fillText(picture ? '✿' : cell.icon, WIDTH / 2, top + pictureSize * .78);
  }
  ctx.globalAlpha = .5;
  ctx.fillRect(WIDTH / 2 - 22, HEIGHT - 35, 44, 1);
  ctx.globalAlpha = 1;
}

export function liftCard(card, origin) {
  if (reduced() || !origin) return;
  const to = card.getBoundingClientRect();
  const x = origin.left + origin.width / 2 - to.left - to.width / 2;
  const y = origin.top + origin.height / 2 - to.top - to.height / 2;
  card.animate([{
    transform: 'translate(' + x + 'px,' + y + 'px) scale(' + origin.width / to.width + ',' + origin.height / to.height + ') rotate(-3deg)'
  }, {
    transform: 'translate(0,0) scale(1.02) rotate(.6deg)',
    offset: .77
  }, {
    transform: 'translate(0,0) scale(1) rotate(0deg)'
  }], {
    duration: 480,
    easing: 'cubic-bezier(.2,.72,.24,1)'
  });
}

export function scratchFace({
  canvas,
  openButton,
  cell,
  picture,
  tone,
  ink,
  coord,
  onThreshold,
  onDone,
  onRub
}) {
  const card = canvas.parentElement;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, WIDTH, HEIGHT, 22);
  ctx.clip();
  paintFace(ctx, cell, picture, tone, ink, coord);
  ctx.restore();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.lineWidth = 55;

  // Read a downsampled alpha mask so a high-DPI canvas stays responsive to touch.
  const mask = document.createElement('canvas');
  mask.width = mask.height = 40;
  const sampler = mask.getContext('2d', {
    willReadFrequently: true
  });
  let previous,
    pointer = null,
    phase = 'covered',
    skipWave = false,
    lastMeasure = 0,
    lastSound = 0;
  ctx.lineWidth = 52;
  function remainingInk() {
    sampler.clearRect(0, 0, mask.width, mask.height);
    sampler.drawImage(canvas, 0, 0, mask.width, mask.height);
    const pixels = sampler.getImageData(0, 0, mask.width, mask.height).data;
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) ink += pixels[i];
    return ink;
  }
  const originalInk = remainingInk();
  let revealFrame = 0;
  function showResult() {
    if (phase !== 'revealing') return;
    phase = 'done';
    cancelAnimationFrame(revealFrame);
    onDone();
  }
  function reveal() {
    // Freeze the exact brushwork. The wave travels from every existing opening.
    const face = document.createElement('canvas');
    face.width = canvas.width;
    face.height = canvas.height;
    face.getContext('2d').drawImage(canvas, 0, 0);
    const field = document.createElement('canvas');
    field.width = 168;
    field.height = 148;
    const w = field.width,
      h = field.height,
      fc = field.getContext('2d', {
        willReadFrequently: true
      });
    fc.drawImage(face, 0, 0, w, h);
    const original = fc.getImageData(0, 0, w, h).data;
    const distances = new Float32Array(w * h),
      softMask = fc.createImageData(w, h);
    for (let i = 0; i < distances.length; i++) {
      const x = (i % w + .5) * WIDTH / w,
        y = (Math.floor(i / w) + .5) * HEIGHT / h;
      const dx = Math.max(22 - x, 0, x - WIDTH + 22),
        dy = Math.max(22 - y, 0, y - HEIGHT + 22);
      const alpha = original[i * 4 + 3];
      distances[i] = alpha < 70 && dx * dx + dy * dy < 21 * 21 ? 0 : w + h;
    }
    // Two chamfer passes approximate Euclidean distance on a square-pixel grid.
    for (const direction of [1, -1]) {
      const start = direction === 1 ? 0 : distances.length - 1;
      for (let i = start; i >= 0 && i < distances.length; i += direction) {
        const x = i % w,
          up = i - direction * w,
          prev = i - direction;
        const hasPrev = direction === 1 ? x > 0 : x < w - 1;
        const hasNext = direction === 1 ? x < w - 1 : x > 0;
        let d = distances[i];
        if (hasPrev) d = Math.min(d, distances[prev] + 1);
        if (up >= 0 && up < distances.length) {
          d = Math.min(d, distances[up] + 1);
          if (hasPrev) d = Math.min(d, distances[up - direction] + Math.SQRT2);
          if (hasNext) d = Math.min(d, distances[up + direction] + Math.SQRT2);
        }
        distances[i] = d;
      }
    }
    let farthest = 0;
    for (let i = 0; i < distances.length; i++) if (original[i * 4 + 3]) farthest = Math.max(farthest, distances[i]);
    const start = performance.now(),
      duration = 2100,
      feather = 3;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    function expand(time) {
      if (phase !== 'revealing') return;
      if (reduced()) return showResult();
      const t = Math.min(1, (time - start) / duration);
      const radius = (farthest + feather) * t * t * (3 - 2 * t);
      for (let i = 0; i < distances.length; i++) {
        const coverage = Math.max(0, Math.min(1, (radius - distances[i]) / feather));
        const dissolve = coverage * coverage * (3 - 2 * coverage);
        softMask.data[i * 4 + 3] = 255 * dissolve;
      }
      fc.putImageData(softMask, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(face, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(field, 0, 0, canvas.width, canvas.height);
      if (t < 1) revealFrame = requestAnimationFrame(expand);
      else showResult();
    }
    revealFrame = requestAnimationFrame(expand);
  }
  async function complete(immediate) {
    if (immediate) skipWave = true;
    if (phase === 'revealing' && skipWave) return showResult();
    if (phase !== 'covered') return;
    phase = 'saving';
    card.classList.remove('scratching');
    const saved = await onThreshold();
    if (!saved || phase !== 'saving' || !canvas.isConnected) return;
    phase = 'revealing';
    if (skipWave || reduced()) showResult();
    else reveal();
  }
  function measure() {
    if (phase === 'covered' && remainingInk() <= originalInk / 2) complete(false);
  }
  function point(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * WIDTH / rect.width,
      y: (e.clientY - rect.top) * HEIGHT / rect.height
    };
  }
  function rub(a, b) {
    if (!reduced()) {
      card.style.setProperty('--brush-x', (100 * b.x / WIDTH) + '%');
      card.style.setProperty('--brush-y', (100 * b.y / HEIGHT) + '%');
      card.classList.add('scratching');
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const now = performance.now();
    if (now - lastSound > 145) {
      onRub();
      lastSound = now;
    }
    if (now - lastMeasure > 90) {
      lastMeasure = now;
      measure();
    }
  }
  canvas.onpointerdown = e => {
    if (phase !== 'covered' || pointer !== null || e.button !== 0) return;
    e.preventDefault();
    canvas.focus({
      preventScroll: true
    });
    pointer = e.pointerId;
    canvas.setPointerCapture(pointer);
    previous = point(e);
    rub({
      x: previous.x - .1,
      y: previous.y
    }, previous);
  };
  canvas.onpointermove = e => {
    if (phase !== 'covered' || e.pointerId !== pointer) return;
    const events = e.getCoalescedEvents?.();
    for (const sample of events?.length ? events : [e]) {
      if (phase !== 'covered') break;
      const current = point(sample);
      rub(previous, current);
      previous = current;
    }
  };
  function end(e) {
    if (e.pointerId !== pointer) return;
    pointer = null;
    card.classList.remove('scratching');
    measure();
  }
  canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = end;

  openButton.onclick = () => complete(true);
  canvas.onkeydown = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) complete(true);
  };
  return () => {
    phase = 'closed';
    card.classList.remove('scratching');
    cancelAnimationFrame(revealFrame);
  };
}
