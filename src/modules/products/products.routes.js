const { Router } = require('express');
const productsController = require('./products.controller');

// Module: products — phụ trách: Người 1
// Phân quyền theo quy ước (chờ Người 3 hoàn thành auth middleware):
// - GET: ADMIN, STAFF
// - POST, PUT: ADMIN, STAFF
// - DELETE: ADMIN (STAFF không được phép xóa sản phẩm)
// Khi Người 3 cung cấp middleware auth.js và role.js, gắn:
// router.post('/', authenticate, authorize('ADMIN', 'STAFF'), productsController.createProduct);
// router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), productsController.updateProduct);
// router.delete('/:id', authenticate, authorize('ADMIN'), productsController.deleteProduct);

const router = Router();

router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

module.exports = router;
