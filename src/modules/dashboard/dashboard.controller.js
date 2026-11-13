const dashboardService = require("./dashboard.service");
const { ok } = require("../../utils/response");

/**
 * Controller: Dashboard
 */

/**
 * GET /api/dashboard/summary
 * Lấy các số liệu tổng quan kho hàng
 */
async function getSummary(req, res) {
  const summary = await dashboardService.getSummary();
  return ok(res, summary);
}

/**
 * GET /api/dashboard/low-stock
 * Lấy danh sách sản phẩm cảnh báo tồn kho thấp (quantity <= min_stock)
 */
async function getLowStock(req, res) {
  const products = await dashboardService.getLowStockProducts();
  return ok(res, products);
}

module.exports = {
  getSummary,
  getLowStock,
};
