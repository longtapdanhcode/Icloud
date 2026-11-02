const bcrypt = require("bcryptjs");

const { query } = require("../../config/db");
const AppError = require("../../utils/AppError");

// Lấy danh sách nhân viên
async function getAllStaff() {
  return query(
    `SELECT id, full_name, email, role, created_at
     FROM users
     WHERE role = 'STAFF'
     ORDER BY id DESC`,
  );
}

// Tạo tài khoản nhân viên
async function createStaff({ full_name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Kiểm tra email đã tồn tại chưa
  const existingUsers = await query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail],
  );

  if (existingUsers.length > 0) {
    throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
  }

  // Mã hóa mật khẩu trước khi lưu database
  const passwordHash = await bcrypt.hash(password, 10);

  // Luôn tạo tài khoản với role STAFF
  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES (?, ?, ?, 'STAFF')`,
    [full_name.trim(), normalizedEmail, passwordHash],
  );

  // Trả về thông tin tài khoản, không trả password_hash
  const users = await query(
    `SELECT id, full_name, email, role, created_at
     FROM users
     WHERE id = ?`,
    [result.insertId],
  );

  return users[0];
}

module.exports = {
  getAllStaff,
  createStaff,
};
