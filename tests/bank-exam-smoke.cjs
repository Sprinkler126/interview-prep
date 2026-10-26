const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');

async function main() {
  const browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || 'msedge'});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.getByRole('link', {name:'进入银行备考页面 →'}).click();
    assert.match(page.url(), /bank-exam\.html$/);
    assert.equal(await page.locator('[id^="point-"]').count(), 20);
    assert.equal(await page.locator('.study-question').count(), 50);
    assert.equal(await page.locator('.study-failure').count(), 0);
    for (const question of await page.locator('.study-question').all()) {
      const correct = Number(await question.getAttribute('data-answer'));
      await question.getByRole('button', {name:'检查答案'}).click();
      assert.match(await question.locator('.study-feedback').textContent(), /请先选择/);
      await question.locator(`input[value="${(correct + 1) % 4}"]`).check();
      await question.getByRole('button', {name:'检查答案'}).click();
      assert.match(await question.locator('.study-feedback').textContent(), /有误/);
      await question.locator(`input[value="${correct}"]`).check();
      await question.getByRole('button', {name:'检查答案'}).click();
      assert.match(await question.locator('.study-feedback').textContent(), /正确/);
      await question.getByRole('button', {name:'重做本题'}).click();
      assert.equal(await question.locator('input:checked').count(), 0);
    }
    const form = page.locator('#bond-calculator');
    assert.match(await form.locator('output').textContent(), /954\.55.*折价/);
    await form.locator('[name="yield"]').fill('5');
    assert.match(await form.locator('output').textContent(), /1000\.00.*平价/);
    await form.locator('[name="yield"]').fill('0');
    assert.match(await form.locator('output').textContent(), /1050\.00.*溢价/);
    await form.locator('[name="yield"]').fill('10');
    await form.locator('[name="years"]').fill('2');
    assert.match(await form.locator('output').textContent(), /913\.22/);
    await form.locator('[name="years"]').fill('1.5');
    assert.match(await form.locator('output').textContent(), /请填写有效数值/);
    await form.locator('[name="years"]').fill('1');
    await form.locator('[name="face"]').fill('');
    assert.match(await form.locator('output').textContent(), /请填写有效数值/);
    await form.locator('[name="face"]').fill('1000');
    await form.locator('[name="yield"]').fill('-1');
    assert.match(await form.locator('output').textContent(), /请填写有效数值/);
    await form.locator('[name="yield"]').fill('10');
    assert.match(await form.locator('output').textContent(), /954\.55/);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({width, height:900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    }
    const hrefs = await page.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(new Set(ids).size, ids.length, 'duplicate IDs');
    for (const href of hrefs) {
      if (href.startsWith('#')) assert.ok(ids.includes(href.slice(1)), `broken anchor ${href}`);
      else if (!/^https?:/.test(href)) assert.ok(fs.existsSync(path.resolve(root, 'pages', href)), `broken local link ${href}`);
    }
    await page.setViewportSize({width:1440, height:1000});
    await page.evaluate(() => scrollTo(0,0));
    const screenshotDir = process.env.BANK_SCREENSHOT_DIR;
    if (screenshotDir) {
      fs.mkdirSync(screenshotDir, {recursive:true});
      await page.screenshot({path:path.join(screenshotDir, 'bank-desktop.png')});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(screenshotDir, 'bank-mobile.png')});
    }
    const offline = await browser.newContext({javaScriptEnabled:false});
    const staticPage = await offline.newPage();
    await staticPage.goto(pathToFileURL(path.join(root, 'pages/bank-exam.html')).href);
    assert.equal(await staticPage.locator('.study-question ol:visible').count(), 50);
    assert.equal(await staticPage.locator('#point-20').count(), 1);
    await offline.close();
    assert.deepEqual(errors, []);
    console.log('PASS: 50 questions; bond pricing and invalid inputs; links; 4 viewports; no-JS reading.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
