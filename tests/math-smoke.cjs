const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');

async function main() {
  const browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || 'msedge'});
  try {
    // Static math must work with no script execution and no internet access.
    const context = await browser.newContext({javaScriptEnabled:false, viewport:{width:1440,height:1000}});
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    let formulas = 0;
    const files = fs.readdirSync(path.join(root, 'pages')).filter(file => file.endsWith('.html'));
    for (const file of files) {
      await page.goto(pathToFileURL(path.join(root, 'pages', file)).href);
      const hosts = page.locator('[data-tex]');
      const count = await hosts.count();
      assert.equal(await page.locator('[data-tex] > math').count(), count, `${file}: unrendered formula`);
      assert.equal(await page.locator('[data-tex] [data-tex],math merror').count(), 0, `${file}: nested/invalid math`);
      const invalid = await hosts.evaluateAll(nodes => nodes.filter(node => {
        const math = node.querySelector('math');
        const box = math.getBoundingClientRect();
        return math.namespaceURI !== 'http://www.w3.org/1998/Math/MathML' || !node.dataset.tex || !node.getAttribute('aria-label') || box.height < 8 || /\\(?:frac|text|log|Theta|sum)\b/.test(math.textContent);
      }).map(node => node.dataset.tex));
      assert.deepEqual(invalid, [], `${file}: invalid native math`);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({width,height:1000});
        const bad = await hosts.evaluateAll(nodes => nodes.filter(node => {
          if (node.closest('table,[hidden],details:not([open])')) return false;
          const box = node.getBoundingClientRect();
          return box.width > innerWidth + 1 || box.right > innerWidth + 1;
        }).map(node => node.getAttribute('aria-label')));
        assert.deepEqual(bad, [], `${file}: formula escapes viewport at ${width}`);
      }
      formulas += count;
    }
    assert.ok(formulas >= 350);
    await page.goto(pathToFileURL(path.join(root, 'pages/bank-exam.html')).href);
    assert.ok(await page.locator('mfrac').count() > 20);
    const fraction = page.locator('mfrac').first();
    const geometry = await fraction.evaluate(node => {
      const [numerator, denominator] = node.children;
      return {top:numerator.getBoundingClientRect().top,bottom:denominator.getBoundingClientRect().top};
    });
    assert.ok(geometry.top < geometry.bottom, 'fractions are not stacked');
    const screenshotDir = process.env.MATH_SCREENSHOT_DIR;
    if (screenshotDir) {
      fs.mkdirSync(screenshotDir, {recursive:true});
      for (const [file,selector] of [['bank-exam','#point-4'],['algorithm','#s1'],['elasticsearch','.math-block']]) {
        await page.goto(pathToFileURL(path.join(root, 'pages', `${file}.html`)).href);
        const target = file === 'algorithm' ? page.locator('[data-tex]').first() : page.locator(selector).first();
        for (const width of [1440,390]) {
          await page.setViewportSize({width,height:1000});
          await target.evaluate(node => node.scrollIntoView({block:'center',behavior:'instant'}));
          await page.screenshot({path:path.join(screenshotDir, `${file}-${width}.png`)});
        }
      }
    }
    const live = await browser.newPage();
    await live.goto(pathToFileURL(path.join(root, 'pages/algorithm.html')).href);
    // Regression: options used to lose all markup through textContent.
    await live.evaluate(() => {
      const source = document.createElement('article');
      source.id = 'math-option-fixture';
      source.className = 'study-question';
      source.dataset.answer = '0';
      source.innerHTML = '<ol><li><span class="math-inline"><math><mfrac><mn>1</mn><mn>2</mn></mfrac></math></span></li><li>B</li><li>C</li><li>D</li></ol><details><summary>解析</summary>A</details>';
      document.body.append(source);
      const script = document.createElement('script');
      script.src = '../js/study-lab.js';
      document.body.append(script);
    });
    await live.waitForFunction(() => document.querySelector('#math-option-fixture .study-option math'), null, {timeout:10000});
    assert.equal(await live.locator('#math-option-fixture .study-option mfrac').count(), 1);
    console.log(`PASS: ${files.length} pages, ${formulas} offline/no-JS formulas, 3 widths, stacked fractions, option markup.`);
    await context.close();
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
