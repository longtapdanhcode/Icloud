process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');
const env = require('../src/config/env');

const secret = env.JWT_SECRET || 'test-jwt-secret-cloud-inventory';
const adminToken = jwt.sign(
  { id: 1, email: 'admin@cloudinventory.vn', role: 'ADMIN' },
  secret,
  { expiresIn: '1h' },
);
const auth = () => request(app)
  .post('/api/stock-transactions')
  .set('Authorization', `Bearer ${adminToken}`);

let productId;
const sku = `TEST_STOCK_TX_${process.pid}_${Date.now()}`;

before(async () => {
  const result = await db.query(
    `INSERT INTO products (category_id, sku, name, price, quantity, min_stock)
     VALUES (NULL, ?, 'TEST_STOCK_TRANSACTION_PRODUCT', 1000, 1, 0)`,
    [sku],
  );
  productId = result.insertId;
});

after(async () => {
  if (productId) {
    await db.query('DELETE FROM products WHERE id = ?', [productId]);
  }
  await db.close();
});

test('POST /api/stock-transactions - không có token trả 401', async () => {
  const res = await request(app)
    .post('/api/stock-transactions')
    .send({ type: 'OUT', items: [{ product_id: productId, quantity: 1, unit_price: 0 }] });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('POST - thiếu items trả 400', async () => {
  const res = await auth().send({ type: 'OUT' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST - type không hợp lệ trả 400', async () => {
  const res = await auth().send({ type: 'TRANSFER', items: [{ product_id: productId, quantity: 1, unit_price: 0 }] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST - phiếu IN thiếu supplier_id trả 400', async () => {
  for (const supplier_id of [undefined, null, '']) {
    const body = { type: 'IN', items: [{ product_id: productId, quantity: 1, unit_price: 0 }] };
    if (supplier_id !== undefined) body.supplier_id = supplier_id;
    const res = await auth().send(body);
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('POST - phiếu OUT không được có supplier_id', async () => {
  const res = await auth().send({
    type: 'OUT', supplier_id: 1,
    items: [{ product_id: productId, quantity: 1, unit_price: 0 }],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST - quantity bằng 0 trả 400', async () => {
  const res = await auth().send({
    type: 'OUT',
    items: [{ product_id: productId, quantity: 0, unit_price: 0 }],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST - trùng product_id trong cùng phiếu trả 400', async () => {
  const res = await auth().send({
    type: 'OUT',
    items: [
      { product_id: productId, quantity: 1, unit_price: 0 },
      { product_id: productId, quantity: 1, unit_price: 0 },
    ],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST - xuất vượt tồn kho trả 409 và không làm thay đổi tồn kho', async () => {
  const res = await auth().send({
    type: 'OUT',
    items: [{ product_id: productId, quantity: 2, unit_price: 0 }],
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'INSUFFICIENT_STOCK');

  const [product] = await db.query('SELECT quantity FROM products WHERE id = ?', [productId]);
  assert.equal(product.quantity, 1);
});
