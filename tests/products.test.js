process.env.NODE_ENV = 'test';

const { test, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

after(async () => {
  await db.close();
});

// 1. GET danh sách sản phẩm thành công
test('GET /api/products - lấy danh sách sản phẩm thành công kèm phân trang và JOIN category', async () => {
  const res = await request(app).get('/api/products');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);

  // Kiểm tra cấu trúc item theo đúng yêu cầu
  const item = res.body.data[0];
  assert.ok('id' in item);
  assert.ok('category_id' in item);
  assert.ok('category_name' in item);
  assert.ok('sku' in item);
  assert.ok('name' in item);
  assert.ok('price' in item);
  assert.ok('quantity' in item);
  assert.ok('min_stock' in item);
  assert.ok('created_at' in item);

  // Kiểm tra meta phân trang
  assert.equal(res.body.meta.page, 1);
  assert.equal(typeof res.body.meta.limit, 'number');
  assert.equal(typeof res.body.meta.total, 'number');
  assert.equal(typeof res.body.meta.totalPages, 'number');
});

test('GET /api/products?page=2&limit=3 - hỗ trợ phân trang page và limit cơ bản', async () => {
  const res = await request(app).get('/api/products?page=2&limit=3');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 3);
  assert.equal(res.body.meta.page, 2);
  assert.equal(res.body.meta.limit, 3);
});

// 2. GET chi tiết sản phẩm tồn tại
test('GET /api/products/:id - lấy chi tiết sản phẩm tồn tại thành công', async () => {
  const res = await request(app).get('/api/products/1');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, 1);
  assert.equal(res.body.data.sku, 'DU-001');
  assert.equal(res.body.data.category_name, 'Đồ uống');
  assert.equal(typeof res.body.data.price, 'number');
  assert.equal(typeof res.body.data.quantity, 'number');
  assert.equal(typeof res.body.data.min_stock, 'number');
});

// 3. GET sản phẩm không tồn tại
test('GET /api/products/:id - trả 404 khi sản phẩm không tồn tại', async () => {
  const res = await request(app).get('/api/products/99999');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.match(res.body.error.message, /Không tìm thấy/);
});

// 4. ID không hợp lệ
test('GET /api/products/:id - trả 400 khi ID là chuỗi không phải số nguyên dương', async () => {
  const res = await request(app).get('/api/products/abc');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /ID sản phẩm không hợp lệ/);
});

test('GET /api/products/:id - trả 400 khi ID là số 0 hoặc số âm', async () => {
  const resZero = await request(app).get('/api/products/0');
  assert.equal(resZero.status, 400);
  assert.equal(resZero.body.error.code, 'VALIDATION_ERROR');

  const resNegative = await request(app).get('/api/products/-5');
  assert.equal(resNegative.status, 400);
  assert.equal(resNegative.body.error.code, 'VALIDATION_ERROR');
});

// 5. Database mất kết nối (error handling)
test('GET /api/products - trả 500 khi database mất kết nối hoặc truy vấn lỗi', async () => {
  const originalQuery = db.query;
  try {
    // Giả lập lỗi mất kết nối database
    db.query = async () => {
      const err = new Error('Connection lost: The server closed the connection.');
      err.code = 'PROTOCOL_CONNECTION_LOST';
      throw err;
    };

    const res = await request(app).get('/api/products');
    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  } finally {
    // Khôi phục lại hàm query thật
    db.query = originalQuery;
  }
});
