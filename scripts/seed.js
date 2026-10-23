// Nạp dữ liệu mẫu. Chạy lại nhiều lần không bị trùng.
// Tồn kho của sản phẩm được tính từ các phiếu nhập/xuất mẫu, nên luôn khớp với lịch sử.
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const db = require('../src/config/db');

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD || 'Staff@123';

const users = [
  { full_name: 'Quản trị viên', email: 'admin@inventory.local', password: ADMIN_PASSWORD, role: 'ADMIN' },
  { full_name: 'Nhân viên kho', email: 'staff@inventory.local', password: STAFF_PASSWORD, role: 'STAFF' },
];

const categories = [
  ['Đồ uống', 'Nước ngọt, nước suối, cà phê'],
  ['Bánh kẹo', 'Bánh, kẹo, snack'],
  ['Gia vị', 'Muối, đường, nước mắm, dầu ăn'],
  ['Đồ gia dụng', 'Vật dụng sinh hoạt hằng ngày'],
];

// [sku, name, category, price, min_stock]
const products = [
  ['DU-001', 'Nước suối 500ml', 'Đồ uống', 5000, 50],
  ['DU-002', 'Coca-Cola lon 330ml', 'Đồ uống', 10000, 30],
  ['DU-003', 'Cà phê hòa tan hộp 20 gói', 'Đồ uống', 55000, 10],
  ['BK-001', 'Bánh quy bơ 300g', 'Bánh kẹo', 45000, 15],
  ['BK-002', 'Snack khoai tây 52g', 'Bánh kẹo', 12000, 40],
  ['GV-001', 'Nước mắm 500ml', 'Gia vị', 38000, 20],
  ['GV-002', 'Dầu ăn 1L', 'Gia vị', 52000, 20],
  ['GV-003', 'Đường trắng 1kg', 'Gia vị', 25000, 25],
  ['GD-001', 'Nước rửa chén 750ml', 'Đồ gia dụng', 32000, 15],
  ['GD-002', 'Khăn giấy hộp', 'Đồ gia dụng', 18000, 20],
];

const suppliers = [
  ['Công ty TNHH Phân phối Minh An', '0901234567', 'sales@minhan.example', 'Quận 7, TP.HCM'],
  ['Đại lý Thực phẩm Hòa Bình', '0912345678', 'contact@hoabinh.example', 'Cầu Giấy, Hà Nội'],
  ['Nhà phân phối Gia Dụng Việt', '0923456789', 'info@giadungviet.example', 'Hải Châu, Đà Nẵng'],
];

// Phiếu mẫu: type, supplier index (null cho phiếu xuất), note, [[sku, qty, unit_price]]
const transactions = [
  ['IN', 0, 'Nhập hàng đầu kỳ', [['DU-001', 200, 3500], ['DU-002', 120, 7500], ['DU-003', 30, 45000]]],
  ['IN', 1, 'Nhập hàng đầu kỳ', [['BK-001', 40, 36000], ['BK-002', 100, 9000], ['GV-001', 60, 30000], ['GV-002', 50, 44000], ['GV-003', 80, 20000]]],
  ['IN', 2, 'Nhập hàng đầu kỳ', [['GD-001', 40, 25000], ['GD-002', 25, 13000]]],
  ['OUT', null, 'Xuất bán lẻ', [['DU-001', 170, 5000], ['BK-002', 70, 12000], ['GD-002', 12, 18000], ['DU-003', 22, 55000]]],
];

async function main() {
  if (env.isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_PASSWORD (and SEED_STAFF_PASSWORD) before seeding production');
  }

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.query(
      'INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [u.full_name, u.email, hash, u.role],
    );
  }

  await db.query('INSERT IGNORE INTO categories (name, description) VALUES ?', [categories]);
  const categoryRows = await db.query('SELECT id, name FROM categories');
  const categoryId = Object.fromEntries(categoryRows.map((c) => [c.name, c.id]));

  await db.query(
    'INSERT IGNORE INTO products (sku, name, category_id, price, quantity, min_stock) VALUES ?',
    [products.map(([sku, name, cat, price, min]) => [sku, name, categoryId[cat], price, 0, min])],
  );

  const [{ count: supplierCount }] = await db.query('SELECT COUNT(*) AS count FROM suppliers');
  if (supplierCount === 0) {
    await db.query('INSERT INTO suppliers (name, phone, email, address) VALUES ?', [suppliers]);
  }

  const [{ count: txCount }] = await db.query('SELECT COUNT(*) AS count FROM stock_transactions');
  if (txCount === 0) {
    const [admin] = await db.query('SELECT id FROM users WHERE email = ?', [users[0].email]);
    const supplierRows = await db.query('SELECT id FROM suppliers ORDER BY id');
    const productRows = await db.query('SELECT id, sku FROM products');
    const productId = Object.fromEntries(productRows.map((p) => [p.sku, p.id]));

    for (const [type, supplierIdx, note, items] of transactions) {
      await db.withTransaction(async (conn) => {
        const supplierId = supplierIdx === null ? null : supplierRows[supplierIdx].id;
        const [tx] = await conn.query(
          'INSERT INTO stock_transactions (type, supplier_id, created_by, note) VALUES (?, ?, ?, ?)',
          [type, supplierId, admin.id, note],
        );
        await conn.query(
          'INSERT INTO stock_transaction_items (transaction_id, product_id, quantity, unit_price) VALUES ?',
          [items.map(([sku, qty, price]) => [tx.insertId, productId[sku], qty, price])],
        );
        const sign = type === 'IN' ? 1 : -1;
        for (const [sku, qty] of items) {
          await conn.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [sign * qty, productId[sku]]);
        }
      });
    }
  }

  const [summary] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM suppliers) AS suppliers,
      (SELECT COUNT(*) FROM stock_transactions) AS transactions,
      (SELECT COUNT(*) FROM products WHERE quantity <= min_stock) AS low_stock
  `);
  console.log('[seed] done:', summary);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`[seed] login: ${users[0].email} / ${ADMIN_PASSWORD}, ${users[1].email} / ${STAFF_PASSWORD}`);
  }
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
