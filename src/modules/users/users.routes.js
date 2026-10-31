const express = require("express");

const usersController = require("./users.controller");
const { authenticate } = require("../../middlewares/auth");
const { authorize } = require("../../middlewares/role");

const router = express.Router();

// Chỉ ADMIN được tạo tài khoản STAFF
router.post("/", authenticate, authorize("ADMIN"), usersController.create);

module.exports = router;
