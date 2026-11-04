process.env.NODE_ENV = "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const rawSupertest = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const db = require("../src/config/db");
const env = require("../src/config/env");

const testSecret = env.JWT_SECRET || "test-jwt-secret-cloud-inventory";

const adminToken = jwt.sign(
  { id: 1, email: "admin@cloudinventory.vn", role: "ADMIN" },
  testSecret,
  { expiresIn: "1h" },
);

const staffToken = jwt.sign(
  { id: 2, email: "staff@cloudinventory.vn", role: "STAFF" },
  testSecret,
  { expiresIn: "1h" },
);

let testCategoryId;
let testLowStockProductId;
let testNormalProductId;

const suffix = `${Date.now()}-${process.pid}`;

// ==========================================
// CHUẨN BỊ DỮ LIỆU TEST
// ==========================================

before(async () => {
  // Tạo danh mục test
  const catResult = await db.query(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    [`TEST_CAT_DASH_${suffix}`, "Danh mục test cho Dashboard"],
  );

  testCategoryId = catResult.insertId;

  // Tạo sản phẩm tồn kho thấp: 2 <= 10
  const p1 = await db.query(
    `INSERT INTO products
      (category_id, sku, name, price, quantity, min_stock)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      testCategoryId,
      `SKU_LOW_${suffix}`,
      `Sản phẩm Tồn Thấp ${suffix}`,
      20000,
      2,
      10,
    ],
  );

  testLowStockProductId = p1.insertId;

  // Tạo sản phẩm tồn kho bình thường: 50 > 10
  const p2 = await db.query(
    `INSERT INTO products
      (category_id, sku, name, price, quantity, min_stock)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      testCategoryId,
      `SKU_NORMAL_${suffix}`,
      `Sản phẩm Bình Thường ${suffix}`,
      15000,
      50,
      10,
    ],
  );

  testNormalProductId = p2.insertId;
});

// ==========================================
// DỌN DẸP DỮ LIỆU TEST
// ==========================================

after(async () => {
  try {
    const productIds = [
      testLowStockProductId,
      testNormalProductId,
    ].filter(Boolean);

    if (productIds.length > 0) {
      await db.query(
        "DELETE FROM products WHERE id IN (?)",
        [productIds],
      );
    }

    if (testCategoryId) {
      await db.query(
        "DELETE FROM categories WHERE id = ?",
        [testCategoryId],
      );
    }
  } finally {
    await db.close();
  }
});

// ==========================================
// 1. KIỂM THỬ XÁC THỰC VÀ PHÂN QUYỀN
// ==========================================

test(
  "GET /api/dashboard/summary - chặn 401 khi không có token",
  async () => {
    const res = await rawSupertest(app)
      .get("/api/dashboard/summary");

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  },
);

test(
  "GET /api/dashboard/low-stock - chặn 401 khi không có token",
  async () => {
    const res = await rawSupertest(app)
      .get("/api/dashboard/low-stock");

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  },
);

test(
  "GET /api/dashboard/summary - STAFF được phép truy cập",
  async () => {
    const res = await rawSupertest(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  },
);

test(
  "GET /api/dashboard/low-stock - STAFF được phép truy cập",
  async () => {
    const res = await rawSupertest(app)
      .get("/api/dashboard/low-stock")
      .set("Authorization", `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  },
);

// ==========================================
// 2. KIỂM THỬ SUMMARY ĐỐI CHIẾU DATABASE
// ==========================================

test(
  "GET /api/dashboard/summary - số liệu thống kê phải khớp DB",
  async () => {
    // Lấy dữ liệu từ API
    const res = await rawSupertest(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;

    // Lấy số liệu trực tiếp từ database
    const [expected] = await db.query(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(quantity), 0) AS total_quantity,
        COALESCE(SUM(quantity * price), 0) AS total_inventory_value,
        COALESCE(SUM(
          CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END
        ), 0) AS low_stock_count
      FROM products
    `);

    const [transactions] = await db.query(`
      SELECT
        COUNT(*) AS total_transactions,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN 1 ELSE 0 END), 0)
          AS in_transactions,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN 1 ELSE 0 END), 0)
          AS out_transactions
      FROM stock_transactions
    `);

    // Đối chiếu 4 chỉ số sản phẩm
    assert.equal(
      Number(data.total_products),
      Number(expected.total_products),
    );

    assert.equal(
      Number(data.total_quantity),
      Number(expected.total_quantity),
    );

    assert.equal(
      Number(data.total_inventory_value),
      Number(expected.total_inventory_value),
    );

    assert.equal(
      Number(data.low_stock_count),
      Number(expected.low_stock_count),
    );

    // Đối chiếu 3 chỉ số phiếu nhập/xuất
    assert.equal(
      Number(data.total_transactions),
      Number(transactions.total_transactions),
    );

    assert.equal(
      Number(data.in_transactions),
      Number(transactions.in_transactions),
    );

    assert.equal(
      Number(data.out_transactions),
      Number(transactions.out_transactions),
    );
  },
);

// ==========================================
// 3. KIỂM THỬ LOW-STOCK
// ==========================================

test(
  "GET /api/dashboard/low-stock - chỉ trả về sản phẩm tồn kho thấp",
  async () => {
    const res = await rawSupertest(app)
      .get("/api/dashboard/low-stock")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const products = res.body.data;

    // Kiểm tra mọi sản phẩm trong danh sách
    for (const item of products) {
      assert.ok(
        Number(item.quantity) <= Number(item.min_stock),
        `Sản phẩm ${item.sku} không thỏa điều kiện tồn kho thấp`,
      );

      assert.equal(
        Number(item.stock_deficit),
        Number(item.min_stock) - Number(item.quantity),
      );

      assert.ok("category_name" in item);
    }

    // Phải chứa sản phẩm tồn kho thấp vừa tạo
    const foundLow = products.find(
      (p) => Number(p.id) === Number(testLowStockProductId),
    );

    assert.ok(
      foundLow,
      "Danh sách phải chứa sản phẩm tồn kho thấp vừa tạo",
    );

    assert.equal(foundLow.sku, `SKU_LOW_${suffix}`);
    assert.equal(Number(foundLow.stock_deficit), 8);

    // Không được chứa sản phẩm tồn kho bình thường
    const foundNormal = products.find(
      (p) => Number(p.id) === Number(testNormalProductId),
    );

    assert.equal(
      foundNormal,
      undefined,
      "Không được chứa sản phẩm tồn kho an toàn",
    );
  },
);