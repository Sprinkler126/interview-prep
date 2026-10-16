// NODE_PATH must provide Playwright; installed Edge is used by default.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');

async function main() {
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[],overflows=[];
    page.on('pageerror',error=>errors.push(`${page.url()}: ${error.message}`));
    let animations=0;
    const filter=process.env.STUDY_PAGE_FILTER?new RegExp(process.env.STUDY_PAGE_FILTER):null;
    const files=fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')&&(!filter||filter.test(name)));
    for(const file of files) {
      await page.goto(pathToFileURL(path.join(root,'pages',file)).href);
      assert.equal(await page.locator('#interview-lab').count(),1,`${file}: missing/duplicate lab`);
      assert.equal(await page.locator('.study-failure').count(),0,`${file}: invalid animation`);
      const hosts=page.locator('.study-animation');
      assert.ok(await hosts.count()>0,`${file}: no animation`);
      for(const host of await hosts.all()) {
        const data=JSON.parse(await host.locator('.study-animation-data').textContent());
        assert.ok(data.frames.length>=4,`${file}: fewer than four frames`);
        assert.equal(await host.locator('.study-node').count(),data.nodes.length);
        const prev=host.getByRole('button',{name:'← 上一步'});
        const next=host.getByRole('button',{name:'下一步 →'});
        const play=host.getByRole('button',{name:'播放动画'});
        const reset=host.getByRole('button',{name:'重置',exact:true});
        assert.ok(await prev.isDisabled());
        assert.equal(await host.locator('.study-caption strong').textContent(),data.frames[0].title);
        await next.click();
        assert.equal(await host.locator('.study-caption strong').textContent(),data.frames[1].title);
        await prev.click();
        assert.ok(await prev.isDisabled());
        await host.locator('input[type=range]').evaluate((slider,last)=>{slider.value=last;slider.dispatchEvent(new Event('input',{bubbles:true}));},String(data.frames.length-1));
        assert.ok(await next.isDisabled());
        assert.equal(await host.locator('.study-caption strong').textContent(),data.frames.at(-1).title);
        await reset.click();
        await host.locator('select').selectOption('500');
        await play.click();
        await page.waitForFunction(host=>host.querySelector('input[type=range]').value!=='0',await host.elementHandle());
        await host.getByRole('button',{name:'暂停动画'}).click();
        const paused=await host.locator('input[type=range]').inputValue();
        await page.waitForTimeout(550);
        assert.equal(await host.locator('input[type=range]').inputValue(),paused,`${file}: pause failed`);
        await reset.click();
        assert.ok(await prev.isDisabled());
        animations++;
      }
      for(const question of await page.locator('.study-question').all()) {
        const correct=Number(await question.getAttribute('data-answer'));
        const check=question.getByRole('button',{name:'检查答案'});
        await check.click();assert.match(await question.locator('.study-feedback').textContent(),/请先选择/);
        await question.locator(`input[value="${(correct+1)%4}"]`).check();
        await check.click();assert.match(await question.locator('.study-feedback').textContent(),/有误/);
        await question.locator(`input[value="${correct}"]`).check();
        await check.click();assert.match(await question.locator('.study-feedback').textContent(),/正确/);
        await question.getByRole('button',{name:'重做本题'}).click();
        assert.equal(await question.locator('input:checked').count(),0);
        assert.equal(await question.locator('details[open]').count(),0);
      }
      // New section must remain readable without widening the viewport.
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${file}: full page mobile overflow`);
      const overflow=await page.locator('#interview-lab').evaluate(lab=>[...lab.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&el.tagName!=='SCRIPT').slice(0,4).map(el=>({tag:el.tagName,className:el.className,right:el.getBoundingClientRect().right})));
      if(overflow.length)overflows.push({file,overflow});
      await page.setViewportSize({width:1440,height:1000});
      console.log(`${file}: animation controls and data passed`);
    }
    assert.deepEqual(errors,[],'Browser errors');
    assert.deepEqual(overflows,[],'New content mobile overflow');
    console.log(`Passed ${files.length} pages and ${animations} animations, playback/pause, slider, reset, and mobile layout`);
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
