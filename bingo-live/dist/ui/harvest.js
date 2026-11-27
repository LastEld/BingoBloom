import { esc } from '../game/board.js';
import { species } from '../game/progress.js';
import { specimenCanvas } from './herbarium-view.js';

const plurals = new Intl.PluralRules('ru');
const places = number => ({one: 'место', few: 'места', many: 'мест'}[plurals.select(number)] || 'мест');

export function capacityMessage(result) {
  return `Для новых цветов нужно ${result.required} ${places(result.required)}, свободно — ${result.free}. Освободите ещё ${result.needed} ${places(result.needed)} и вернитесь к задаче.`;
}

function lineLabel(indices, size) {
  const first = indices[0], last = indices.at(-1);
  if (Math.floor(first / size) === Math.floor(last / size)) return 'Строка ' + (Math.floor(first / size) + 1);
  if (first % size === last % size) return 'Столбец ' + String.fromCharCode(65 + first % size);
  return first === 0 ? 'Диагональ ↘' : 'Диагональ ↙';
}

export function harvestReceipt(store, board, awards) {
  const cards = awards.map(award => {
    const plant = store.basket.find(item => item.uid === award.uid);
    if (!plant) return '';
    return `<button type="button" class="harvest-item" data-do="basket:${esc(plant.uid)}">
      ${specimenCanvas(plant)}<span><strong>${species[plant.speciesId].name}</strong>
      <small>${lineLabel(award.cellIndices, board.size)} · ${esc(award.sourceLine)}</small>
      <small>Найти в корзинке →</small></span></button>`;
  }).join('');
  return `<section class="harvest-receipt"><h3>Сбор за линии</h3>${cards}
    <p>В корзинке ${store.basket.length} из 6</p></section>`;
}
