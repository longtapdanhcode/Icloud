process.env.NODE_ENV = 'test';

const { test, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const rawSupertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');
const env = require('../src/config/env');

const testSecret = env.JWT_SECRET || 'test-jwt-secret-cloud-inventory';

const adminToken = jwt.sign(
  { id: 1, email: 'admin@cloudinventory.vn', role: 'ADMIN' },
  testSecret,
  { expiresIn: '1h' }
);

const staffToken = jwt.sign(
  { id: 2, email: 'staff@cloudinventory.vn', role: 'STAFF' },
  testSecret,
  { expiresIn: '1h' }
);

// Wrapper supertest có sẵn Authorization header cho ADMIN để các test nghiệp vụ không bị 401
function request(appInstance) {
  const agent = rawSupertest(appInstance);
  return {
    get: (url) => agent.get(url).set('Authorization', `Bearer ${adminToken}`),
    post: (url) => agent.post(url).set('Authorization', `Bearer ${adminToken}`),
    put: (url) => agent.put(url).set('Authorization', `Bearer ${adminToken}`),
    delete: (url) => agent.delete(url).set('Authorization', `Bearer ${adminToken}`),
  };
}

// Danh sách ID test tạo trong quá trình kiểm thử cần dọn dẹp
const createdCategoryIds = [];

afterEach(async () => {
  if (createdCategoryIds.length > 0) {
    const idsToClean = [...createdCategoryIds];
    createdCategoryIds.length = 0;
    try {
      await db.query('DELETE FROM categories WHERE id IN (?)', [idsToClean]);
    } catch {
      // bỏ qua lỗi dọn dẹp nếu bản ghi đã bị xóa
    }
  }
});

after(async () => {
  // Dọn dẹp an toàn các category test nếu còn sót
  try {
    await db.query("DELETE FROM categories WHERE name LIKE 'TEST_CAT_%'");
  } catch {
    // bỏ qua
  }
  await db.close();
});

// 1. Lấy danh sách thành công
test('GET /api/categories - lấy danh sách toàn bộ danh mục thành công', async () => {
  const res = await request(app).get('/api/categories');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 4);

  const item = res.body.data[0];
  assert.ok('id' in item);
  assert.ok('name' in item);
  assert.ok('description' in item);
  assert.ok('product_count' in item);
});

// 2. Lấy chi tiết danh mục theo ID
test('GET /api/categories/:id - lấy chi tiết danh mục hợp lệ', async () => {
  const res = await request(app).get('/api/categories/1');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, 1);
  assert.equal(res.body.data.name, 'Đồ uống');
  assert.equal(typeof res.body.data.product_count, 'number');
});

test('GET /api/categories/:id - trả 404 khi ID không tồn tại', async () => {
  const res = await request(app).get('/api/categories/99999');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

// 3. Thêm danh mục hợp lệ
test('POST /api/categories - thêm danh mục mới hợp lệ thành công (201)', async () => {
  const testName = `TEST_CAT_CREATE_${Date.now()}`;
  const res = await request(app)
    .post('/api/categories')
    .send({
      name: testName,
      description: 'Mô tả danh mục test tự động',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, testName);
  assert.equal(res.body.data.description, 'Mô tả danh mục test tự động');
  assert.ok(res.body.data.id > 0);

  createdCategoryIds.push(res.body.data.id);
});

// 4. Thêm danh mục thiếu tên hoặc tên rỗng
test('POST /api/categories - trả 400 khi thiếu trường name', async () => {
  const res = await request(app)
    .post('/api/categories')
    .send({ description: 'Không có name' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/categories - trả 400 khi name chỉ chứa khoảng trắng', async () => {
  const res = await request(app)
    .post('/api/categories')
    .send({ name: '   ', description: 'Khoảng trắng' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

// 5. Thêm danh mục trùng tên
test('POST /api/categories - trả 409 khi tên danh mục bị trùng', async () => {
  const res = await request(app)
    .post('/api/categories')
    .send({ name: 'Đồ uống', description: 'Trùng tên với seed' });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'DUPLICATE_ENTRY');
});

// 6. Cập nhật danh mục
test('PUT /api/categories/:id - cập nhật danh mục thành công', async () => {
  // Tạo danh mục test riêng để cập nhật
  const initialName = `TEST_CAT_UPDATE_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/categories')
    .send({ name: initialName, description: 'Gốc' });

  const catId = createRes.body.data.id;
  createdCategoryIds.push(catId);

  const updatedName = `${initialName}_EDIT`;
  const res = await request(app)
    .put(`/api/categories/${catId}`)
    .send({ name: updatedName, description: 'Đã sửa' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, catId);
  assert.equal(res.body.data.name, updatedName);
  assert.equal(res.body.data.description, 'Đã sửa');
});

test('PUT /api/categories/:id - trả 404 khi cập nhật ID không tồn tại', async () => {
  const res = await request(app)
    .put('/api/categories/99999')
    .send({ name: 'Tên không quan trọng' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT /api/categories/:id - trả 409 khi đổi tên thành tên danh mục khác đã có', async () => {
  // Tạo danh mục test
  const testName = `TEST_CAT_DUP_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/categories')
    .send({ name: testName });

  const catId = createRes.body.data.id;
  createdCategoryIds.push(catId);

  // Thử đổi sang 'Bánh kẹo' (danh mục id 2 đã tồn tại)
  const res = await request(app)
    .put(`/api/categories/${catId}`)
    .send({ name: 'Bánh kẹo' });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'DUPLICATE_ENTRY');
});

// 7. Xóa danh mục hợp lệ
test('DELETE /api/categories/:id - xóa danh mục hợp lệ (chưa có sản phẩm)', async () => {
  const testName = `TEST_CAT_DELETE_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/categories')
    .send({ name: testName });

  const catId = createRes.body.data.id;

  const res = await request(app).delete(`/api/categories/${catId}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, catId);

  // Xác minh không còn trong DB
  const checkRes = await request(app).get(`/api/categories/${catId}`);
  assert.equal(checkRes.status, 404);
});

// 8. Không cho xóa danh mục đang có sản phẩm
test('DELETE /api/categories/:id - chặn xóa danh mục đang có sản phẩm liên kết (409 IN_USE)', async () => {
  // Danh mục 1 'Đồ uống' đang có 3 sản phẩm liên kết
  const res = await request(app).delete('/api/categories/1');

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'IN_USE');
  assert.match(res.body.error.message, /sản phẩm liên kết/);
});

test('DELETE /api/categories/:id - trả 404 khi xóa ID không tồn tại', async () => {
  const res = await request(app).delete('/api/categories/99999');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

// 9. Kiểm tra ID không hợp lệ
test('Kiểm tra ID không hợp lệ trên /api/categories/:id trả 400', async () => {
  const resStr = await request(app).get('/api/categories/invalid-id');
  assert.equal(resStr.status, 400);
  assert.equal(resStr.body.error.code, 'VALIDATION_ERROR');

  const resZero = await request(app).put('/api/categories/0').send({ name: 'A' });
  assert.equal(resZero.status, 400);
  assert.equal(resZero.body.error.code, 'VALIDATION_ERROR');

  const resNeg = await request(app).delete('/api/categories/-1');
  assert.equal(resNeg.status, 400);
  assert.equal(resNeg.body.error.code, 'VALIDATION_ERROR');
});

// 10. Kiểm tra lỗi database
test('GET /api/categories - trả 500 khi database mất kết nối', async () => {
  const originalQuery = db.query;
  try {
    db.query = async () => {
      const err = new Error('Database connection failed');
      err.code = 'ECONNREFUSED';
      throw err;
    };

    const res = await request(app).get('/api/categories');
    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  } finally {
    db.query = originalQuery;
  }
});

// 11. Kiểm tra xác thực và phân quyền
test('GET /api/categories - chặn 401 khi không truyền Authorization header', async () => {
  const res = await rawSupertest(app).get('/api/categories');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('DELETE /api/categories/:id - chặn 403 khi tài khoản STAFF cố gắng xóa danh mục', async () => {
  const res = await rawSupertest(app)
    .delete('/api/categories/1')
    .set('Authorization', `Bearer ${staffToken}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

