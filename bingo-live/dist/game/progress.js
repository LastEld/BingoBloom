import { createBoard, lineIds, allLines, uid, themes, animations, templates, covers, periods } from './board.js';
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

export function emptyStudio() {
  return {
    version: 2,
    active: null,
    boards: [],
    basket: [],
    book: [],
    history: [],
    settings: {
      ...defaults
    },
    sound: false
  };
}

export function newStudio() {
  const b = createBoard();
  return {...emptyStudio(), active: b.id, boards: [b], guideId: b.id};
}

export function startBoard(b, settings) {
  if (b.started) return;
  b.started = true;
  b.startedAt = now();
  b.boardSeed = settings.seedMode === 'manual' && settings.manualSeed.trim() || uid();
}

export function completeCell(store, b, index) {
  return completeCells(store, b, [index]);
}

export function completeCells(store, b, indices) {
  const selected = new Set(indices);
  if (!b.started || !selected.size || [...selected].some(index => !Number.isInteger(index) || !b.cells[index] || b.cells[index].done)) return {
    added: 0, awards: []
  };
  const lines = allLines(b);
  const known = new Set([...b.harvest.map(p => p.sourceLine), ...b.legacyLines]);
  const fresh = lines.filter(line => line.some(i => selected.has(i)) &&
    line.every(i => selected.has(i) || b.cells[i].done) && !known.has(lineKey(line, b.size)));
  const free = capacity - store.basket.length;
  if (fresh.length > free) {
    return {
      added: 0, awards: [],
      needed: fresh.length - free, required: fresh.length, free
    };
  }
  const completedAt = Date.now();
  for (const index of selected) b.cells[index].done = completedAt;
  const awards = [];
  for (const line of fresh) {
    const sourceLine = lineKey(line, b.size);
    const order = lines.findIndex(candidate => candidate === line);
    const speciesId = Object.keys(species)[order % 4];
    const seed = b.boardSeed + '/' + sourceLine;
    const plantId = uid();
    const plant = {
      uid: plantId,
      collectionId: awards[0]?.uid ?? plantId,
      speciesId,
      seed,
      formVersion: 3,
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
    awards.push({uid: plant.uid, sourceLine, cellIndices: line});
  }
  return {
    added: awards.length, awards
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
  const freshCell = cell => ({...cell, id: uid(), done: 0});
  Object.assign(copy, {
    subtitle: b.subtitle,
    bonus: b.bonus,
    theme: b.theme,
    animation: b.animation,
    durationLabel: b.durationLabel,
    cover: b.cover || 'glasshouse',
    cells: b.cells.map(freshCell)
  });
  if (b.overflow) copy.overflow = b.overflow.map(freshCell);
  return copy;
}

export function duplicateDraft(board) {
  const copy = repeatBoard(board);
  copy.title = board.title + ' — копия';
  return copy;
}

export function removeBoard(store, boardId) {
  const list = store.boards.some(board => board.id === boardId) ? store.boards : store.history;
  const index = list.findIndex(board => board.id === boardId);
  if (index < 0) return;
  list.splice(index, 1);
  for (const plant of [...store.basket, ...store.book]) {
    if (plant.sourceBoardId === boardId) plant.sourceBoardDeleted = true;
  }
  if (store.active === boardId) {
    store.active = (store.boards.find(board => board.started) || store.boards[0])?.id ?? null;
  }
}

export const sourceTitle = plant => plant.sourceBoardDeleted ? 'Удалённая доска' : plant.sourceBoardTitle;

export function finishBoard(store, b, next = repeatBoard(b)) {
  if (!b.started || !store.boards.includes(b)) return;
  b.finishedAt = now();
  store.history.unshift(b);
  store.boards.splice(store.boards.indexOf(b), 1, next);
  if (store.active === b.id) store.active = next.id;
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
const timestamp = v => Number.isFinite(v) && v >= 0 && Number.isFinite(new Date(v).getTime());
const unique = items => new Set(items).size === items.length;
const validLines = new Set([3, 4, 5].flatMap(size => allLines({size}).map(line => lineKey(line, size))));

function validCell(c) {
  check(c && id(c.id) && str(c.task) && str(c.reward) && str(c.icon) && Number.isInteger(c.color) && c.color >= 0 && c.color < 9 && timestamp(c.done));
}

function validEntry(p) {
  check(p && id(p.uid) && Object.hasOwn(species, p.speciesId) && (str(p.seed) && p.seed.length > 0 || Number.isFinite(p.seed)) && validLines.has(p.sourceLine));
}

function validateBoard(b, legacy) {
  check(b && id(b.id) && [3, 4, 5].includes(b.size) && str(b.title) && str(b.subtitle) && str(b.bonus) && (b.template === 'blank' || Object.hasOwn(templates, b.template)) && Object.hasOwn(themes, b.theme) && Object.hasOwn(animations, b.animation));
  check(timestamp(b.created) && Array.isArray(b.cells) && b.cells.length === b.size * b.size);
  b.cells.forEach(validCell);
  b.cover ??= 'glasshouse';
  check(Object.hasOwn(covers, b.cover));
  if (b.overflow !== undefined) {
    check(Array.isArray(b.overflow) && b.cells.length + b.overflow.length <= 25);
    b.overflow.forEach(validCell);
  }
  check(unique([...b.cells, ...(b.overflow || [])].map(c => c.id)));
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
  check(typeof b.started === 'boolean' && str(b.boardSeed) && periods.includes(b.durationLabel) && Array.isArray(b.harvest) && Array.isArray(b.legacyLines) && b.legacyLines.every(line => validLines.has(line)));
  check(b.started ? date(b.startedAt) : b.startedAt == null);
  b.calendarStart ??= new Date(b.startedAt || b.created).toISOString();
  b.calendarHidden ??= false;
  check(date(b.calendarStart) && typeof b.calendarHidden === 'boolean');
  b.harvest.forEach(validEntry);
  check(unique(b.harvest.map(p => p.sourceLine)));
}

export function decodeStudio(raw) {
  const s = JSON.parse(raw);
  check(s && Array.isArray(s.boards));
  const legacy = s.version === undefined || s.version === 1;
  check(legacy || s.version === 2);
  check(s.boards.length ? s.boards.some(b => b?.id === s.active) : !legacy && s.active === null);
  if (legacy) {
    check(s.basket === undefined && s.book === undefined && s.history === undefined);
    Object.assign(s, {
      version: 2,
      basket: [],
      book: [],
      history: [],
      settings: {...defaults}
    });
  }
  check(Array.isArray(s.history) && Array.isArray(s.book) && Array.isArray(s.basket) && s.basket.length <= capacity);
  const boards = [...s.boards, ...s.history];
  boards.forEach(b => validateBoard(b, legacy));
  check(unique(boards.map(b => b.id)));
  s.history.forEach(b => check(b.started && date(b.finishedAt)));
  const harvest = new Map();
  for (const board of boards) {
    for (const entry of board.harvest) {
      check(!harvest.has(entry.uid));
      harvest.set(entry.uid, {entry, board});
    }
  }
  for (const [list, state] of [[s.basket, 'fresh'], [s.book, 'pressed']]) {
    for (const p of list) {
      validEntry(p);
      check(p.collectionId === undefined || id(p.collectionId));
      check([undefined, 1, 2, 3].includes(p.formVersion));
      check(p.state === state && date(p.collectedAt) && id(p.sourceBoardId) && str(p.sourceBoardTitle) && str(p.note) && (state === 'fresh' ? p.pressedAt === null : date(p.pressedAt)));
      const source = harvest.get(p.uid);
      if (p.sourceBoardDeleted === true) {
        check(!source && !boards.some(board => board.id === p.sourceBoardId));
      } else {
        check(p.sourceBoardDeleted === undefined && source && source.board.id === p.sourceBoardId && source.entry.speciesId === p.speciesId && source.entry.sourceLine === p.sourceLine && source.entry.seed === p.seed);
      }
    }
  }
  check(unique([...s.book, ...s.basket].map(p => p.uid)));
  const o = s.settings;
  check(o && ['auto', 'manual'].includes(o.seedMode) && str(o.manualSeed) && typeof o.coordinates === 'boolean' && typeof o.simpleMotion === 'boolean' && typeof s.sound === 'boolean');
  if (!id(s.guideId)) delete s.guideId;
  return s;
}
