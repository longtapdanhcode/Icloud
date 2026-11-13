const db = require("../../config/db");

/**
 * Service: Dashboard
 */

/**
 * Lấy số liệu tổng quan hệ thống:
 * - total_products: Tổng số loại sản phẩm trong kho
 * - total_quantity: Tổng số lượng tồn kho của tất cả sản phẩm
 * - total_inventory_value: Tổng giá trị tồn kho ước tính (SUM(quantity * price))
 * - total_transactions: Tổng số phiếu xuất/nhập kho đã phát sinh
 * - in_transactions: Số phiếu nhập kho (type = 'IN')
 * - out_transactions: Số phiếu xuất kho (type = 'OUT')
 * - low_stock_count: Số sản phẩm có quantity <= min_stock
 * @returns {Promise<Object>}
 */
async function getSummary() {
  const sql = `
    SELECT
      COUNT(*) AS total_products,
      COALESCE(SUM(quantity), 0) AS total_quantity,
      COALESCE(SUM(quantity * price), 0) AS total_inventory_value,
      COALESCE(SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END), 0) AS low_stock_count,
      (SELECT COUNT(*) FROM stock_transactions) AS total_transactions,
      (SELECT COUNT(*) FROM stock_transactions WHERE type = 'IN') AS in_transactions,
      (SELECT COUNT(*) FROM stock_transactions WHERE type = 'OUT') AS out_transactions
    FROM products
  `;

  const rows = await db.query(sql);
  const row = rows[0] || {};

  return {
    total_products: Number(row.total_products || 0),
    total_quantity: Number(row.total_quantity || 0),
    total_inventory_value: Number(row.total_inventory_value || 0),
    low_stock_count: Number(row.low_stock_count || 0),
    total_transactions: Number(row.total_transactions || 0),
    in_transactions: Number(row.in_transactions || 0),
    out_transactions: Number(row.out_transactions || 0),
  };
}

/**
 * Lấy danh sách sản phẩm có tồn kho chạm hoặc dưới ngưỡng tối thiểu (quantity <= min_stock)
 * Sắp xếp theo: mức thiếu hụt/nguy cơ cao nhất (quantity - min_stock tăng dần, quantity ASC)
 * @returns {Promise<Array>}
 */
async function getLowStockProducts() {
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
      (p.min_stock - p.quantity) AS stock_deficit,
      p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.quantity <= p.min_stock
    ORDER BY p.quantity ASC, (p.min_stock - p.quantity) DESC, p.id ASC
  `;

  const rows = await db.query(sql);

  return rows.map((item) => ({
    id: item.id,
    category_id: item.category_id,
    category_name: item.category_name,
    sku: item.sku,
    name: item.name,
    price: Number(item.price),
    quantity: Number(item.quantity),
    min_stock: Number(item.min_stock),
    stock_deficit: Number(item.stock_deficit),
    created_at: item.created_at,
  }));
}

module.exports = {
  getSummary,
  getLowStockProducts,
};
