const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function main() {
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
  try {
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(`${page.url()}: ${e.message}`));
    await page.route('**/js/code-highlight.js',route=>route.abort());
    const files=['index.html',...fs.readdirSync(path.join(root,'pages')).filter(n=>n.endsWith('.html')).map(n=>'pages/'+n)];
    let total=0;
    for(const file of files) {
      await page.goto(pathToFileURL(path.join(root,file)).href);
      const before=await page.locator('pre,div.code').allTextContents();
      await page.addScriptTag({path:path.join(root,'js/code-highlight.js')});
      const after=await page.locator('pre,div.code').allTextContents();
      assert.deepEqual(after,before,`${file}: displayed text changed`);
      const blocks=page.locator('pre,div.code');
      assert.equal(await blocks.count(),await page.locator('.syntax-highlighted').count(),`${file}: missed block`);
      for(const block of await blocks.all()) {
        assert.equal(await block.locator('code.hljs').count()+(await block.evaluate(b=>b.matches('div.code.hljs')?1:0)),1,`${file}: missing highlighter`);
      }
      total+=before.length;
      console.log(`${file}: ${before.length} blocks preserved and highlighted`);
    }
    await page.goto(pathToFileURL(path.join(root,'pages/algorithm.html')).href);
    await page.addScriptTag({path:path.join(root,'js/code-highlight.js')});
    const java=page.locator('#s1-3 + .card pre code').first();
    assert.ok(await java.locator('.hljs-keyword').count()>0);
    const colors=await java.locator('[class^="hljs-"]').evaluateAll(tokens=>new Set(tokens.map(t=>getComputedStyle(t).color)).size);
    assert.ok(colors>=3,'Java tokens should use multiple colors');
    assert.ok(await page.locator('#sorting-lessons .hljs').count()>=10,'Dynamic lessons were missed');
    await page.evaluate(()=>{
      const pre=document.createElement('pre');pre.id='dynamic-highlight-test';pre.textContent='SELECT name FROM users WHERE id = 42;';document.body.append(pre);
    });
    await page.waitForSelector('#dynamic-highlight-test .hljs-keyword');
    await page.evaluate(()=>{document.querySelector('#dynamic-highlight-test').textContent='def hello():\n    return "world" # comment';});
    await page.waitForSelector('#dynamic-highlight-test .hljs-string');
    assert.equal(await page.locator('#dynamic-highlight-test').textContent(),'def hello():\n    return "world" # comment');
    await page.locator('#lesson-bubble').getByRole('button',{name:'下一步 →'}).click();
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#lesson-quick pre').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(require('node:os').tmpdir(),'code-highlight-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log(`Passed ${files.length} pages, ${total} code blocks, preserved text, multiple colors, dynamic updates and mobile layout`);
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
