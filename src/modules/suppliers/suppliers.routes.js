
const { Router } = require('express');
const controller = require('./suppliers.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/role');

const router = Router();

// Xem danh sách và chi tiết: ADMIN hoặc STAFF
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), controller.list);
router.get('/:id', authenticate, authorize('ADMIN', 'STAFF'), controller.findById);

// Thêm, sửa, xóa: chỉ ADMIN
router.post('/', authenticate, authorize('ADMIN'), controller.create);
router.put('/:id', authenticate, authorize('ADMIN'), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove);

module.exports = router;
