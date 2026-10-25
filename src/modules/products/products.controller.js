const productsService = require('./products.service');
const { parsePagination } = require('../../utils/pagination');
const { ok, paginated } = require('../../utils/response');
const AppError = require('../../utils/AppError');

/**
 * Controller: Products
 * Phụ trách: Người 1
 */

/**
 * GET /api/products
 * Lấy danh sách sản phẩm có phân trang (page, limit) và lọc tùy chọn
 */
async function getProducts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  let categoryId;
  if (req.query.category_id !== undefined) {
    const parsedCatId = Number.parseInt(req.query.category_id, 10);
    if (!Number.isInteger(parsedCatId) || parsedCatId <= 0) {
      throw AppError.badRequest('category_id không hợp lệ');
    }
    categoryId = parsedCatId;
  }

  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const { items, total } = await productsService.listProducts({
    limit,
    offset,
    search,
    category_id: categoryId,
  });

  return paginated(res, items, { page, limit, total });
}

/**
 * GET /api/products/:id
 * Lấy chi tiết một sản phẩm theo ID
 */
async function getProductById(req, res) {
  const { id } = req.params;

  // Kiểm tra ID phải là số nguyên dương hợp lệ
  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID sản phẩm không hợp lệ');
  }

  const productId = Number.parseInt(id, 10);
  const product = await productsService.getProductById(productId);

  if (!product) {
    throw AppError.notFound(`Không tìm thấy sản phẩm với ID ${id}`);
  }

  return ok(res, product);
}

module.exports = {
  getProducts,
  getProductById,
};
