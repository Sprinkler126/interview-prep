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
    // The study page must not need online assets to read or answer questions.
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.getByRole('link',{name:'中国农业银行专项 · 2026企业文化与行史行情 →'}).click();
    assert.match(page.url(),/abc-exam\.html$/);
    assert.equal(await page.locator('.study-question').count(),24);
    assert.equal(await page.locator('.study-animation').count(),1);
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
    assert.equal(ids.length,new Set(ids).size,'duplicate IDs');
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const href of links) {
      if (href.startsWith('#')) assert.ok(ids.includes(href.slice(1)),`broken anchor ${href}`);
      else if (!/^https?:/.test(href)) assert.ok(fs.existsSync(path.resolve(root,'pages',href)),`broken local link ${href}`);
      else assert.ok(new Set(['www.abchina.com','career.abchina.com.cn','jhs.moa.gov.cn','banna.huatu.com','www.yinhangzhaopin.com']).has(new URL(href).hostname),'unexpected source domain');
    }
    for (const src of await page.locator('script[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') || node.getAttribute('href')))) {
      assert.ok(fs.existsSync(path.resolve(root,'pages',src)),`missing asset ${src}`);
    }
    const distribution = await page.locator('#abc-tech-ratios').evaluate(table => ({
      total:Number(table.dataset.total),
      rows:[...table.querySelectorAll('tbody tr')].map(row => ({count:Number(row.dataset.count),percent:Number(row.dataset.percent)}))
    }));
    assert.equal(distribution.rows.reduce((sum,row) => sum+row.count,0),distribution.total);
    assert.equal(distribution.rows.reduce((sum,row) => sum+row.percent,0),100);
    for (const row of distribution.rows) assert.ok(Math.abs(row.count/distribution.total*100-row.percent)<0.005);
    for (const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),`page overflow ${width}`);
      assert.deepEqual(await page.locator('.abc-grid,.bank-map,.bank-flow,.study-animation').evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().right>innerWidth+1).map(node => node.className)),[]);
    }
    const screenshots = process.env.ABC_SCREENSHOT_DIR;
    if (screenshots) {
      fs.mkdirSync(screenshots,{recursive:true});
      for (const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        await page.evaluate(() => scrollTo(0,0));
        await page.screenshot({path:path.join(screenshots,`abc-top-${width}.png`)});
        await page.locator('#strategy').evaluate(node => node.scrollIntoView({block:'start',behavior:'instant'}));
        await page.screenshot({path:path.join(screenshots,`abc-strategy-${width}.png`)});
        await page.locator('#computer-exam').evaluate(node => node.scrollIntoView({block:'start',behavior:'instant'}));
        await page.screenshot({path:path.join(screenshots,`abc-computer-${width}.png`)});
      }
    }
    const offline = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const staticPage = await offline.newPage();
    await staticPage.goto(pathToFileURL(path.join(root,'pages/abc-exam.html')).href);
    assert.equal(await staticPage.locator('.study-question ol:visible').count(),24);
    assert.equal(await staticPage.locator('#sources').count(),1);
    await offline.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: 24 questions; navigation and source domains; local assets; 4 viewports; offline/no-JS reading.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
