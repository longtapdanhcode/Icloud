const usersService = require("./users.service");
const { ok, created } = require("../../utils/response");
const AppError = require("../../utils/AppError");

// GET /api/users
async function getAllStaff(req, res) {
  const users = await usersService.getAllStaff();

  return ok(res, users);
}

// POST /api/users
async function createStaff(req, res) {
  const { full_name, email, password } = req.body || {};

  // Kiểm tra họ tên
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    full_name.trim().length > 100
  ) {
    throw AppError.badRequest(
      "Họ tên là bắt buộc và không được vượt quá 100 ký tự",
    );
  }

  // Kiểm tra email
  if (
    typeof email !== "string" ||
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw AppError.badRequest("Email không hợp lệ");
  }

  // Kiểm tra mật khẩu
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw AppError.badRequest(
      "Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte",
    );
  }

  const user = await usersService.createStaff({
    full_name,
    email,
    password,
  });

  return created(res, user);
}

module.exports = {
  getAllStaff,
  createStaff,
};
