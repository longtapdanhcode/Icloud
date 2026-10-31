const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/role');
const productsController = require('./products.controller');

// Module: products — phụ trách: Người 1
// Phân quyền theo quy ước:
// - Tất cả route yêu cầu: authenticate
// - GET: ADMIN, STAFF
// - POST, PUT: ADMIN, STAFF
// - DELETE: ADMIN (STAFF không được phép xóa sản phẩm)

const router = Router();

// Yêu cầu đăng nhập cho toàn bộ phân hệ sản phẩm
router.use(authenticate);

router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);
router.post('/', authorize('ADMIN', 'STAFF'), productsController.createProduct);
router.put('/:id', authorize('ADMIN', 'STAFF'), productsController.updateProduct);
router.delete('/:id', authorize('ADMIN'), productsController.deleteProduct);

module.exports = router;
