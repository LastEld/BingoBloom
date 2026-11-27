// Shared by the browser, canvas exports and the editable design kit.
export const journal = {
  paper: '#f7f3ea', sheet: '#f2ecde', ink: '#302c25', caption: '#403a32',
  olive: '#657054', line: '#d9cdb8', danger: '#924637', focus: '#245e80',
  sans: '"Segoe UI", Arial, sans-serif', serif: 'Georgia, "Times New Roman", serif'
};

const palettes = {
  matcha: {
    name: 'Matcha & Cream', paper: journal.paper, ink: journal.ink, accent: journal.olive,
    hero: '#e3ebd8', card: '#edf1e4', line: journal.line, panel: '#fffdf8',
    muted: journal.caption, reward: '#f6e8df', terra: '#88513c',
    tiles: ['#eaf0e2','#f6eadb','#e8edf0','#f2e6df','#ede8f1','#f5efd9','#e6eeea','#f3e5e3','#e9e9ef']
  },
  nordic: {
    name: 'Nordic Calm', paper: '#f4f6f7', ink: '#2b3b47', accent: '#466779',
    hero: '#dce7eb', card: '#e6edf0', line: '#cbd8de', panel: '#fbfcfd',
    muted: '#4d606c', reward: '#e5eaf0', terra: '#536a84',
    tiles: ['#dfe9e5','#efe8de','#dde8ee','#ece4df','#e5e5ee','#edead9','#dfebe8','#eee4e6','#e1e6ee']
  },
  lavender: {
    name: 'Soft Lavender', paper: '#faf6f7', ink: '#443746', accent: '#76556e',
    hero: '#e9e2ec', card: '#f0e8ef', line: '#dfd2dd', panel: '#fffbfd',
    muted: '#655566', reward: '#f1e4eb', terra: '#80546e',
    tiles: ['#e8ebdf','#f3e6dc','#e6e8f0','#f1e1dc','#eae1ef','#f3ecdb','#e4ece8','#f1e1e8','#e9e3ed']
  },
  dark: {
    name: 'Dark Cozy', paper: '#282825', ink: '#f3ede1', accent: '#b5c5a5',
    hero: '#353d32', card: '#3e473c', line: '#55594e', panel: '#30312d',
    muted: '#cecbbd', reward: '#463b34', terra: '#e2af93', focus: '#a5dcff', danger: '#ffbba8',
    tiles: ['#384636','#493f31','#374247','#493a32','#443b49','#46432f','#33443e','#483a39','#3d3d47']
  }
};

export const themes = Object.fromEntries(Object.entries(palettes).map(([id, {tiles, ...palette}]) => [
  id, {focus: journal.focus, danger: journal.danger, ...palette,
    ...Object.fromEntries(tiles.map((color, i) => ['tile' + i, color]))}
]));
