const bcrypt = require("bcryptjs");
const { query } = require("../../config/db");
const AppError = require("../../utils/AppError");

// Tạo tài khoản Staff
async function createStaff({ full_name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = full_name.trim();

  // Kiểm tra email đã tồn tại chưa
  const existingUsers = await query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail],
  );

  if (existingUsers.length > 0) {
    throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
  }

  // Mã hóa mật khẩu trước khi lưu
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    // Chỉ tạo STAFF, không nhận role từ phía client
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'STAFF')`,
      [normalizedName, normalizedEmail, passwordHash],
    );

    // Lấy thông tin tài khoản vừa tạo
    const users = await query(
      `SELECT id, full_name, email, role, created_at
       FROM users
       WHERE id = ?`,
      [result.insertId],
    );

    return users[0];
  } catch (error) {
    // Xử lý trường hợp hai request cùng tạo một email
    if (error.code === "ER_DUP_ENTRY") {
      throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
    }

    throw error;
  }
}

module.exports = { createStaff };
