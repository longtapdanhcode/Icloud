const { Router } = require('express');

// Module: inventory — phụ trách: Người 2
// Endpoint dự kiến:
//   POST /api/stock-transactions   (bắt buộc dùng db.withTransaction)
//   GET  /api/stock-transactions
// Gợi ý cấu trúc: inventory.controller.js (đọc req, trả response) và inventory.service.js (logic + SQL)

const router = Router();

module.exports = router;
