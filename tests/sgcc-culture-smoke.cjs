const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function main() {
  const data=JSON.parse(fs.readFileSync(path.join(root,'data/sgcc-culture-2027.json'),'utf8'));
  const expected=[...Array.from({length:39},(_,i)=>i+48),...Array.from({length:30},(_,i)=>i+395),...Array.from({length:24},(_,i)=>i+643)];
  const points=data.groups.flatMap(g=>g.points),refs=points.flatMap(p=>p.refs).sort((a,b)=>a-b);
  assert.equal(points.length,43);assert.equal(data.groups.length,8);
  assert.deepEqual(refs,expected,'All 93 original questions must occur exactly once');
  assert.equal(new Set(points.map(p=>p.id)).size,43);
  assert.deepEqual(data.questionIndex.map(q=>q.id),expected);
  for(const q of data.questionIndex) {
    assert.ok(q.page>=1&&q.endPage>=q.page&&q.endPage<=159);
    assert.ok(points.find(p=>p.id===q.point).refs.includes(q.id));
  }
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const file=path.join(root,'pages/sgcc-culture-2027.html');
    await page.goto(pathToFileURL(file).href);
    assert.equal(await page.locator('.culture-point').count(),43);
    assert.equal(await page.locator('.culture-map').count(),8);
    for(const href of await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.getAttribute('href')))) {
      const [relative,hash]=href.split('#');
      const target=relative?path.resolve(path.dirname(file),relative):file;
      assert.ok(fs.existsSync(target),href);
      if(hash)assert.ok(fs.readFileSync(target,'utf8').includes(`id="${hash}"`),href);
    }
    await page.locator('#culture-collapse').click();assert.equal(await page.locator('.culture-map[open]').count(),0);
    await page.locator('#culture-expand').click();assert.equal(await page.locator('.culture-map[open]').count(),8);
    const search=page.locator('#culture-search');
    await search.fill('45分钟');assert.equal(await page.locator('.culture-point:visible').count(),1);
    assert.equal(await page.locator('.culture-point:visible').getAttribute('id'),'point-repair');
    await search.fill('646');assert.equal(await page.locator('.culture-point:visible').getAttribute('id'),'point-strive');
    await search.fill('no-such-knowledge');assert.equal(await page.locator('.culture-point:visible').count(),0);
    await page.locator('#culture-clear').click();assert.equal(await page.locator('.culture-point:visible').count(),43);
    await page.locator('#culture-recall').click();assert.equal(await page.locator('.point-content:visible').count(),0);
    const purpose=page.locator('#point-purpose');await purpose.locator('.revealer').click();assert.ok(await purpose.locator('.point-content').isVisible());
    await purpose.locator('.revealer').click();assert.ok(await purpose.locator('.point-content').isHidden());
    await page.locator('#culture-recall').click();assert.equal(await page.locator('.point-content:visible').count(),43);
    await page.locator('#culture-collapse').click();
    await page.evaluate(()=>{location.hash='point-mission';});await page.waitForFunction(()=>document.querySelector('#map-values').open);
    assert.ok(await page.locator('#point-mission').isVisible());
    await page.locator('#culture-expand').click();
    for(const quiz of await page.locator('.culture-quiz').all()) {
      const correct=Number(await quiz.getAttribute('data-answer'));
      await quiz.locator('button').click();assert.match(await quiz.locator('.quiz-feedback').textContent(),/请先选择/);
      await quiz.locator(`input[value="${(correct+1)%4}"]`).check();await quiz.locator('button').click();assert.match(await quiz.locator('.quiz-feedback').textContent(),/有误/);
      await quiz.locator(`input[value="${correct}"]`).check();await quiz.locator('button').click();assert.match(await quiz.locator('.quiz-feedback').textContent(),/正确/);
    }
    for(const width of [390,768,1440]) {
      await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    }
    await page.setViewportSize({width:1440,height:1000});await page.locator('#overview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),'sgcc-culture-overview.png')});
    await page.setViewportSize({width:390,height:844});await page.locator('#map-values').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),'sgcc-culture-mobile.png')});
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.getByRole('link',{name:'2027企业文化 · 93题去重为43个知识点 · 思维导图 →'}).click();assert.ok(page.url().includes('sgcc-culture-2027.html'));
    const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(pathToFileURL(file).href);assert.equal(await staticPage.locator('.culture-point:visible').count(),43);assert.equal(await staticPage.locator('.point-content:visible').count(),43);await nojs.close();
    assert.deepEqual(errors,[]);
    console.log('Passed: 93 source questions uniquely mapped to 43 points; 8 maps, search, recall, anchors, 6 quizzes, local links, no-JS reading and responsive layouts');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
