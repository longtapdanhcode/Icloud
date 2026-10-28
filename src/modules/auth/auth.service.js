const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { query } = require("../../config/db");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

async function login(email, password) {
  // Chuẩn hóa email.
  const normalizedEmail = email.trim().toLowerCase();

  // Tìm tài khoản trong database.
  const users = await query(
    `SELECT id, full_name, email, password_hash, role
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail],
  );

  const user = users[0];

  // Không tiết lộ email có tồn tại hay không.
  if (!user) {
    throw AppError.unauthorized("Email hoặc mật khẩu không đúng");
  }

  // So sánh mật khẩu với password_hash đã lưu.
  const passwordIsValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordIsValid) {
    throw AppError.unauthorized("Email hoặc mật khẩu không đúng");
  }

  // Kiểm tra cấu hình JWT.
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET chưa được cấu hình trong file .env");
  }

  // Tạo JWT chứa thông tin cần thiết của người dùng.
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  );

  // Trả dữ liệu cho controller.
  return {
    token,
    token_type: "Bearer",
    expires_in: env.JWT_EXPIRES_IN,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
}

async function getCurrentUser(userId) {
  const users = await query(
    `SELECT id, full_name, email, role, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (users.length === 0) {
    throw AppError.unauthorized("Tài khoản không còn tồn tại");
  }

  return users[0];
}

module.exports = {
  login,
  getCurrentUser,
};
