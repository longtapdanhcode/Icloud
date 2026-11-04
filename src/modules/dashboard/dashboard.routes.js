const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/role');
const dashboardController = require('./dashboard.controller');

// Module: dashboard — phụ trách: Người 3
// Phân quyền theo quy ước:
// - Yêu cầu đăng nhập: authenticate
// - GET: ADMIN và STAFF đều được phép xem

const router = Router();

router.use(authenticate, authorize('ADMIN', 'STAFF'));

router.get('/summary', dashboardController.getSummary);
router.get('/low-stock', dashboardController.getLowStock);

module.exports = router;
