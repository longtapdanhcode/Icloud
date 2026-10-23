const { Router } = require('express');

// Module: products — phụ trách: Người 1
// Endpoint dự kiến:
//   GET    /api/products        (?page, limit, search, category_id, sort, order)
//   POST   /api/products
//   GET    /api/products/:id
//   PUT    /api/products/:id
//   DELETE /api/products/:id
// Gợi ý cấu trúc: products.controller.js (đọc req, trả response) và products.service.js (logic + SQL)

const router = Router();

module.exports = router;
