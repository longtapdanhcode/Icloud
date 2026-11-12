// Module: auth
// Endpoint dự kiến:
//   POST /api/auth/login
//   GET  /api/auth/me

const express = require("express");

const authController = require("./auth.controller");
const { authenticate } = require("../../middlewares/auth");

const router = express.Router();

// Đăng nhập, không cần token.
router.post("/login", authController.login);

// Lấy thông tin người dùng, bắt buộc có token hợp lệ.
router.get("/me", authenticate, authController.me);

module.exports = router;
