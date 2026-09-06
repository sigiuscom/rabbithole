import http from 'node:http';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

const MODEL = 'selfhosted/deepseek-v4-flash-spark';
const MAX_BODY = 2 * 1024 * 1024;

export function createLlmServer({
  apiKey = process.env.LITELLM_API_KEY,
  upstreamUrl = 'http://litellm.litellm.svc.cluster.local:4000/v1/chat/completions',
  maxConcurrent = 4,
  timeoutMs = 600_000,
} = {}) {
  if (!apiKey?.trim()) throw new Error('LITELLM_API_KEY is required');
  let active = 0;
  return http.createServer(async (req, res) => {
    const fail = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: { message } }));
    };
    if (req.url === '/healthz' && req.method === 'GET') { res.end('ok'); return; }
    if (req.url !== '/chat/completions') { fail(404, 'Not found'); return; }
    if (req.method !== 'POST') { fail(405, 'Use POST'); return; }
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') { fail(415, 'Use application/json'); return; }
    if (active >= maxConcurrent) { fail(429, 'DeepSeek is busy. Try again shortly.'); return; }
    active++;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      if (!req.complete && !res.destroyed) {
        res.once('finish', () => req.destroy());
        fail(504, 'Request timed out');
      }
    }, timeoutMs);
    res.on('close', () => { controller.abort(); if (!req.complete) req.destroy(); });
    let upstream;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > MAX_BODY) { req.resume(); fail(413, 'Request too large'); return; }
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Invalid JSON'); return; }
      if (!validInput(input)) { fail(400, 'Invalid managed generation request'); return; }
      upstream = await fetch(upstreamUrl, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL, messages: input.messages, temperature: input.temperature ?? 0.35,
          stream: true, fallbacks: [], reasoning_effort: 'none',
        }),
      });
      if (!upstream.ok || !upstream.body || !upstream.headers.get('content-type')?.includes('text/event-stream')) {
        fail(upstream.status === 429 ? 429 : 502, 'DeepSeek is unavailable. Try again shortly.'); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of upstream.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop();
        if (buffer.length > MAX_BODY) throw new Error('Invalid stream');
        for (const event of events) {
          for (const line of event.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') { res.end('data: [DONE]\n\n'); return; }
            if (!data) continue;
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error('Provider stream error');
            const content = parsed.choices?.[0]?.delta?.content;
            if (typeof content !== 'string' || !content) continue;
            // Only public answer text crosses this boundary, never provider metadata or errors.
            const frame = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
            if (!res.write(frame)) await once(res, 'drain', { signal: controller.signal });
          }
        }
      }
      throw new Error('Incomplete stream');
    } catch {
      if (!res.destroyed) {
        if (res.headersSent) res.end('data: {"error":{"message":"DeepSeek generation interrupted. Please retry."}}\n\n');
        else fail(controller.signal.aborted ? 504 : 502, 'DeepSeek is unavailable. Try again shortly.');
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      await upstream?.body?.cancel().catch(() => {});
      active--;
    }
  });
}

function validInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  if (Object.keys(input).some(key => !['model', 'messages', 'stream', 'temperature'].includes(key))) return false;
  if (input.model !== MODEL || input.stream !== true) return false;
  if (input.temperature !== undefined && (!Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2)) return false;
  return Array.isArray(input.messages) && input.messages.length > 0 && input.messages.length <= 256 && input.messages.every(message =>
    message && typeof message === 'object' && !Array.isArray(message) &&
    Object.keys(message).every(key => ['role', 'content'].includes(key)) &&
    ['system', 'user', 'assistant'].includes(message.role) && typeof message.content === 'string');
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  createLlmServer().listen(8081, '127.0.0.1');
}
