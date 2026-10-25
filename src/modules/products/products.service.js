const db = require('../../config/db');

/**
 * Service: Products
 * Phụ trách: Người 1
 * Thực hiện truy vấn MySQL bằng parameterized queries
 */

/**
 * Lấy danh sách sản phẩm kèm phân trang và lọc tùy chọn
 * @param {Object} options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {string} [options.search]
 * @param {number} [options.category_id]
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function listProducts({ limit, offset, search, category_id }) {
  const conditions = [];
  const params = [];

  if (category_id) {
    conditions.push('p.category_id = ?');
    params.push(category_id);
  }

  if (search && search.trim()) {
    conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Đếm tổng số bản ghi phù hợp
  const countSql = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = Number(countRows[0]?.total || 0);

  // 2. Lấy danh sách sản phẩm kèm tên danh mục (JOIN categories)
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
    ORDER BY p.id ASC
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

module.exports = {
  listProducts,
  getProductById,
};
