import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composition} from '../public/plants/parts.js';
import {growV3, shootProfiles} from '../public/plants/growth-v3.js';

const catalog = JSON.parse(readFileSync(new URL('../public/assets/plants/catalog.json', import.meta.url)));
const samples = readFileSync(new URL('../design/agent-handoff/growth-v3-samples.csv', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).slice(1);

for (const [kind, parts] of Object.entries(catalog)) {
  test(kind + ' reproduces 100 v3 models in reverse order at fixed scale', t => {
    const models = Array.from({length: 100}, (_, i) => composition(parts, 'garden-' + i, 3));
    const [low, high] = shootProfiles[kind].bloom;
    const bins = [0, 0, 0], specimens = [];
    for (let i = 99; i >= 0; i--) {
      const m = models[i], seed = 'garden-' + i;
      assert.deepEqual(composition(parts, seed, 3), m);
      const terminal = m.flowers[0];
      const width = terminal.height * terminal.part.width / terminal.part.height;
      assert.ok(width >= low && width < high);
      bins[Math.floor((width - low) / (high - low) * 3)]++;
      const branches = m.flowers.length - 1;
      const buds = m.flowers.filter(f => f.part.file.includes('-buds-')).length;
      const shoot = m.stem.growthNodes.reduce((sum, [x, y], j, nodes) => {
        if (!j) return sum;
        const [px, py] = nodes[j - 1];
        return sum + Math.hypot((x - px) * m.stemW, (y - py) * m.stemH);
      }, 0);
      assert.ok(samples.includes([kind, seed, width.toFixed(2), shoot.toFixed(2), branches, buds].join(',')));
      specimens.push({seed, width, shoot, branches, buds});

      for (const organ of [...m.leaves, ...m.flowers]) {
        assert.ok(organ.x !== organ.base.x || organ.y !== organ.base.y);
        assert.ok(organ.anchorX > 0 && organ.anchorX < 1 && organ.anchorY > 0 && organ.anchorY < 1);
        assert.ok(organ.thickness > 0 && Number.isFinite(organ.control2.y));
        assert.ok(m.stem.growthNodes.some(([x, y]) =>
          Math.abs(m.x + x*m.stemW - organ.base.x) < 1e-8 &&
          Math.abs(m.y + y*m.stemH - organ.base.y) < 1e-8));
      }
    }
    assert.ok(bins.every(n => n > 0) && bins[1] > bins[0] && bins[1] > bins[2]);
    assert.ok(new Set(specimens.map(s => s.branches)).size >= 3);
    assert.ok(new Set(specimens.map(s => s.buds)).size >= 2);
    specimens.sort((a,b) => a.width - b.width);
    t.diagnostic('Small / middle / large bins: ' + bins.join(' / ') +
      '. Examples: ' + [specimens[0], specimens[50], specimens[99]].map(s =>
        s.seed + ' (' + s.width.toFixed(2) + ' wide, shoot ' + s.shoot.toFixed(2) +
        ', branches ' + s.branches + ', buds ' + s.buds + ')').join(', '));
  });
}

test('changing pigment and mounting randomness preserves every v3 shoot and socket', () => {
  for (const parts of Object.values(catalog)) {
    const stable = growV3(parts, () => .46, () => .2, () => .1);
    const different = growV3(parts, () => .46, () => .8, () => .9);
    const {hue, light, tapes, petals, ...shape} = stable;
    const {hue: newHue, light: newLight, tapes: newTapes, petals: newPetals, ...newShape} = different;
    assert.deepEqual(shape, newShape);
    assert.notEqual(hue, newHue);
    assert.notEqual(light, newLight);
    assert.notDeepEqual(tapes, newTapes);
    assert.notDeepEqual(petals, newPetals);
  }
});
