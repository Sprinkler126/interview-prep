const assert = require('node:assert/strict');
const fs = require('node:fs');
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
    await page.getByRole('link',{name:'宏观AD—AS图解与12题 →'}).click();
    assert.match(page.url(),/bank-exam\.html#macro-adas$/);
    const section = page.locator('#macro-adas');
    assert.equal(await section.locator('.study-question').count(),12);
    assert.equal(await section.locator('figure img').count(),4);
    for (const picture of await section.locator('figure img').all()) {
      await picture.scrollIntoViewIfNeeded();
      await picture.evaluate(img=>img.decode());
      assert.ok(await picture.evaluate(img=>img.naturalWidth>0 && img.alt.length>15));
    }
    for (const details of await section.locator('details').all()) await details.locator('summary').click();
    assert.equal(await section.locator('.study-question ol:visible').count(),12);
    for (const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:950});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
      assert.deepEqual(await section.locator('figure img').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>n.src)),[]);
    }
    // Verify plotted equilibria lie on the authored demand lines and implied supply shapes.
    for (const name of ['vertical','horizontal','sloped','shock']) {
      const svg = fs.readFileSync(path.join(root,`images/bank-adas-${name}.svg`),'utf8');
      const points = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map(m=>[Number(m[1]),Number(m[2])]);
      assert.equal(points.length,2);
      points.forEach(([x,y],i)=>assert.ok(Math.abs(y-(.6*x+5-(i===1 && name!=='shock'?48:0)))<.01));
      const [[x0,y0],[x1,y1]]=points;
      if(name==='vertical') assert.ok(x1===x0 && y1<y0);
      if(name==='horizontal') assert.ok(x1>x0 && y1===y0);
      if(name==='sloped') assert.ok(x1>x0 && y1<y0 && Math.abs(y1-(335-.5*x1))<.01);
      if(name==='shock') assert.ok(x1<x0 && y1<y0 && y1===280-.5*x1);
    }
    if(process.env.MACRO_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.MACRO_SCREENSHOT_DIR,{recursive:true});
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        await section.locator('figure').first().evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
        await page.screenshot({path:path.join(process.env.MACRO_SCREENSHOT_DIR,`macro-${width}.png`)});
      }
    }
    console.log('PASS: macro entry, 4 offline SVGs, equilibrium geometry, 12 static questions, 4 viewports.');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
