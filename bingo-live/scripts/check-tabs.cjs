// Optional real-browser regression. Run against a local Bingo Bloom server.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function checkRace(browser, url, order) {
  const context = await browser.newContext();
  try {
    const tabs = [await context.newPage(), await context.newPage()];
    await tabs[0].goto(url);
    await tabs[0].waitForFunction(() => localStorage.getItem('bingo-bloom.studio.v1'));
    await tabs[0].evaluate(async () => {
      const { openProgress } = await import('/game/storage.js');
      const { startBoard } = await import('/game/progress.js');
      const result = await openProgress().commit(state => startBoard(state.boards[0], state.settings));
      if (result.status !== 'saved') throw Error(result.status);
    });
    await tabs[1].goto(url);
    await Promise.all(tabs.map(tab => tab.evaluate(async () => {
      const { openProgress } = await import('/game/storage.js');
      const { completeCell } = await import('/game/progress.js');
      const view = openProgress();
      window.playCell = async index => {
        const result = await view.commit(state => completeCell(state, state.boards[0], index));
        return result.status;
      };
    })));
    const move = i => tabs[i].evaluate(index => window.playCell(index), i);
    const result = order === null ? await Promise.all([move(0), move(1)]) : [await move(order), await move(1-order)];
    assert.deepEqual([...result].sort(), ['conflict', 'saved']);
    const loser = order === null ? result.indexOf('conflict') : 1-order;
    assert.equal(await move(loser), 'saved');
    await tabs[loser].reload();
    const marked = await tabs[loser].evaluate(() => JSON.parse(localStorage.getItem('bingo-bloom.studio.v1'))
      .boards[0].cells.map(cell => Boolean(cell.done)));
    assert.deepEqual(marked.slice(0, 2), [true, true]);
    assert.equal(marked.filter(Boolean).length, 2);
  } finally {
    await context.close();
  }
}

async function main() {
  const url = process.env.BINGO_URL || 'http://localhost:5173';
  const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || undefined});
  try {
    for (const order of [0, 1, null]) await checkRace(browser, url, order);
    console.log('Both write orders and simultaneous moves retained both cells after retry and reload.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
