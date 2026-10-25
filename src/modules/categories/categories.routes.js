const { Router } = require('express');
const categoriesController = require('./categories.controller');

// Module: categories — phụ trách: Người 1
// Phân quyền theo quy ước (chờ Người 3 hoàn thành auth middleware):
// - GET: ADMIN, STAFF (hoặc public nội bộ)
// - POST, PUT, DELETE: ADMIN
// Khi Người 3 cung cấp auth.js và role.js, gắn:
// router.post('/', authenticate, authorize('ADMIN'), categoriesController.createCategory);

const router = Router();

router.get('/', categoriesController.getCategories);
router.get('/:id', categoriesController.getCategoryById);
router.post('/', categoriesController.createCategory);
router.put('/:id', categoriesController.updateCategory);
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
