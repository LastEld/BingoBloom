import { createBoard, lineIds, allLines, uid, themes, animations, templates, covers } from './board.js';
export const capacity = 6;
export const species = {
  daisy: {
    name: 'Ромашка',
    latin: 'Matricaria chamomilla',
    description: 'Тонкие рассечённые листья и белый венчик вокруг золотистой сердцевины.'
  },
  cornflower: {
    name: 'Василёк',
    latin: 'Centaurea cyanus',
    description: 'Синие краевые цветки расходятся звёздами над узкими серебристыми листьями.'
  },
  poppy: {
    name: 'Мак',
    latin: 'Papaver rhoeas',
    description: 'Алые лепестки похожи на тонкую бумагу. Нераскрывшийся бутон склоняется на гибком стебле.'
  },
  clover: {
    name: 'Клевер',
    latin: 'Trifolium pratense',
    description: 'Розовая головка собрана из множества маленьких цветков. Листья растут по три.'
  }
};
export const coord = (i, n) => String.fromCharCode(65 + i % n) + (1 + Math.floor(i / n));
export const lineKey = (line, n) => line.map(i => coord(i, n)).join('–');
const now = () => new Date().toISOString();
const defaults = {
  seedMode: 'auto',
  manualSeed: '',
  coordinates: true,
  simpleMotion: false
};

export function newStudio() {
  const b = createBoard();
  return {
    version: 2,
    active: b.id,
    boards: [b],
    basket: [],
    book: [],
    history: [],
    settings: {
      ...defaults
    },
    sound: false
  };
}

export function startBoard(b, settings) {
  if (b.started) return;
  b.started = true;
  b.startedAt = now();
  b.boardSeed = settings.seedMode === 'manual' && settings.manualSeed.trim() || uid();
}

export function completeCell(store, b, index) {
  if (!b.started || !b.cells[index] || b.cells[index].done) return {
    added: 0
  };
  const cell = b.cells[index];
  cell.done = Date.now();
  const lines = allLines(b);
  const known = new Set([...b.harvest.map(p => p.sourceLine), ...b.legacyLines]);
  const fresh = lines.filter(line => line.includes(index) && line.every(i => b.cells[i].done) && !known.has(lineKey(line, b.size)));
  if (store.basket.length + fresh.length > capacity) {
    cell.done = 0;
    return {
      added: 0,
      needed: store.basket.length + fresh.length - capacity
    };
  }
  for (const line of fresh) {
    const sourceLine = lineKey(line, b.size);
    const order = lines.findIndex(candidate => candidate === line);
    const speciesId = Object.keys(species)[order % 4];
    const seed = b.boardSeed + '/' + sourceLine;
    const plant = {
      uid: uid(),
      speciesId,
      seed,
      formVersion: 2,
      state: 'fresh',
      collectedAt: now(),
      pressedAt: null,
      sourceBoardId: b.id,
      sourceBoardTitle: b.title,
      sourceLine,
      note: ''
    };
    b.harvest.push({
      uid: plant.uid,
      speciesId,
      seed,
      sourceLine
    });
    store.basket.push(plant);
  }
  return {
    added: fresh.length
  };
}

export function pressPlant(store, id) {
  const i = store.basket.findIndex(p => p.uid === id);
  if (i < 0) return null;
  const [plant] = store.basket.splice(i, 1);
  plant.state = 'pressed';
  plant.pressedAt = now();
  store.book.push(plant);
  return plant;
}

export function repeatBoard(b) {
  const copy = createBoard(b.template, b.size, b.title);
  Object.assign(copy, {
    subtitle: b.subtitle,
    bonus: b.bonus,
    theme: b.theme,
    animation: b.animation,
    durationLabel: b.durationLabel,
    cover: b.cover || 'glasshouse',
    cells: b.cells.map(c => ({
      ...c,
      id: uid(),
      done: 0
    }))
  });
  return copy;
}

export function finishBoard(store, b, next = repeatBoard(b)) {
  if (!b.started || !store.boards.includes(b)) return;
  b.finishedAt = now();
  store.history.unshift(b);
  store.boards.splice(store.boards.indexOf(b), 1, next);
  store.active = next.id;
}
const fail = () => {
  throw Error('Файл не содержит корректного сохранения Bingo Bloom.');
};
const check = condition => {
  if (!condition) fail();
};
const str = v => typeof v === 'string';
const id = v => str(v) && /^[\w-]+$/.test(v);
const date = v => str(v) && Number.isFinite(Date.parse(v));
const unique = items => new Set(items).size === items.length;

function validCell(c) {
  check(c && id(c.id) && str(c.task) && str(c.reward) && str(c.icon) && Number.isInteger(c.color) && c.color >= 0 && c.color < 9 && Number.isFinite(c.done) && c.done >= 0);
}

function validEntry(p) {
  check(p && id(p.uid) && Object.hasOwn(species, p.speciesId) && (str(p.seed) && p.seed.length > 0 || Number.isFinite(p.seed)) && str(p.sourceLine));
}

function validateBoard(b, legacy) {
  check(b && id(b.id) && [3, 4, 5].includes(b.size) && str(b.title) && str(b.subtitle) && str(b.bonus) && (b.template === 'blank' || Object.hasOwn(templates, b.template)) && Object.hasOwn(themes, b.theme) && Object.hasOwn(animations, b.animation));
  check(Array.isArray(b.cells) && b.cells.length === b.size * b.size);
  b.cells.forEach(validCell);
  b.cover ??= 'glasshouse';
  check(Object.hasOwn(covers, b.cover));
  if (b.overflow !== undefined) {
    check(Array.isArray(b.overflow));
    b.overflow.forEach(validCell);
  }
  if (legacy) {
    b.started ??= b.cells.some(c => c.done);
    b.boardSeed = b.id;
    b.durationLabel = {
      3: 'На неделю',
      4: 'На две недели',
      5: 'На месяц'
    }[b.size];
    b.harvest = [];
    b.legacyLines = lineIds(b).map(line => lineKey(line, b.size));
    b.startedAt = b.started ? new Date(b.created).toISOString() : null;
  }
  check(typeof b.started === 'boolean' && str(b.boardSeed) && str(b.durationLabel) && Array.isArray(b.harvest) && Array.isArray(b.legacyLines) && b.legacyLines.every(str));
  check(!b.started || date(b.startedAt));
  b.calendarStart ??= new Date(b.startedAt || b.created).toISOString();
  b.calendarHidden ??= false;
  check(date(b.calendarStart) && typeof b.calendarHidden === 'boolean');
  b.harvest.forEach(validEntry);
}

export function decodeStudio(raw) {
  const s = JSON.parse(raw);
  check(s && Array.isArray(s.boards) && s.boards.length && s.boards.some(b => b.id === s.active));
  const legacy = s.version === undefined || s.version === 1;
  check(legacy || s.version === 2);
  if (legacy) Object.assign(s, {
    version: 2,
    basket: [],
    book: [],
    history: [],
    settings: {
      ...defaults
    }
  });
  check(Array.isArray(s.history) && Array.isArray(s.book) && Array.isArray(s.basket) && s.basket.length <= capacity);
  const boards = [...s.boards, ...s.history];
  boards.forEach(b => validateBoard(b, legacy));
  check(unique(boards.map(b => b.id)));
  s.history.forEach(b => check(b.started && date(b.finishedAt)));
  for (const [list, state] of [[s.basket, 'fresh'], [s.book, 'pressed']]) {
    for (const p of list) {
      validEntry(p);
      check([undefined, 1, 2].includes(p.formVersion));
      check(p.state === state && date(p.collectedAt) && id(p.sourceBoardId) && str(p.sourceBoardTitle) && str(p.note) && (state === 'fresh' ? p.pressedAt === null : date(p.pressedAt)));
    }
  }
  check(unique([...s.book, ...s.basket].map(p => p.uid)));
  const o = s.settings;
  check(o && ['auto', 'manual'].includes(o.seedMode) && str(o.manualSeed) && typeof o.coordinates === 'boolean' && typeof o.simpleMotion === 'boolean' && typeof s.sound === 'boolean');
  return s;
}
