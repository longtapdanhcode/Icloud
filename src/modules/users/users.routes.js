const express = require("express");

const usersController = require("./users.controller");
const { authenticate } = require("../../middlewares/auth");
const { authorize } = require("../../middlewares/role");

const router = express.Router();

// Tất cả API quản lý nhân viên yêu cầu đăng nhập và quyền ADMIN
router.use(authenticate, authorize("ADMIN"));

// GET /api/users: Xem danh sách nhân viên
router.get("/", usersController.getAllStaff);

// POST /api/users: Tạo tài khoản nhân viên
router.post("/", usersController.createStaff);

module.exports = router;
