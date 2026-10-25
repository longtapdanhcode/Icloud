const db = require('../../config/db');

/**
 * Service: Products
 * Phụ trách: Người 1
 * Thực hiện truy vấn MySQL bằng parameterized queries
 */

/**
 * Escape các ký tự đại diện đặc biệt của mệnh đề SQL LIKE
 * @param {string} str
 * @returns {string}
 */
function escapeLike(str) {
  return str.replace(/([%_\\])/g, '\\$1');
}

/**
 * Danh sách cột được phép sắp xếp (whitelist an toàn chống SQL injection)
 */
const SORTABLE_COLUMNS = {
  name: 'p.name',
  price: 'p.price',
  quantity: 'p.quantity',
  created_at: 'p.created_at',
  id: 'p.id',
};

/**
 * Lấy danh sách sản phẩm kèm tìm kiếm, lọc, sắp xếp và phân trang
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {string} [options.search]
 * @param {number} [options.category_id]
 * @param {string} [options.sort='id']
 * @param {string} [options.order='asc']
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function listProducts({ limit, offset, search, category_id, sort = 'id', order = 'asc' }) {
  const conditions = [];
  const params = [];

  // 1. Lọc theo danh mục
  if (category_id) {
    conditions.push('p.category_id = ?');
    params.push(category_id);
  }

  // 2. Tìm kiếm theo tên hoặc mã SKU (hỗ trợ chuỗi con, xử lý ký tự đặc biệt)
  if (search && typeof search === 'string' && search.trim()) {
    conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
    const term = `%${escapeLike(search.trim())}%`;
    params.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 3. Đếm tổng số bản ghi phù hợp với bộ lọc hiện tại
  const countSql = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = Number(countRows[0]?.total || 0);

  // 4. Xác định cột sắp xếp an toàn từ whitelist
  const sortKey = (sort || 'id').toLowerCase();
  const sortColumn = SORTABLE_COLUMNS[sortKey] || 'p.id';
  const sortDirection = (order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // Thứ tự phụ theo id để kết quả phân trang luôn ổn định
  const secondaryOrder = sortColumn === 'p.id' ? '' : `, p.id ${sortDirection}`;

  // 5. Truy vấn danh sách bản ghi với LIMIT và OFFSET
  const selectSql = `
    SELECT
      p.id,
      p.category_id,
      c.name AS category_name,
      p.sku,
      p.name,
      p.price,
      p.quantity,
      p.min_stock,
      p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}${secondaryOrder}
    LIMIT ? OFFSET ?
  `;

  const items = await db.query(selectSql, [...params, limit, offset]);

  return { items, total };
}

/**
 * Lấy chi tiết một sản phẩm theo ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getProductById(id) {
  const sql = `
    SELECT
      p.id,
      p.category_id,
      c.name AS category_name,
      p.sku,
      p.name,
      p.price,
      p.quantity,
      p.min_stock,
      p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;

  const rows = await db.query(sql, [id]);
  return rows[0] || null;
}

/**
 * Tìm sản phẩm theo mã SKU (hỗ trợ kiểm tra trùng lặp)
 * @param {string} sku
 * @param {number|null} [excludeId=null]
 * @returns {Promise<Object|null>}
 */
async function getProductBySku(sku, excludeId = null) {
  let sql = 'SELECT id, sku FROM products WHERE sku = ?';
  const params = [sku];

  if (excludeId !== null) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const rows = await db.query(sql, params);
  return rows[0] || null;
}

/**
 * Kiểm tra danh mục có tồn tại hay không
 * @param {number} categoryId
 * @returns {Promise<boolean>}
 */
async function checkCategoryExists(categoryId) {
  const sql = 'SELECT id FROM categories WHERE id = ?';
  const rows = await db.query(sql, [categoryId]);
  return rows.length > 0;
}

/**
 * Đếm số lượng giao dịch nhập/xuất kho của sản phẩm
 * @param {number} productId
 * @returns {Promise<number>}
 */
async function countStockTransactionItemsByProductId(productId) {
  const sql = 'SELECT COUNT(*) AS total FROM stock_transaction_items WHERE product_id = ?';
  const rows = await db.query(sql, [productId]);
  return Number(rows[0]?.total || 0);
}

/**
 * Tạo mới sản phẩm (quantity khởi tạo mặc định là 0 để Inventory quản lý qua phiếu kho)
 * @param {Object} data
 * @param {string} data.sku
 * @param {string} data.name
 * @param {number|null} data.category_id
 * @param {number} data.price
 * @param {number} data.min_stock
 * @returns {Promise<Object>}
 */
async function createProduct({ sku, name, category_id, price, min_stock }) {
  const sql = `
    INSERT INTO products (sku, name, category_id, price, quantity, min_stock)
    VALUES (?, ?, ?, ?, 0, ?)
  `;

  const result = await db.query(sql, [sku, name, category_id, price, min_stock]);
  return getProductById(result.insertId);
}

/**
 * Cập nhật thông tin sản phẩm (tuyệt đối không can thiệp quantity trực tiếp)
 * @param {number} id
 * @param {Object} data
 * @param {string} data.sku
 * @param {string} data.name
 * @param {number|null} data.category_id
 * @param {number} data.price
 * @param {number} data.min_stock
 * @returns {Promise<Object>}
 */
async function updateProduct(id, { sku, name, category_id, price, min_stock }) {
  const sql = `
    UPDATE products
    SET sku = ?, name = ?, category_id = ?, price = ?, min_stock = ?
    WHERE id = ?
  `;

  await db.query(sql, [sku, name, category_id, price, min_stock, id]);
  return getProductById(id);
}

/**
 * Xóa sản phẩm theo ID
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteProduct(id) {
  const sql = 'DELETE FROM products WHERE id = ?';
  const result = await db.query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listProducts,
  getProductById,
  getProductBySku,
  checkCategoryExists,
  countStockTransactionItemsByProductId,
  createProduct,
  updateProduct,
  deleteProduct,
  SORTABLE_COLUMNS,
};
