// Selection stays on the page. Only the explicit confirmation reaches the progress store.
export function bindGroupSelection(page, onConfirm) {
  const start = page.querySelector('[data-do="group-start"]');
  if (!start) return;
  const grid = page.querySelector('.task-grid');
  const panel = page.querySelector('.group-tools');
  const note = page.querySelector('.field-note');
  const originalNote = note.textContent;
  const confirm = panel.querySelector('[data-do="group-confirm"]');
  const cancel = panel.querySelector('[data-do="group-cancel"]');
  const count = panel.querySelector('.group-count');
  const error = panel.querySelector('.group-error');
  const selected = new Set();
  let gesture = null;
  let busy = false;

  function update() {
    count.textContent = 'Выбрано клеток: ' + selected.size;
    confirm.disabled = busy || !selected.size;
    cancel.disabled = busy;
  }

  function setSelected(tile, value) {
    if (!tile || tile.disabled || busy) return;
    const index = Number(tile.dataset.cell);
    if (selected.has(index) === value) return;
    if (value) selected.add(index);
    else selected.delete(index);
    tile.setAttribute('aria-pressed', String(value));
    error.replaceChildren();
    update();
  }

  function setActive(active) {
    gesture = null;
    selected.clear();
    error.replaceChildren();
    grid.classList.toggle('group-selecting', active);
    panel.hidden = !active;
    start.hidden = active;
    note.textContent = active
      ? 'Выберите задачи кнопками или проведите по клеткам. Повторное нажатие снимает выбор.'
      : originalNote;
    for (const tile of grid.querySelectorAll('[data-cell]')) {
      tile.disabled = active && tile.classList.contains('checked-task');
      if (active && !tile.disabled) tile.setAttribute('aria-pressed', 'false');
      else tile.removeAttribute('aria-pressed');
    }
    update();
    (active ? grid.querySelector('[data-cell]:not(:disabled)') || cancel : start).focus({preventScroll: true});
  }

  start.onclick = () => setActive(true);
  cancel.onclick = () => setActive(false);
  confirm.onclick = async () => {
    if (busy || !selected.size) return;
    busy = true;
    update();
    try {
      const message = await onConfirm([...selected]);
      if (message && panel.isConnected) error.textContent = message;
    } finally {
      busy = false;
      update();
    }
  };
  page.addEventListener('keydown', event => {
    if (!panel.hidden && !busy && event.key === 'Escape') {
      event.preventDefault();
      setActive(false);
    }
  });
  grid.addEventListener('click', event => {
    if (panel.hidden) return;
    event.stopPropagation();
    const tile = event.target.closest('[data-cell]');
    // Pointer input is handled below. Keyboard and assistive activation use click.
    if (tile && event.detail === 0) setSelected(tile, !selected.has(Number(tile.dataset.cell)));
  });
  grid.addEventListener('pointerdown', event => {
    const tile = event.target.closest('[data-cell]');
    if (panel.hidden || busy || gesture || event.button !== 0 || !event.isPrimary || !tile || tile.disabled) return;
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, tile, moved:false};
    grid.setPointerCapture(event.pointerId);
  });
  function move(event) {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    const distance = Math.hypot(dx, dy);
    if (!gesture.moved && distance < 6) return;
    setSelected(gesture.tile, true);
    gesture.moved = true;
    // Samples across frame gaps include intermediate cells during a quick swipe.
    const steps = Math.ceil(distance / 12);
    for (let step = 1; step <= steps; step++) {
      const x = gesture.x + dx * step / steps, y = gesture.y + dy * step / steps;
      const tile = document.elementFromPoint(x, y)?.closest('[data-cell]');
      if (tile && grid.contains(tile)) setSelected(tile, true);
    }
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  }
  grid.addEventListener('pointermove', move);
  grid.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    move(event);
    if (!gesture.moved) setSelected(gesture.tile, !selected.has(Number(gesture.tile.dataset.cell)));
    gesture = null;
  });
  grid.addEventListener('lostpointercapture', event => {
    if (gesture?.id === event.pointerId) gesture = null;
  });
}
