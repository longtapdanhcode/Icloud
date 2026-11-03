process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');
const env = require('../src/config/env');

const secret = env.JWT_SECRET || 'test-jwt-secret-cloud-inventory';
const staffToken = jwt.sign(
  { id: 2, email: 'staff@cloudinventory.vn', role: 'STAFF' },
  secret,
  { expiresIn: '1h' },
);

const staff = () => request(app)
  .get('/api/suppliers')
  .set('Authorization', `Bearer ${staffToken}`);

const adminToken = jwt.sign(
  { id: 1, email: 'admin@cloudinventory.vn', role: 'ADMIN' },
  secret,
  { expiresIn: '1h' },
);

let supplierId;
const supplierName = `TEST_SUPPLIER_${process.pid}_${Date.now()}`;

before(async () => {
  const result = await db.query(
    'INSERT INTO suppliers (name, email) VALUES (?, ?)',
    [supplierName, 'test@example.com'],
  );
  supplierId = result.insertId;
});

const staffRequest = {
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${staffToken}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${staffToken}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${staffToken}`),
};

after(async () => {
  if (supplierId) await db.query('DELETE FROM suppliers WHERE id = ?', [supplierId]);
  await db.close();
});

test('GET /api/suppliers - không có token trả 401', async () => {
  const res = await request(app).get('/api/suppliers');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('GET /api/suppliers - STAFF được phép truy cập', async () => {
  // Middleware phân quyền chạy trước service; kiểm tra 401/403 nếu token không hợp lệ.
  const res = await staff();
  assert.equal(res.status, 200);
});

test('POST /api/suppliers - email không hợp lệ trả 400', async () => {
  const res = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'TEST_SUPPLIER_INVALID_EMAIL', email: 'not-an-email' });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /Email/);
});

test('STAFF không được tạo nhà cung cấp', async () => {
  const res = await staffRequest.post('/api/suppliers')
    .send({ name: 'TEST_SUPPLIER_FORBIDDEN' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('STAFF không được cập nhật nhà cung cấp', async () => {
  const res = await staffRequest.put('/api/suppliers/1')
    .send({ name: 'TEST_SUPPLIER_FORBIDDEN' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('ADMIN cập nhật email không hợp lệ trả 400', async () => {
  const res = await request(app)
    .put(`/api/suppliers/${supplierId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'invalid-email' });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('STAFF không được xóa nhà cung cấp', async () => {
  const res = await staffRequest.delete(`/api/suppliers/${supplierId}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'FORBIDDEN');
});
