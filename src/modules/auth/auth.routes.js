// const { Router } = require('express');
// const router = Router();

// module.exports = router;

// // Module: auth — phụ trách: Người 3
// // Endpoint dự kiến:
// //   POST /api/auth/login
// //   GET  /api/auth/me
// // Gợi ý cấu trúc: auth.controller.js (đọc req, trả response) và auth.service.js (logic + SQL)

const express = require("express");

const authController = require("./auth.controller");
const { authenticate } = require("../../middlewares/auth");

const router = express.Router();

// Đăng nhập, không cần token.
router.post("/login", authController.login);

// Lấy thông tin người dùng, bắt buộc có token hợp lệ.
router.get("/me", authenticate, authController.me);

module.exports = router;
