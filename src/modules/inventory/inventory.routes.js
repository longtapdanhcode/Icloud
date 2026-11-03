const { Router } = require('express');
const controller = require('./inventory.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/role');

const router = Router();

// Xem lịch sử nhập/xuất kho: ADMIN và STAFF
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  controller.list
);

// Tạo phiếu nhập/xuất kho: ADMIN và STAFF
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  controller.create
);

module.exports = router;
