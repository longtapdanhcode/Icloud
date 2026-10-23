process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

after(() => db.close());

test('GET /health trả trạng thái app và DB', async () => {
  const res = await request(app).get('/health');
  assert.ok([200, 503].includes(res.status));
  assert.ok(['up', 'down'].includes(res.body.db));
  assert.equal(typeof res.body.uptime, 'number');
  // CI có MySQL nên DB phải up
  if (process.env.CI) {
    assert.equal(res.status, 200);
    assert.equal(res.body.db, 'up');
  }
});

test('API không tồn tại trả 404 theo chuẩn lỗi', async () => {
  const res = await request(app).get('/api/khong-ton-tai');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('JSON sai định dạng trả 400', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('Trang chủ được phục vụ từ public/', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.text, /Cloud Inventory/);
});
