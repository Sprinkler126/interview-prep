const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');

async function main() {
  const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
  try {
    const context = await browser.newContext({javaScriptEnabled:false});
    await context.route(/^https?:/,route=>route.abort());
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.getByRole('link',{name:'宏观经济入门·12主题与24题 →'}).click();
    assert.match(page.url(),/bank-exam\.html#macro-basics$/);
    const section = page.locator('#macro-basics');
    assert.equal(await section.locator('article.bank-card').count(),12);
    const questions = section.locator('.study-question');
    assert.equal(await questions.count(),24);
    const answers = new Map([
      [0,`${500+150+200+100-80}亿元`],
      [2,`${Math.round(121/(110/100))}亿元`],
      [3,`${Math.round((110/100-1)*100)}%`],
      [6,`${50/(950+50)*100}%`],
      [10,`${Math.round(10/(1-.8))}亿元`],
      [11,`${Math.round(-.8/(1-.8)*(-10))}亿元`]
    ]);
    for (const [index,expected] of answers) {
      const question = questions.nth(index);
      const answer = Number(await question.getAttribute('data-answer'));
      assert.equal(await question.locator('ol > li').nth(answer).textContent(),expected,`question ${index+1}`);
    }
    for (const question of await questions.all()) {
      assert.equal(await question.locator('ol > li:visible').count(),4);
      await question.locator('summary').click();
      assert.ok(await question.locator('details p').first().isVisible());
      const href = await question.locator('details a').getAttribute('href');
      assert.equal(await page.locator(href).count(),1);
    }
    for (const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:950});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
      assert.deepEqual(await section.locator('.bank-card,.bank-map,.bank-flow').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>n.id || n.className)),[]);
    }
    assert.equal(await page.locator('#macro-adas .study-question').count(),12);
    console.log('PASS: 12 macro topics, 24 exercises, 6 independent calculations, recap links, offline/no-JS, 4 widths.');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
