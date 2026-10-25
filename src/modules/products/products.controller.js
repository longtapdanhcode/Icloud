const productsService = require('./products.service');
const { parsePagination } = require('../../utils/pagination');
const { ok, created, paginated } = require('../../utils/response');
const AppError = require('../../utils/AppError');

/**
 * Controller: Products
 * Phụ trách: Người 1
 */

const ALLOWED_SORTS = ['name', 'price', 'quantity', 'created_at', 'id'];
const ALLOWED_ORDERS = ['asc', 'desc'];

/**
 * GET /api/products
 * Lấy danh sách sản phẩm có tìm kiếm (search), lọc (category_id), sắp xếp (sort, order) và phân trang (page, limit)
 */
async function getProducts(req, res) {
  // 1. Validate page nếu có truyền
  if (req.query.page !== undefined && req.query.page !== '') {
    if (!/^[1-9]\d*$/.test(String(req.query.page).trim())) {
      throw AppError.badRequest('Tham số page phải là số nguyên dương');
    }
  }

  // 2. Validate limit nếu có truyền
  if (req.query.limit !== undefined && req.query.limit !== '') {
    if (!/^[1-9]\d*$/.test(String(req.query.limit).trim())) {
      throw AppError.badRequest('Tham số limit phải là số nguyên dương');
    }
  }

  const { page, limit, offset } = parsePagination(req.query);

  // 3. Validate category_id nếu có truyền
  let categoryId;
  if (req.query.category_id !== undefined && req.query.category_id !== '') {
    const rawCatId = String(req.query.category_id).trim();
    if (!/^[1-9]\d*$/.test(rawCatId)) {
      throw AppError.badRequest('category_id không hợp lệ');
    }
    categoryId = Number.parseInt(rawCatId, 10);
  }

  // 4. Validate sort nếu có truyền
  let sort = 'id';
  if (req.query.sort !== undefined && req.query.sort !== '') {
    const sortLower = String(req.query.sort).trim().toLowerCase();
    if (!ALLOWED_SORTS.includes(sortLower)) {
      const publicSorts = ALLOWED_SORTS.filter(s => s !== 'id').join(', ');
      throw AppError.badRequest(`Cột sắp xếp (sort) không hợp lệ. Chỉ cho phép: ${publicSorts}`);
    }
    sort = sortLower;
  }

  // 5. Validate order nếu có truyền
  let order = 'asc';
  if (req.query.order !== undefined && req.query.order !== '') {
    const orderLower = String(req.query.order).trim().toLowerCase();
    if (!ALLOWED_ORDERS.includes(orderLower)) {
      throw AppError.badRequest("Thứ tự sắp xếp (order) phải là 'asc' hoặc 'desc'");
    }
    order = orderLower;
  }

  // 6. Search query
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const { items, total } = await productsService.listProducts({
    limit,
    offset,
    search,
    category_id: categoryId,
    sort,
    order,
  });

  return paginated(res, items, { page, limit, total });
}

/**
 * GET /api/products/:id
 * Lấy chi tiết một sản phẩm theo ID
 */
async function getProductById(req, res) {
  const { id } = req.params;

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

/**
 * POST /api/products
 * Thêm sản phẩm mới (tồn kho ban đầu luôn là 0 để Inventory quản lý qua phiếu kho)
 */
async function createProduct(req, res) {
  const { sku, name, category_id, price, min_stock } = req.body || {};

  // 1. Validate SKU
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    throw AppError.badRequest('Mã SKU là bắt buộc và không được để trống');
  }
  const trimmedSku = sku.trim();
  if (trimmedSku.length > 50) {
    throw AppError.badRequest('Mã SKU không được vượt quá 50 ký tự');
  }

  // Kiểm tra trùng SKU
  const existingSku = await productsService.getProductBySku(trimmedSku);
  if (existingSku) {
    throw AppError.conflict('DUPLICATE_ENTRY', `Mã SKU '${trimmedSku}' đã tồn tại`);
  }

  // 2. Validate Name
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw AppError.badRequest('Tên sản phẩm là bắt buộc và không được để trống');
  }
  const trimmedName = name.trim();
  if (trimmedName.length > 150) {
    throw AppError.badRequest('Tên sản phẩm không được vượt quá 150 ký tự');
  }

  // 3. Validate Category ID (nếu cung cấp thì danh mục phải tồn tại)
  let finalCategoryId = null;
  if (category_id !== undefined && category_id !== null) {
    const rawCat = String(category_id).trim();
    if (!/^[1-9]\d*$/.test(rawCat)) {
      throw AppError.badRequest('category_id không hợp lệ');
    }
    const parsedCatId = Number.parseInt(rawCat, 10);
    const catExists = await productsService.checkCategoryExists(parsedCatId);
    if (!catExists) {
      throw AppError.notFound('Danh mục không tồn tại');
    }
    finalCategoryId = parsedCatId;
  }

  // 4. Validate Price
  let finalPrice = 0;
  if (price !== undefined && price !== null) {
    if (typeof price !== 'number' || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
      throw AppError.badRequest('Giá sản phẩm phải là số không âm');
    }
    finalPrice = price;
  }

  // 5. Validate Min Stock
  let finalMinStock = 0;
  if (min_stock !== undefined && min_stock !== null) {
    if (typeof min_stock !== 'number' || !Number.isInteger(min_stock) || min_stock < 0) {
      throw AppError.badRequest('Mức tồn tối thiểu (min_stock) phải là số nguyên không âm');
    }
    finalMinStock = min_stock;
  }

  const newProduct = await productsService.createProduct({
    sku: trimmedSku,
    name: trimmedName,
    category_id: finalCategoryId,
    price: finalPrice,
    min_stock: finalMinStock,
  });

  return created(res, newProduct);
}

/**
 * PUT /api/products/:id
 * Cập nhật thông tin sản phẩm (chặn sửa trực tiếp quantity)
 */
async function updateProduct(req, res) {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID sản phẩm không hợp lệ');
  }

  // Chặn cập nhật trực tiếp quantity theo quy ước kiến trúc Inventory
  if (req.body && req.body.quantity !== undefined) {
    throw AppError.badRequest(
      'Không được phép chỉnh sửa số lượng tồn kho (quantity) trực tiếp qua API sản phẩm. Vui lòng sử dụng phân hệ Quản lý Kho.'
    );
  }

  const productId = Number.parseInt(id, 10);
  const currentProduct = await productsService.getProductById(productId);

  if (!currentProduct) {
    throw AppError.notFound(`Không tìm thấy sản phẩm với ID ${id}`);
  }

  const { sku, name, category_id, price, min_stock } = req.body || {};

  // 1. Cập nhật SKU nếu có
  let nextSku = currentProduct.sku;
  if (sku !== undefined) {
    if (typeof sku !== 'string' || !sku.trim()) {
      throw AppError.badRequest('Mã SKU không được để trống');
    }
    const trimmedSku = sku.trim();
    if (trimmedSku.length > 50) {
      throw AppError.badRequest('Mã SKU không được vượt quá 50 ký tự');
    }
    if (trimmedSku.toLowerCase() !== currentProduct.sku.toLowerCase()) {
      const dup = await productsService.getProductBySku(trimmedSku, productId);
      if (dup) {
        throw AppError.conflict('DUPLICATE_ENTRY', `Mã SKU '${trimmedSku}' đã tồn tại`);
      }
    }
    nextSku = trimmedSku;
  }

  // 2. Cập nhật Name nếu có
  let nextName = currentProduct.name;
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw AppError.badRequest('Tên sản phẩm không được để trống');
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 150) {
      throw AppError.badRequest('Tên sản phẩm không được vượt quá 150 ký tự');
    }
    nextName = trimmedName;
  }

  // 3. Cập nhật Category ID nếu có
  let nextCategoryId = currentProduct.category_id;
  if (category_id !== undefined) {
    if (category_id === null) {
      nextCategoryId = null;
    } else {
      const rawCat = String(category_id).trim();
      if (!/^[1-9]\d*$/.test(rawCat)) {
        throw AppError.badRequest('category_id không hợp lệ');
      }
      const parsedCatId = Number.parseInt(rawCat, 10);
      const catExists = await productsService.checkCategoryExists(parsedCatId);
      if (!catExists) {
        throw AppError.notFound('Danh mục không tồn tại');
      }
      nextCategoryId = parsedCatId;
    }
  }

  // 4. Cập nhật Price nếu có
  let nextPrice = currentProduct.price;
  if (price !== undefined) {
    if (typeof price !== 'number' || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
      throw AppError.badRequest('Giá sản phẩm phải là số không âm');
    }
    nextPrice = price;
  }

  // 5. Cập nhật Min Stock nếu có
  let nextMinStock = currentProduct.min_stock;
  if (min_stock !== undefined) {
    if (typeof min_stock !== 'number' || !Number.isInteger(min_stock) || min_stock < 0) {
      throw AppError.badRequest('Mức tồn tối thiểu (min_stock) phải là số nguyên không âm');
    }
    nextMinStock = min_stock;
  }

  const updatedProduct = await productsService.updateProduct(productId, {
    sku: nextSku,
    name: nextName,
    category_id: nextCategoryId,
    price: nextPrice,
    min_stock: nextMinStock,
  });

  return ok(res, updatedProduct);
}

/**
 * DELETE /api/products/:id
 * Xóa sản phẩm nếu chưa có lịch sử giao dịch kho
 */
async function deleteProduct(req, res) {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID sản phẩm không hợp lệ');
  }

  const productId = Number.parseInt(id, 10);
  const currentProduct = await productsService.getProductById(productId);

  if (!currentProduct) {
    throw AppError.notFound(`Không tìm thấy sản phẩm với ID ${id}`);
  }

  // Kiểm tra lịch sử giao dịch xuất/nhập kho (bảng stock_transaction_items)
  const txCount = await productsService.countStockTransactionItemsByProductId(productId);
  if (txCount > 0) {
    throw AppError.conflict(
      'IN_USE',
      `Không thể xóa sản phẩm '${currentProduct.name}' vì đã có ${txCount} chi tiết giao dịch xuất/nhập kho liên kết`,
    );
  }

  await productsService.deleteProduct(productId);

  return ok(res, {
    message: 'Đã xóa sản phẩm thành công',
    id: productId,
  });
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
