const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const fixed = value => value.toFixed(2);
// Calculate cash flows independently of the authored answer keys and explanations.
function bond(face, coupon, rate, periods) {
  let result = face / (1 + rate) ** periods;
  for (let period = 1; period <= periods; period++) result += coupon / (1 + rate) ** period;
  return result;
}
const expected = [
  `${fixed(bond(1000,80,.1,5))}元`,
  `${fixed(bond(1000,60,.04,3))}元`,
  `${fixed(1000/1.05**2)}元`,
  `${fixed(bond(1000,40,.05,4))}元`,
  `${fixed(80/960*100)}%、${fixed((1080/960-1)*100)}%`,
  `${20000*.03*3}元`,
  `${fixed(10000*1.05**3)}元`,
  `${fixed([1,2,3].reduce((sum,t)=>sum+1000/1.1**t,0))}元`,
  `${fixed([0,1,2].reduce((sum,t)=>sum+1000/1.1**t,0))}元`,
  `${Math.round([0,1,2].reduce((sum,t)=>sum+1000*1.1**t,0))}元`,
  `${fixed(((1+.12/12)**12-1)*100)}%`,
  `${fixed((1.06/1.02-1)*100)}%`,
  `${fixed(3.2-20*.01+60*.01)}%`,
  `${200000-200000*.04*90/360}元`,
  `${120000/12+(120000-120000/12)*.005}元`,
  `${Math.round(2*1.05/(.1-.05))}元`,
  `${30/(2/1)}倍`,
  `${fixed((6000-600)/3000)}元`,
  `${(22-20+1)/20*100}%`,
  `${Math.round((.6*.1+.4*(-.05))*100)}%`,
  `${2000/.2}元、${2000/.2-2000}元`,
  `${2000/(200+300)}倍`,
  `${6/(200*.02)*100}%`,
  `${120/1000*100}%`,
  `－${450-300}亿元`,
  `${7.14*1000}元`,
  `${Math.round(((70000/7*1.05*6.8)/70000-1)*100)}%`,
  `${Math.max(112-100,0)-5}元`,
  `${Math.max(50-44,0)-3}元`,
  `盈利${(5120-5000)*10*2}元`
];
async function main() {
  const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
  try {
    const context = await browser.newContext({javaScriptEnabled:false});
    await context.route(/^https?:/, route=>route.abort());
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.getByRole('link',{name:'30道计算题专项 →'}).click();
    assert.match(page.url(),/bank-exam\.html#calculation-practice$/);
    const questions = page.locator('#calculation-practice .study-question');
    assert.equal(await questions.count(),expected.length);
    for (let i=0;i<expected.length;i++) {
      const question = questions.nth(i);
      const key = Number(await question.getAttribute('data-answer'));
      assert.equal(await question.locator('ol > li').nth(key).textContent(),expected[i],`calculation ${i+1}`);
      assert.ok((await question.locator('details').textContent()).includes(expected[i]),`explanation ${i+1}`);
      await question.locator('summary').click();
      assert.ok(await question.locator('.pitfall').isVisible());
    }
    for (const width of [1440,768,390]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
      assert.deepEqual(await questions.evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().right>innerWidth+1).map(node=>node.id)),[]);
    }
    await browser.close();
    console.log('PASS: 30 independently calculated answers; direct entry; expanded solutions; 3 widths; offline/no-JS.');
  } finally { if (browser.isConnected()) await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
