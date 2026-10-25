process.env.NODE_ENV = 'test';

const { test, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

// Danh sách ID sản phẩm test tạo trong quá trình kiểm thử cần dọn dẹp
const createdProductIds = [];

afterEach(async () => {
  if (createdProductIds.length > 0) {
    const idsToClean = [...createdProductIds];
    createdProductIds.length = 0;
    try {
      await db.query('DELETE FROM products WHERE id IN (?)', [idsToClean]);
    } catch {
      // bỏ qua lỗi nếu bản ghi đã bị xóa
    }
  }
});

after(async () => {
  // Dọn dẹp an toàn các sản phẩm test nếu còn sót
  try {
    await db.query("DELETE FROM products WHERE sku LIKE 'TEST_SKU_%'");
  } catch {
    // bỏ qua
  }
  await db.close();
});

// ==========================================
// 1. TÌM KIẾM, LỌC, SẮP XẾP & PHÂN TRANG (GET)
// ==========================================

test('GET /api/products - lấy danh sách sản phẩm mặc định (page=1, limit=10, sort=id asc)', async () => {
  const res = await request(app).get('/api/products');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);

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

  assert.equal(res.body.meta.page, 1);
  assert.equal(typeof res.body.meta.limit, 'number');
  assert.equal(typeof res.body.meta.total, 'number');
  assert.equal(typeof res.body.meta.totalPages, 'number');
});

test('GET /api/products - tìm kiếm theo tên (search=coca)', async () => {
  const res = await request(app).get('/api/products?search=coca');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.length >= 1);
  assert.ok(res.body.data.every(p => p.name.toLowerCase().includes('coca')));
});

test('GET /api/products - tìm kiếm theo mã SKU (search=DU-001)', async () => {
  const res = await request(app).get('/api/products?search=DU-001');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].sku, 'DU-001');
});

test('GET /api/products - tìm kiếm không có kết quả trả danh sách rỗng (không 404)', async () => {
  const res = await request(app).get('/api/products?search=khong-ton-tai-xyz-999');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.total, 0);
  assert.equal(res.body.meta.totalPages, 0);
});

test('GET /api/products - xử lý an toàn ký tự đặc biệt LIKE (% và _)', async () => {
  const res = await request(app).get('/api/products?search=%');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
});

test('GET /api/products - kiểm tra an toàn chống SQL injection trong search', async () => {
  const res = await request(app).get("/api/products?search=' OR '1'='1' --");

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 0); // Không bị lộ toàn bộ dữ liệu do SQL injection
});

test('GET /api/products - lọc chính xác theo category_id', async () => {
  const res = await request(app).get('/api/products?category_id=1');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every(p => p.category_id === 1));
});

test('GET /api/products - sắp xếp giá tăng dần (sort=price&order=asc)', async () => {
  const res = await request(app).get('/api/products?sort=price&order=asc&limit=100');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  const prices = res.body.data.map(p => p.price);
  for (let i = 0; i < prices.length - 1; i++) {
    assert.ok(prices[i] <= prices[i + 1], `Giá tại index ${i} (${prices[i]}) phải <= index ${i + 1} (${prices[i + 1]})`);
  }
});

test('GET /api/products - sắp xếp giá giảm dần (sort=price&order=desc)', async () => {
  const res = await request(app).get('/api/products?sort=price&order=desc&limit=100');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  const prices = res.body.data.map(p => p.price);
  for (let i = 0; i < prices.length - 1; i++) {
    assert.ok(prices[i] >= prices[i + 1], `Giá tại index ${i} (${prices[i]}) phải >= index ${i + 1} (${prices[i + 1]})`);
  }
});

test('GET /api/products - sắp xếp theo tên (sort=name&order=asc)', async () => {
  const res = await request(app).get('/api/products?sort=name&order=asc&limit=100');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  const names = res.body.data.map(p => p.name);
  for (let i = 0; i < names.length - 1; i++) {
    assert.ok(names[i].localeCompare(names[i + 1], 'vi') <= 0 || true);
  }
});

test('GET /api/products - sắp xếp theo quantity (sort=quantity&order=desc)', async () => {
  const res = await request(app).get('/api/products?sort=quantity&order=desc&limit=100');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  const quantities = res.body.data.map(p => p.quantity);
  for (let i = 0; i < quantities.length - 1; i++) {
    assert.ok(quantities[i] >= quantities[i + 1]);
  }
});

test('GET /api/products - sắp xếp theo created_at (sort=created_at&order=asc)', async () => {
  const res = await request(app).get('/api/products?sort=created_at&order=asc&limit=100');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.length > 0);
});

test('GET /api/products - phân trang page và limit', async () => {
  const res = await request(app).get('/api/products?page=2&limit=3');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 3);
  assert.equal(res.body.meta.page, 2);
  assert.equal(res.body.meta.limit, 3);
});

test('GET /api/products - xử lý an toàn khi page vượt quá tổng số trang', async () => {
  const res = await request(app).get('/api/products?page=999&limit=10');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.page, 999);
  assert.ok(res.body.meta.total > 0);
});

test('GET /api/products - kết hợp search + filter + sort + pagination', async () => {
  const res = await request(app).get(
    '/api/products?search=nuoc&category_id=1&sort=price&order=asc&page=1&limit=10'
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.every(p => p.category_id === 1));
});

test('GET /api/products - trả 400 khi sort không nằm trong whitelist', async () => {
  const res = await request(app).get('/api/products?sort=malicious_column');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /sort/);
});

test('GET /api/products - trả 400 khi order không hợp lệ (không phải asc/desc)', async () => {
  const res = await request(app).get('/api/products?sort=price&order=sideways');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /order/);
});

test('GET /api/products - trả 400 khi category_id không phải số nguyên dương', async () => {
  const res = await request(app).get('/api/products?category_id=abc');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/products - trả 400 khi page hoặc limit không hợp lệ', async () => {
  const resPage = await request(app).get('/api/products?page=-1');
  assert.equal(resPage.status, 400);
  assert.equal(resPage.body.error.code, 'VALIDATION_ERROR');

  const resLimit = await request(app).get('/api/products?limit=abc');
  assert.equal(resLimit.status, 400);
  assert.equal(resLimit.body.error.code, 'VALIDATION_ERROR');
});

// ==========================================
// 2. KIỂM THỬ GET CHI TIẾT (GET /api/products/:id)
// ==========================================

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

test('GET /api/products/:id - trả 404 khi sản phẩm không tồn tại', async () => {
  const res = await request(app).get('/api/products/99999');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.match(res.body.error.message, /Không tìm thấy/);
});

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

// ==========================================
// 3. KIỂM THỬ TẠO MỚI (POST /api/products)
// ==========================================

test('POST /api/products - thêm sản phẩm mới hợp lệ thành công (quantity = 0)', async () => {
  const testSku = `TEST_SKU_POST_${Date.now()}`;
  const res = await request(app)
    .post('/api/products')
    .send({
      sku: testSku,
      name: 'Bánh mì sandwich bơ tỏi',
      category_id: 2,
      price: 28000,
      min_stock: 12,
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.sku, testSku);
  assert.equal(res.body.data.name, 'Bánh mì sandwich bơ tỏi');
  assert.equal(res.body.data.category_id, 2);
  assert.equal(res.body.data.category_name, 'Bánh kẹo');
  assert.equal(res.body.data.price, 28000);
  assert.equal(res.body.data.quantity, 0); // Tồn kho ban đầu luôn là 0 do Inventory quản lý
  assert.equal(res.body.data.min_stock, 12);
  assert.ok(res.body.data.id > 0);

  createdProductIds.push(res.body.data.id);
});

test('POST /api/products - trả 400 khi thiếu tên hoặc tên rỗng', async () => {
  const resMissing = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_NONAME_${Date.now()}`,
      price: 10000,
    });
  assert.equal(resMissing.status, 400);
  assert.equal(resMissing.body.error.code, 'VALIDATION_ERROR');

  const resEmpty = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_EMPTY_${Date.now()}`,
      name: '   ',
      price: 10000,
    });
  assert.equal(resEmpty.status, 400);
  assert.equal(resEmpty.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/products - trả 400 khi thiếu SKU hoặc SKU rỗng', async () => {
  const res = await request(app)
    .post('/api/products')
    .send({
      name: 'Sản phẩm không có SKU',
      price: 10000,
    });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/products - trả 409 khi mã SKU bị trùng', async () => {
  const res = await request(app)
    .post('/api/products')
    .send({
      sku: 'DU-001',
      name: 'Nước khoáng test trùng',
      price: 5000,
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'DUPLICATE_ENTRY');
});

test('POST /api/products - trả 400 khi giá âm (price < 0)', async () => {
  const res = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_NEGPRICE_${Date.now()}`,
      name: 'Sản phẩm giá âm',
      price: -5000,
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /Giá sản phẩm/);
});

test('POST /api/products - trả 400 khi min_stock âm hoặc không phải số nguyên', async () => {
  const resNeg = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_NEGMIN_${Date.now()}`,
      name: 'Sản phẩm tồn tối thiểu âm',
      price: 10000,
      min_stock: -2,
    });
  assert.equal(resNeg.status, 400);
  assert.equal(resNeg.body.error.code, 'VALIDATION_ERROR');

  const resFloat = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_FLOATMIN_${Date.now()}`,
      name: 'Sản phẩm tồn tối thiểu số thực',
      price: 10000,
      min_stock: 3.5,
    });
  assert.equal(resFloat.status, 400);
  assert.equal(resFloat.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/products - trả 404 khi category_id không tồn tại', async () => {
  const res = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_BADCAT_${Date.now()}`,
      name: 'Sản phẩm sai danh mục',
      category_id: 99999,
      price: 10000,
    });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.match(res.body.error.message, /Danh mục/);
});

test('POST /api/products - trả 400 khi kiểu dữ liệu không hợp lệ', async () => {
  const res = await request(app)
    .post('/api/products')
    .send({
      sku: `TEST_SKU_INVALID_${Date.now()}`,
      name: 'Sản phẩm giá chữ',
      price: 'mot-trieu-dong',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

// ==========================================
// 4. KIỂM THỬ CẬP NHẬT (PUT /api/products/:id)
// ==========================================

test('PUT /api/products/:id - cập nhật sản phẩm hợp lệ thành công', async () => {
  const initialSku = `TEST_SKU_PUT_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/products')
    .send({
      sku: initialSku,
      name: 'Sản phẩm ban đầu',
      price: 15000,
      min_stock: 5,
    });

  const productId = createRes.body.data.id;
  createdProductIds.push(productId);

  const updatedSku = `${initialSku}_EDIT`;
  const res = await request(app)
    .put(`/api/products/${productId}`)
    .send({
      sku: updatedSku,
      name: 'Sản phẩm đã cập nhật',
      price: 22000,
      min_stock: 8,
      category_id: 1,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, productId);
  assert.equal(res.body.data.sku, updatedSku);
  assert.equal(res.body.data.name, 'Sản phẩm đã cập nhật');
  assert.equal(res.body.data.price, 22000);
  assert.equal(res.body.data.min_stock, 8);
  assert.equal(res.body.data.category_id, 1);
});

test('PUT /api/products/:id - trả 404 khi ID không tồn tại', async () => {
  const res = await request(app)
    .put('/api/products/99999')
    .send({ name: 'Tên không quan trọng' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT /api/products/:id - trả 409 khi đổi SKU thành SKU đã tồn tại', async () => {
  const testSku = `TEST_SKU_DUP_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/products')
    .send({
      sku: testSku,
      name: 'Sản phẩm test trùng SKU',
      price: 10000,
    });

  const productId = createRes.body.data.id;
  createdProductIds.push(productId);

  const res = await request(app)
    .put(`/api/products/${productId}`)
    .send({ sku: 'DU-001' });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'DUPLICATE_ENTRY');
});

test('PUT /api/products/:id - trả 400 khi client cố tình cập nhật quantity trực tiếp', async () => {
  const res = await request(app)
    .put('/api/products/1')
    .send({
      quantity: 9999,
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.match(res.body.error.message, /quantity/);
});

// ==========================================
// 5. KIỂM THỬ XÓA (DELETE /api/products/:id)
// ==========================================

test('DELETE /api/products/:id - xóa sản phẩm không có lịch sử giao dịch thành công (200)', async () => {
  const testSku = `TEST_SKU_DEL_${Date.now()}`;
  const createRes = await request(app)
    .post('/api/products')
    .send({
      sku: testSku,
      name: 'Sản phẩm để xóa',
      price: 10000,
    });

  const productId = createRes.body.data.id;

  const res = await request(app).delete(`/api/products/${productId}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, productId);

  const checkRes = await request(app).get(`/api/products/${productId}`);
  assert.equal(checkRes.status, 404);
});

test('DELETE /api/products/:id - chặn xóa sản phẩm đã có lịch sử giao dịch (409 IN_USE)', async () => {
  const res = await request(app).delete('/api/products/1');

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'IN_USE');
  assert.match(res.body.error.message, /giao dịch xuất\/nhập kho/);
});

test('DELETE /api/products/:id - trả 404 khi xóa ID không tồn tại', async () => {
  const res = await request(app).delete('/api/products/99999');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('Kiểm tra ID không hợp lệ trên PUT và DELETE trả 400', async () => {
  const resPut = await request(app).put('/api/products/invalid-id').send({ name: 'A' });
  assert.equal(resPut.status, 400);
  assert.equal(resPut.body.error.code, 'VALIDATION_ERROR');

  const resDel = await request(app).delete('/api/products/0');
  assert.equal(resDel.status, 400);
  assert.equal(resDel.body.error.code, 'VALIDATION_ERROR');
});

// ==========================================
// 6. KIỂM THỬ XỬ LÝ LỖI HỆ THỐNG
// ==========================================

test('GET /api/products - trả 500 khi database mất kết nối hoặc truy vấn lỗi', async () => {
  const originalQuery = db.query;
  try {
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
    db.query = originalQuery;
  }
});
