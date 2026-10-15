// Run with Playwright available in NODE_PATH. BROWSER_CHANNEL defaults to msedge.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const chapters = [
  ['data-structure', 18, 24], ['database', 7, 8], ['network', 8, 9],
  ['os', 7, 9], ['organization', 7, 8], ['software', 8, 8], ['new-tech', 3, 8]
];

async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let totalQuestions = 0;
    for (const [key, topics, count] of chapters) {
      const file = path.join(root, 'pages', `sgcc-${key}.html`);
      await page.goto(pathToFileURL(file).href);
      assert.equal(await page.locator('.exam-topic').count(), topics);
      assert.equal(await page.locator('[data-question]').count(), count);
      const ids = await page.locator('[id]').evaluateAll(elements => elements.map(el => el.id));
      assert.equal(new Set(ids).size, ids.length, `${key}: duplicate ids`);
      for (const href of await page.locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
        if (/^https?:/.test(href)) continue;
        const [relative, hash] = href.split('#');
        const target = relative ? path.resolve(path.dirname(file), relative) : file;
        assert.ok(fs.existsSync(target), `${key}: broken link ${href}`);
        if (hash) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${hash}"`), `${key}: missing anchor ${href}`);
      }

      const questions = page.locator('[data-question]');
      const first = questions.first();
      await first.locator('[data-check]').click();
      assert.match(await first.locator('.exam-feedback').textContent(), /请先选择/);
      const answer = Number(await first.getAttribute('data-answer'));
      await first.locator(`input[value="${(answer + 1) % 4}"]`).check();
      await first.locator('[data-check]').click();
      assert.match(await first.locator('.exam-feedback').textContent(), /有误/);
      assert.match(await page.locator('[data-score]').textContent(), /答对 0 题/);
      for (const question of await questions.all()) {
        const correct = await question.getAttribute('data-answer');
        await question.locator(`input[value="${correct}"]`).check();
        await question.locator('[data-check]').click();
        assert.match(await question.locator('.exam-feedback').textContent(), /正确/);
        assert.equal(await question.locator('details').getAttribute('open'), '');
      }
      assert.match(await page.locator('[data-score]').textContent(), new RegExp(`答对 ${count} 题`));
      await first.locator(`input[value="${(answer + 1) % 4}"]`).check();
      assert.match(await page.locator('[data-score]').textContent(), new RegExp(`已检查 ${count - 1} /`));
      await page.locator('[data-reset-quiz]').click();
      assert.equal(await page.locator('input:checked').count(), 0);
      assert.equal(await page.locator('[data-question] details[open]').count(), 0);
      assert.match(await page.locator('[data-score]').textContent(), /已检查 0 /);

      for (const trace of await page.locator('[data-trace]').all()) {
        const prev = trace.getByRole('button', { name: '← 上一步' });
        const next = trace.getByRole('button', { name: '下一步 →' });
        assert.ok(await prev.isDisabled());
        const initial = await trace.locator('.trace-view').textContent();
        await next.click();
        assert.notEqual(await trace.locator('.trace-view').textContent(), initial);
        await prev.click();
        assert.equal(await trace.locator('.trace-view').textContent(), initial);
        const steps = await trace.locator('li').count();
        for (let i = 1; i < steps; i++) await next.click();
        assert.ok(await next.isDisabled());
        await trace.getByRole('button', { name: '重置', exact: true }).click();
        assert.ok(await prev.isDisabled());
      }

      for (const width of [390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${key}: overflow at ${width}`);
      }
      totalQuestions += count;
      console.log(`${key}: ${topics} topics, ${count} question controls, traces, links and responsive layouts passed`);
    }

    await page.goto(pathToFileURL(path.join(root, 'pages/sgcc-data-structure.html')).href);
    const queue = page.locator('[data-ring-queue]');
    const enqueue = queue.locator('[data-enqueue]');
    const dequeue = queue.locator('[data-dequeue]');
    await dequeue.click();
    assert.match(await queue.locator('[data-queue-message]').textContent(), /队空/);
    for (const value of [1, 2, 3, 4]) {
      await queue.locator('input').fill(String(value));
      await enqueue.click();
    }
    await enqueue.click();
    assert.match(await queue.locator('[data-queue-message]').textContent(), /队满/);
    await dequeue.click();
    await dequeue.click();
    for (const value of [5, 6]) {
      await queue.locator('input').fill(String(value));
      await enqueue.click();
    }
    assert.match(await queue.locator('[data-queue-view]').textContent(), /槽 0: 6/);
    for (const expected of [3, 4, 5, 6]) {
      await dequeue.click();
      assert.match(await queue.locator('[data-queue-message]').textContent(), new RegExp(`出队 ${expected}`));
    }
    await dequeue.click();
    assert.match(await queue.locator('[data-queue-message]').textContent(), /队空/);
    await queue.locator('input').fill('1000');
    await enqueue.click();
    assert.match(await queue.locator('[data-queue-message]').textContent(), /请输入/);
    await queue.locator('[data-reset-queue]').click();
    assert.match(await queue.locator('[data-queue-view]').textContent(), /槽 0: · ← front ← rear/);
    await page.setViewportSize({ width: 390, height: 844 });
    await queue.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(os.tmpdir(), 'sgcc-queue-mobile.png') });
    await page.goto(pathToFileURL(path.join(root, 'pages/sgcc-exam.html')).href);
    assert.equal(await page.locator('.exam-hub-grid article').count(), 7);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(os.tmpdir(), 'sgcc-hub-mobile.png') });
    assert.deepEqual(errors, []);
    console.log(`Passed ${totalQuestions} question interactions, ring queue wrap/full/empty/input checks and hub smoke test`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
