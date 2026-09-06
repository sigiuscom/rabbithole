import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(new URL('..', import.meta.url).pathname);
function build(managed) {
  const result = spawnSync(process.execPath, ['build.mjs'], { cwd: root, env: { ...process.env, RABBITHOLE_MANAGED_LLM: managed ? '1' : '0' }, stdio: 'inherit' });
  assert.equal(result.status, 0);
}
build(true);
const server = http.createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  try {
    const file = path.join(root, 'web/dist', name === '/' ? 'index.html' : name);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const stale of [false, true]) {
    const context = await browser.newContext();
    if (stale) await context.addInitScript(() => {
      localStorage.setItem('rh-web-settings', JSON.stringify({ preset: 'openrouter', base_url: 'https://attacker.invalid', answer_model: 'other', author_model: 'other', session_only: false }));
      localStorage.setItem('rh-web-api-keys', JSON.stringify({ openrouter: 'old-browser-key' }));
    });
    const page = await context.newPage();
    const external = [];
    let calls = 0;
    page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.route(`${base}/api/llm/chat/completions`, async route => {
      const request = route.request();
      assert.equal(request.postDataJSON().model, 'selfhosted/deepseek-v4-flash-spark');
      assert.equal(request.headers().authorization, undefined);
      assert.equal(request.headers()['api-key'], undefined);
      calls++;
      await route.fulfill({ contentType: 'text/event-stream', body: 'data: {"choices":[{"delta":{"content":"# Gravity\\n\\nMass attracts mass."}}]}\n\ndata: [DONE]\n\n' });
    });
    await page.goto(base);
    await page.click('#composer-path-ask');
    await page.fill('#composer-input', 'Explain gravity');
    await page.click('#composer-primary');
    await page.locator('.node', { hasText: 'Mass attracts mass.' }).first().waitFor();
    assert.equal(calls, 1);
    assert.equal(await page.locator('#composer-key-panel').isVisible(), false);
    await page.click('#t-settings');
    await page.locator('#web-settings-popover').waitFor();
    assert.match(await page.locator('#web-settings-popover').innerText(), /DeepSeek on Spark/);
    assert.equal(await page.locator('#provider-select, #api-key, #answer-model, #author-model').count(), 0);
    const snapshot = await page.evaluate(() => window.__rabbitholeTest.exportSnapshot());
    assert.doesNotMatch(String(snapshot), /old-browser-key/);
    assert.deepEqual(external, []);
    await context.close();
  }
  console.log('managed browser verification passed (fresh and stale storage)');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  build(false);
}
