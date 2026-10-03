import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

test('HTTP liveness/readiness and unavailable business routes; response contains no database details', async (context) => {
  let ready = false;
  const server = createApp({ isReady: () => ready }).listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const live = await fetch(`${base}/health/live`);
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-powered-by'), null);
  assert.equal(live.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await live.json(), { status: 'ok' });
  const unavailable = await fetch(`${base}/health/ready`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: 'not_ready' });
  ready = true;
  assert.equal((await fetch(`${base}/health/ready`)).status, 200);
  assert.equal((await fetch(`${base}/tasks`)).status, 404);
  assert.equal((await fetch(`${base}/health/live`, { method: 'POST' })).status, 404);
});
test('configuration fails closed for missing URI and invalid port/environment', () => {
  assert.throws(() => readConfig({}), /MONGODB_URI/u);
  assert.throws(() => readConfig({ PORT: '0', MONGODB_URI: 'mongodb://localhost/test' }), /PORT/u);
  assert.throws(() => readConfig({ NODE_ENV: 'unknown', MONGODB_URI: 'mongodb://localhost/test' }), /NODE_ENV/u);
  assert.deepEqual(readConfig({ MONGODB_URI: 'mongodb://localhost/test' }), { host: '127.0.0.1', port: 4000, nodeEnv: 'development', mongoUri: 'mongodb://localhost/test' });
});
