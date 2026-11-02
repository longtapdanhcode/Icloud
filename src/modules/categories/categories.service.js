const db = require('../../config/db');

/**
 * Service: Categories
 * Phụ trách: Người 1
 * Thực hiện truy vấn MySQL bằng parameterized queries
 */

/**
 * Lấy danh sách toàn bộ danh mục kèm số lượng sản phẩm liên kết
 * @returns {Promise<Array>}
 */
async function listCategories() {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.description,
      COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name, c.description
    ORDER BY c.id ASC
  `;

  return db.query(sql);
}

/**
 * Lấy chi tiết một danh mục theo ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getCategoryById(id) {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.description,
      COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    WHERE c.id = ?
    GROUP BY c.id, c.name, c.description
  `;

  const rows = await db.query(sql, [id]);
  return rows[0] || null;
}

/**
 * Tìm danh mục theo tên (hỗ trợ kiểm tra trùng khi tạo mới hoặc cập nhật)
 * @param {string} name
 * @param {number|null} [excludeId=null]
 * @returns {Promise<Object|null>}
 */
async function findCategoryByName(name, excludeId = null) {
  let sql = 'SELECT id, name FROM categories WHERE name = ?';
  const params = [name];

  if (excludeId !== null) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const rows = await db.query(sql, params);
  return rows[0] || null;
}

/**
 * Đếm số lượng sản phẩm liên kết tới danh mục
 * @param {number} categoryId
 * @returns {Promise<number>}
 */
async function countProductsByCategoryId(categoryId) {
  const sql = 'SELECT COUNT(*) AS total FROM products WHERE category_id = ?';
  const rows = await db.query(sql, [categoryId]);
  return Number(rows[0]?.total || 0);
}

/**
 * Tạo mới danh mục
 * @param {Object} data
 * @param {string} data.name
 * @param {string|null} data.description
 * @returns {Promise<Object>}
 */
async function createCategory({ name, description }) {
  const sql = 'INSERT INTO categories (name, description) VALUES (?, ?)';
  const result = await db.query(sql, [name, description]);

  return {
    id: result.insertId,
    name,
    description,
    product_count: 0,
  };
}

/**
 * Cập nhật danh mục theo ID
 * @param {number} id
 * @param {Object} data
 * @param {string} data.name
 * @param {string|null} data.description
 * @returns {Promise<Object>}
 */
async function updateCategory(id, { name, description }) {
  const sql = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';
  await db.query(sql, [name, description, id]);

  return getCategoryById(id);
}

/**
 * Xóa danh mục theo ID
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteCategory(id) {
  const sql = 'DELETE FROM categories WHERE id = ?';
  const result = await db.query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listCategories,
  getCategoryById,
  findCategoryByName,
  countProductsByCategoryId,
  createCategory,
  updateCategory,
  deleteCategory,
};
