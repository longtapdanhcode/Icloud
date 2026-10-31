const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/role');
const categoriesController = require('./categories.controller');

// Module: categories — phụ trách: Người 1
// Phân quyền theo quy ước:
// - Tất cả route yêu cầu: authenticate
// - GET: ADMIN, STAFF
// - POST, PUT: ADMIN, STAFF
// - DELETE: ADMIN (STAFF không được phép xóa danh mục)

const router = Router();

// Yêu cầu đăng nhập cho toàn bộ phân hệ danh mục
router.use(authenticate);

router.get('/', categoriesController.getCategories);
router.get('/:id', categoriesController.getCategoryById);
router.post('/', authorize('ADMIN', 'STAFF'), categoriesController.createCategory);
router.put('/:id', authorize('ADMIN', 'STAFF'), categoriesController.updateCategory);
router.delete('/:id', authorize('ADMIN'), categoriesController.deleteCategory);

module.exports = router;
