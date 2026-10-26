const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');

async function main() {
  const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.getByRole('link',{name:'中国工商银行专项 · 企业文化、行史与笔试备考 →'}).click();
    assert.match(page.url(),/icbc-exam\.html$/);
    assert.equal(await page.locator('.study-question').count(),16);
    assert.equal(await page.locator('.study-failure').count(),0);
    for (const question of await page.locator('.study-question').all()) {
      const correct = Number(await question.getAttribute('data-answer'));
      const check = question.getByRole('button',{name:'检查答案'});
      await check.click();
      assert.match(await question.locator('.study-feedback').textContent(),/请先选择/);
      await question.locator(`input[value="${(correct+1)%4}"]`).check();
      await check.click();
      assert.match(await question.locator('.study-feedback').textContent(),/有误/);
      await question.locator(`input[value="${correct}"]`).check();
      await check.click();
      assert.match(await question.locator('.study-feedback').textContent(),/正确/);
      await question.getByRole('button',{name:'重做本题'}).click();
      assert.equal(await question.locator('input:checked').count(),0);
      assert.equal(await question.locator('details[open]').count(),0);
    }
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(ids.length,new Set(ids).size);
    for (const href of await page.locator('a[href],script[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href') || node.getAttribute('src')))) {
      if (href.startsWith('#')) assert.ok(ids.includes(href.slice(1)),href);
      else if (!/^https?:/.test(href)) assert.ok(fs.existsSync(path.resolve(root,'pages',href)),href);
    }
    for (const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
    }
    const offline = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const staticPage = await offline.newPage();
    await staticPage.goto(pathToFileURL(path.join(root,'pages/icbc-exam.html')).href);
    assert.equal(await staticPage.locator('.study-question ol:visible').count(),16);
    await staticPage.locator('.study-question summary').first().click();
    assert.equal(await staticPage.locator('.study-question details[open]').count(),1);
    await offline.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: ICBC entry, 16 questions, answer/reset, links, 4 viewports and no-JS reading.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
