import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {themes} from '../public/styles/tokens.js';
import {calendarRange, formatPeriod} from '../public/game/calendar.js';
import {syncKit, themeSheet} from '../scripts/design.js';

test('CSS and all sixteen editable palette swatches follow the shared theme roles', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(read('../public/styles/themes.css'), themeSheet());
  const kit = read('../design/Bingo-Bloom-UI-kit.svg');
  assert.equal(syncKit(kit), kit);
  for (const [id,palette] of Object.entries(themes)) {
    for (const role of ['paper','card','accent','ink']) {
      assert.ok(kit.includes('data-swatch="' + id + '.' + role + '"'));
      assert.ok(kit.includes('>' + palette[role].toUpperCase() + '</text>'));
    }
  }
});

test('Visible calendar days follow the exact exclusive deadline', () => {
  const start = new Date(2026, 9, 12, 15), end = new Date(2026, 9, 19, 15);
  assert.match(calendarRange({start,end}), /19/);
  assert.match(formatPeriod({start,end}), /15:00/);
  end.setHours(0);
  assert.match(calendarRange({start,end}), /18/);
});
