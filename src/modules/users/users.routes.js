const express = require("express");

const usersController = require("./users.controller");
const { authenticate } = require("../../middlewares/auth");
const { authorize } = require("../../middlewares/role");

const router = express.Router();

// Tất cả API quản lý nhân viên yêu cầu ADMIN
router.use(authenticate, authorize("ADMIN"));

// Thống kê: phải đặt trước /:id
router.get("/statistics", usersController.getStatistics);

// Danh sách nhân viên
router.get("/", usersController.getAllStaff);

// Xem chi tiết
router.get("/:id", usersController.getStaffById);

// Thêm nhân viên
router.post("/", usersController.createStaff);

// Cập nhật thông tin
router.put("/:id", usersController.updateStaff);

// Khóa / mở khóa
router.patch("/:id/status", usersController.updateStaffStatus);

// Đặt lại mật khẩu
router.patch("/:id/password", usersController.resetStaffPassword);

module.exports = router;
