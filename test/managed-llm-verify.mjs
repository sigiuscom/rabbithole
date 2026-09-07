import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entryDir = await mkdtemp(join(tmpdir(), 'rh-proxy-entry-'));
try {
  const linkedEntry = join(entryDir, 'llm-proxy.mjs');
  await symlink(fileURLToPath(new URL('../charts/rabbithole/files/llm-proxy.mjs', import.meta.url)), linkedEntry);
  const processResult = spawnSync(process.execPath, [linkedEntry], {
    env: { ...process.env, LITELLM_API_KEY: 'test-entrypoint-key' }, timeout: 1000, encoding: 'utf8',
  });
  assert.equal(processResult.error?.code, 'ETIMEDOUT', `ConfigMap-style symlink entry must keep serving, not exit: ${processResult.stderr}`);
} finally { await rm(entryDir, { recursive: true }); }

globalThis.__RABBITHOLE_MANAGED_LLM__ = true;
const stored = new Map();
globalThis.localStorage = { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) };
const { loadSettings } = await import('../src/web/settings/preferences-store.js');
const { getApiKey } = await import('../src/web/settings/credential-store.js');
const { createBrain } = await import('../src/web/brain/index.js');
const model = 'selfhosted/deepseek-v4-flash-spark';
for (const previous of [{}, { preset: 'openrouter', base_url: 'https://attacker.invalid', author_model: 'other', answer_model: 'other', session_only: false }]) {
  stored.set('rh-web-settings', JSON.stringify(previous));
  stored.set('rh-web-api-keys', JSON.stringify({ openrouter: 'old-browser-key' }));
  const settings = loadSettings();
  assert.equal(settings.answer_model, model, 'managed settings must override stale browser choices');
  assert.equal(getApiKey(settings), '', 'managed requests must not transmit stored credentials');
  const brain = createBrain(settings, 'injected-browser-key');
  assert.equal(brain.baseUrl, '/api/llm');
  assert.equal(brain.apiKey, '');
}

const { createLlmServer } = await import('../charts/rabbithole/files/llm-proxy.mjs');
let calls = 0;
let lastRequest;
let mode = 'ok';
let streamClosed;
const upstream = http.createServer(async (req, res) => {
  calls++;
  let body = '';
  for await (const chunk of req) body += chunk;
  lastRequest = { body: JSON.parse(body), headers: req.headers, url: req.url };
  if (!lastRequest.body.stream) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { tool_calls: [{ id: 'finish', type: 'function', function: { name: 'finish_research', arguments: '{}' } }] } }] }));
    return;
  }
  if (mode === 'error') { res.writeHead(401).end('sensitive-provider-detail'); return; }
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  res.write('data: {"choices":[{"delta":{"reasoning_content":"private reasoning"}}]}\n\n');
  res.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
  if (mode === 'hold') { streamClosed = once(res, 'close'); return; }
  if (mode === 'stream-error') { res.end('data: {"error":{"message":"sensitive-provider-detail"}}\n\n'); return; }
  res.end('data: [DONE]\n\n');
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
assert.throws(() => createLlmServer({ apiKey: '' }), /key/i);
const proxy = createLlmServer({ apiKey: 'server-only-key', upstreamUrl: `http://127.0.0.1:${upstream.address().port}/v1/chat/completions`, maxConcurrent: 1, timeoutMs: 1000 });
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${proxy.address().port}/chat/completions`;
const valid = { model, stream: true, research_question: 'Explain gravity', messages: [{ role: 'user', content: 'Explain gravity' }], temperature: 0.35 };
const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer browser-key' }, body: JSON.stringify(body) });
try {
  for (const patch of [{ model: 'gpt-5.5' }, { reasoning_effort: 'high' }, { api_base: 'https://attacker.invalid' }, { api_key: 'evil' }, { fallbacks: ['other'] }, { stream: false }, { messages: [] }, { messages: [{ role: 'user', content: { url: 'file:///etc/passwd' } }] }, { temperature: 10 }]) {
    assert.equal((await post({ ...valid, ...patch })).status, 400);
  }
  assert.equal(calls, 0, 'invalid requests must not reach upstream');
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await fetch(url + '/extra', { method: 'POST' })).status, 404);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await post({ ...valid, messages: [{ role: 'user', content: 'x'.repeat(2 * 1024 * 1024) }] })).status, 413);
  const response = await post(valid);
  assert.equal(response.status, 200);
  const stream = await response.text();
  assert.match(stream, /Hello/);
  assert.match(stream, /\[DONE\]/);
  assert.doesNotMatch(stream, /server-only-key|private reasoning/);
  assert.equal(lastRequest.url, '/v1/chat/completions');
  assert.equal(lastRequest.headers.authorization, 'Bearer server-only-key');
  assert.equal(lastRequest.body.model, model);
  assert.equal(lastRequest.body.reasoning_effort, 'none', 'managed requests must not spend output tokens on invisible reasoning');
  assert.deepEqual(lastRequest.body.fallbacks, []);
  assert.deepEqual(lastRequest.body.messages.slice(1, -1), valid.messages);
  mode = 'error';
  const error = await post(valid);
  assert.equal(error.status, 502);
  assert.doesNotMatch(await error.text(), /sensitive-provider-detail|server-only-key/);
  mode = 'stream-error';
  const streamError = await (await post(valid)).text();
  assert.match(streamError, /error/);
  assert.doesNotMatch(streamError, /sensitive-provider-detail/);
  mode = 'hold';
  const controller = new AbortController();
  const held = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid), signal: controller.signal });
  assert.equal((await post(valid)).status, 429);
  controller.abort();
  await streamClosed;
  await held.body.cancel().catch(() => {});
  mode = 'ok';
  const slowStatus = await new Promise((resolve, reject) => {
    const slow = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => {
      response.resume(); resolve(response.statusCode);
    });
    slow.on('error', reject);
    slow.setTimeout(2000, () => { slow.destroy(); reject(new Error('Incomplete request exceeded the proxy deadline')); });
    slow.write('{');
  });
  assert.equal(slowStatus, 504, 'deadline must also bound an incomplete request body');
  const nativeFetch = globalThis.fetch;
  const browserRequests = [];
  globalThis.fetch = (target, options) => {
    if (target === '/api/llm/chat/completions') browserRequests.push(JSON.parse(options.body));
    return nativeFetch(target === '/api/llm/chat/completions' ? url : target, options);
  };
  try {
    const brain = createBrain(loadSettings(), 'injected-browser-key');
    for (const [generation, expected] of [[brain.authorExplainer({ question: 'Gravity?' }), 'Hello'], [brain.authorDocument({ markdown: '# Gravity' }), 'Hello'], [brain.answerBranch({ question: 'Why?', parent_markdown: 'Gravity', fallbackTitle: 'Gravity' }), 'Hello\n']]) {
      const events = [];
      for await (const event of generation) events.push(event);
      assert.equal(events.filter(e => e.type === 'text').map(e => e.delta).join(''), expected);
      assert.equal(lastRequest.body.model, model);
      assert.equal(lastRequest.body.reasoning_effort, 'none');
    }
    assert.deepEqual(browserRequests.map(r => r.research_question), ['Gravity?', undefined, 'Why?'], 'only explicitly typed questions may enter research, never document bodies');
  } finally { globalThis.fetch = nativeFetch; }
  console.log('managed LLM settings and proxy verification passed');
} finally {
  proxy.closeAllConnections(); upstream.closeAllConnections();
  await Promise.all([new Promise(resolve => proxy.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
}
