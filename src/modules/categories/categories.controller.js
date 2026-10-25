const categoriesService = require('./categories.service');
const { ok, created } = require('../../utils/response');
const AppError = require('../../utils/AppError');

/**
 * Controller: Categories
 * Phụ trách: Người 1
 */

/**
 * GET /api/categories
 * Lấy danh sách toàn bộ danh mục kèm số lượng sản phẩm
 */
async function getCategories(req, res) {
  const categories = await categoriesService.listCategories();
  return ok(res, categories);
}

/**
 * GET /api/categories/:id
 * Lấy chi tiết một danh mục theo ID
 */
async function getCategoryById(req, res) {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID danh mục không hợp lệ');
  }

  const categoryId = Number.parseInt(id, 10);
  const category = await categoriesService.getCategoryById(categoryId);

  if (!category) {
    throw AppError.notFound(`Không tìm thấy danh mục với ID ${id}`);
  }

  return ok(res, category);
}

/**
 * POST /api/categories
 * Tạo mới một danh mục
 */
async function createCategory(req, res) {
  const { name, description } = req.body || {};

  // Validate tên danh mục
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw AppError.badRequest('Tên danh mục là bắt buộc và không được để trống');
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    throw AppError.badRequest('Tên danh mục không được vượt quá 100 ký tự');
  }

  // Validate mô tả
  let trimmedDesc = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw AppError.badRequest('Mô tả danh mục phải là chuỗi văn bản');
    }
    trimmedDesc = description.trim() || null;
    if (trimmedDesc && trimmedDesc.length > 255) {
      throw AppError.badRequest('Mô tả danh mục không được vượt quá 255 ký tự');
    }
  }

  // Kiểm tra trùng tên danh mục
  const existing = await categoriesService.findCategoryByName(trimmedName);
  if (existing) {
    throw AppError.conflict('DUPLICATE_ENTRY', `Tên danh mục '${trimmedName}' đã tồn tại`);
  }

  const newCategory = await categoriesService.createCategory({
    name: trimmedName,
    description: trimmedDesc,
  });

  return created(res, newCategory);
}

/**
 * PUT /api/categories/:id
 * Cập nhật danh mục theo ID
 */
async function updateCategory(req, res) {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID danh mục không hợp lệ');
  }

  const categoryId = Number.parseInt(id, 10);
  const currentCategory = await categoriesService.getCategoryById(categoryId);

  if (!currentCategory) {
    throw AppError.notFound(`Không tìm thấy danh mục với ID ${id}`);
  }

  const { name, description } = req.body || {};

  // Xác định tên mới
  let nextName = currentCategory.name;
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw AppError.badRequest('Tên danh mục không được để trống');
    }
    nextName = name.trim();
    if (nextName.length > 100) {
      throw AppError.badRequest('Tên danh mục không được vượt quá 100 ký tự');
    }
  }

  // Xác định mô tả mới
  let nextDesc = currentCategory.description;
  if (description !== undefined) {
    if (description === null || description === '') {
      nextDesc = null;
    } else {
      if (typeof description !== 'string') {
        throw AppError.badRequest('Mô tả danh mục phải là chuỗi văn bản');
      }
      nextDesc = description.trim() || null;
      if (nextDesc && nextDesc.length > 255) {
        throw AppError.badRequest('Mô tả danh mục không được vượt quá 255 ký tự');
      }
    }
  }

  // Kiểm tra tên trùng với các danh mục khác
  if (nextName.toLowerCase() !== currentCategory.name.toLowerCase()) {
    const existing = await categoriesService.findCategoryByName(nextName, categoryId);
    if (existing) {
      throw AppError.conflict('DUPLICATE_ENTRY', `Tên danh mục '${nextName}' đã tồn tại`);
    }
  }

  const updatedCategory = await categoriesService.updateCategory(categoryId, {
    name: nextName,
    description: nextDesc,
  });

  return ok(res, updatedCategory);
}

/**
 * DELETE /api/categories/:id
 * Xóa danh mục nếu không có sản phẩm liên kết
 */
async function deleteCategory(req, res) {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    throw AppError.badRequest('ID danh mục không hợp lệ');
  }

  const categoryId = Number.parseInt(id, 10);
  const category = await categoriesService.getCategoryById(categoryId);

  if (!category) {
    throw AppError.notFound(`Không tìm thấy danh mục với ID ${id}`);
  }

  // Kiểm tra sản phẩm liên kết (khóa ngoại)
  const productCount = await categoriesService.countProductsByCategoryId(categoryId);
  if (productCount > 0) {
    throw AppError.conflict(
      'IN_USE',
      `Không thể xóa danh mục '${category.name}' vì đang có ${productCount} sản phẩm liên kết`,
    );
  }

  await categoriesService.deleteCategory(categoryId);

  return ok(res, {
    message: 'Đã xóa danh mục thành công',
    id: categoryId,
  });
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
