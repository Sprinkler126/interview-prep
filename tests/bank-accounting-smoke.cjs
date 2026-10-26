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
    await page.getByRole('link',{name:'财会基础与12道例题 →'}).click();
    assert.match(page.url(),/bank-exam\.html#accounting-basics$/);
    const questions = page.locator('#accounting-basics .study-question');
    assert.equal(await questions.count(),12);
    // Recompute numeric answers independently, including existing allowance and elapsed service months.
    const amounts = new Map([
      [0,20+50-10], [1,20+50+15+5-10], [2,Math.max(100-(95-3),0)],
      [3,Math.max(100-88,0)-5], [4,80-6], [5,120-30-10],
      [6,12-(12/12)*3], [7,500-320], [11,100-60-10-5-5]
    ]);
    for (const [i,amount] of amounts) {
      const question = questions.nth(i);
      const key = Number(await question.getAttribute('data-answer'));
      assert.equal(await question.locator('ol > li').nth(key).textContent(),`${amount}万元`,`accounting ${i+1}`);
      assert.ok((await question.locator('details').textContent()).includes(`${amount}万元`));
    }
    for (const question of await questions.all()) {
      assert.equal(await question.locator('ol > li:visible').count(),4);
      await question.locator('summary').click();
      assert.ok(await question.locator('.pitfall').isVisible());
    }
    for (const width of [1440,768,390]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
      assert.deepEqual(await questions.evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().right>innerWidth+1).map(node=>node.id)),[]);
    }
    console.log('PASS: accounting entry, 9 numeric answers, 12 expanded solutions, offline/no-JS, 3 widths.');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
