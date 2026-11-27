import {readFile, writeFile} from 'node:fs/promises';
import {journal, themes} from '../public/styles/tokens.js';

const sheetFile = new URL('../public/styles/themes.css', import.meta.url);
const kitFile = new URL('../design/Bingo-Bloom-UI-kit.svg', import.meta.url);

export function themeSheet() {
  const blocks = [];
  for (const [id, palette] of Object.entries(themes)) {
    const base = id === 'matcha';
    const roles = Object.entries(palette).filter(([role]) => role !== 'name');
    if (base) {
      for (const [key, value] of Object.entries(journal)) roles.push(['journal-' + key, value]);
    }
    const selector = base ? ':root' : ':root[data-theme="' + id + '"]';
    blocks.push(selector + ' {\n' + roles.map(([k,v]) => '  --' + k + ': ' + v + ';').join('\n') + '\n}');
  }
  return '/* Generated from tokens.js by npm run build. */\n' + blocks.join('\n\n') + '\n';
}

export function syncKit(svg) {
  const palettes = {journal, ...themes};
  function value(key) {
    const [palette, role] = key.split('.');
    const color = palettes[palette]?.[role];
    if (!color) throw new Error('Unknown design token ' + key);
    return color;
  }
  // Keep geometry and all unbound attributes directly editable in the SVG.
  return svg.replace(/<[^!?/][^<>]*>/g, tag => {
    for (const [, attribute, key] of tag.matchAll(/data-(fill|stroke)="([\w.]+)"/g)) {
      tag = tag.replace(new RegExp(' ' + attribute + '="[^"]*"'), ' ' + attribute + '="' + value(key) + '"');
    }
    return tag;
  }).replace(/(<text\b[^>]*data-swatch="([\w.]+)"[^>]*>)[^<]*(<\/text>)/g,
    (_, start, key, end) => start + value(key).toUpperCase() + end);
}

export async function syncDesignFiles() {
  const svg = await readFile(kitFile, 'utf8');
  const next = syncKit(svg);
  if (next !== svg) await writeFile(kitFile, next);
  await writeFile(sheetFile, themeSheet());
}
