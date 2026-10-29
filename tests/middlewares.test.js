process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { rateLimit } = require('../src/middlewares/rateLimit');
const { requestId } = require('../src/middlewares/requestLogger');
const { errorHandler } = require('../src/middlewares/errorHandler');

function buildApp(limiter) {
  const app = express();
  app.use(requestId);
  app.post('/login', limiter, (req, res) => res.json({ success: true }));
  app.get('/boom', () => {
    throw new Error('unexpected');
  });
  app.use(errorHandler);
  return app;
}

test('rate limit: cho phép đủ số lần, lần vượt trả 429 kèm Retry-After', async () => {
  const app = buildApp(rateLimit({ windowMs: 60_000, max: 3, message: 'Thử lại sau' }));

  for (let i = 1; i <= 3; i += 1) {
    const res = await request(app).post('/login');
    assert.equal(res.status, 200);
    assert.equal(res.headers['ratelimit-remaining'], String(3 - i));
  }

  const blocked = await request(app).post('/login');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error.code, 'TOO_MANY_REQUESTS');
  assert.ok(Number(blocked.headers['retry-after']) > 0);
});

test('rate limit: hết thời gian chờ thì được thử lại', async () => {
  const app = buildApp(rateLimit({ windowMs: 50, max: 1, message: 'Thử lại sau' }));
  assert.equal((await request(app).post('/login')).status, 200);
  assert.equal((await request(app).post('/login')).status, 429);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal((await request(app).post('/login')).status, 200);
});

test('request id: sinh mới, hoặc giữ lại mã hợp lệ client gửi lên', async () => {
  const app = buildApp(rateLimit({ windowMs: 60_000, max: 100, message: '' }));

  const generated = await request(app).post('/login');
  assert.match(generated.headers['x-request-id'], /^[0-9a-f-]{36}$/);

  const kept = await request(app).post('/login').set('X-Request-Id', 'abc-123');
  assert.equal(kept.headers['x-request-id'], 'abc-123');

  const rejected = await request(app).post('/login').set('X-Request-Id', 'bad id <script>');
  assert.notEqual(rejected.headers['x-request-id'], 'bad id <script>');
});

test('lỗi 500 trả requestId trùng với header để tra log', async (t) => {
  t.mock.method(console, 'error', () => {});
  const app = buildApp(rateLimit({ windowMs: 60_000, max: 100, message: '' }));
  const res = await request(app).get('/boom');
  assert.equal(res.status, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.equal(res.body.error.requestId, res.headers['x-request-id']);
});
