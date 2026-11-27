const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fixture = require('../design/agent-handoff/continuity.json');

async function check(browser, width, reducedMotion) {
  const context = await browser.newContext({
    viewport: {width, height: 850}, reducedMotion, serviceWorkers: 'block'
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(state => {
      localStorage.setItem('bingo-bloom.studio.v1', JSON.stringify(state));
    }, fixture);
    await page.goto(process.env.BINGO_URL || 'http://localhost:5173');
    await page.locator('[data-cell="0"]').click();
    const card = page.locator('.keepsake');
    const label = card.locator('.keepsake-back p');
    await card.evaluate(el => Promise.all(el.getAnimations().map(effect => effect.finished)));
    const box = await label.boundingBox();
    const clip = {x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height)};
    async function textChangesPixels() {
      const visible = await page.screenshot({clip});
      await label.evaluate(el => { el.style.visibility = 'hidden'; });
      const hidden = await page.screenshot({clip});
      await label.evaluate(el => { el.style.visibility = ''; });
      return !visible.equals(hidden);
    }
    assert.equal(await textChangesPixels(), false, 'The foil initially covers the reward');
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 2, y, {steps: 8});
    const glow = await card.evaluate(el => getComputedStyle(el, '::after').animationName);
    assert.equal(glow, reducedMotion === 'reduce' ? 'none' : 'scratch-glow');
    await page.mouse.up();
    assert.equal(await textChangesPixels(), true, 'The erased stripe shows the actual letters before completion');
    const marks = () => page.evaluate(() => JSON.parse(localStorage.getItem('bingo-bloom.studio.v1')).boards[0].cells[0].done);
    assert.equal(await marks(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await marks(), 0);
    await page.locator('[data-cell="0"]').click();
    await page.getByRole('button', {name: 'Открыть без стирания'}).click();
    await page.getByRole('button', {name: 'Вернуться к доске'}).click();
    assert.ok(await marks());
    assert.equal(await page.locator('.harvest-line, .harvest-flyer, .harvest-count').count(), 0);
    const tile = page.locator('[data-cell="0"]');
    await tile.hover();
    assert.equal(await tile.evaluate(el => getComputedStyle(el).transform), 'none');
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || undefined});
  try {
    await check(browser, 1280, 'no-preference');
    await check(browser, 360, 'reduce');
    console.log('Scratch reveal verified at 1280 and 360 px.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
