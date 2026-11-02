const bcrypt = require("bcryptjs");

const { query } = require("../../config/db");
const AppError = require("../../utils/AppError");

// Các cột được phép sắp xếp.
// Không nhận trực tiếp tên cột từ request để tránh SQL injection.
const SORT_COLUMNS = {
  id: "id",
  full_name: "full_name",
  email: "email",
  created_at: "created_at",
};

// Kiểm tra nhân viên có tồn tại hay không
async function findStaffById(id) {
  const users = await query(
    `SELECT id, full_name, email, role, status, created_at
     FROM users
     WHERE id = ? AND role = 'STAFF'
     LIMIT 1`,
    [id],
  );

  if (users.length === 0) {
    throw AppError.notFound("Không tìm thấy nhân viên");
  }

  return users[0];
}

// 1. Lấy danh sách, tìm kiếm, lọc và phân trang
async function getAllStaff({
  page = 1,
  limit = 10,
  search = "",
  status,
  sortBy = "created_at",
  sortOrder = "DESC",
}) {
  const conditions = ["role = 'STAFF'"];
  const params = [];

  if (search) {
    conditions.push("(full_name LIKE ? OR email LIKE ?)");
    const keyword = `%${search}%`;
    params.push(keyword, keyword);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE ${whereClause}`,
    params,
  );

  const total = countResult[0].total;

  const column = SORT_COLUMNS[sortBy] || "created_at";
  const direction = sortOrder === "ASC" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;

  const users = await query(
    `SELECT id, full_name, email, role, status, created_at
     FROM users
     WHERE ${whereClause}
     ORDER BY ${column} ${direction}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { users, total };
}

// 2. Xem chi tiết nhân viên
async function getStaffById(id) {
  return findStaffById(id);
}

// 3. Thêm nhân viên
async function createStaff({ full_name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUsers = await query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail],
  );

  if (existingUsers.length > 0) {
    throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      `INSERT INTO users
        (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'STAFF', 'ACTIVE')`,
      [full_name.trim(), normalizedEmail, passwordHash],
    );

    return findStaffById(result.insertId);
  } catch (error) {
    // Xử lý trường hợp hai request đồng thời tạo cùng email
    if (error.code === "ER_DUP_ENTRY") {
      throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
    }

    throw error;
  }
}

// 4. Cập nhật họ tên và email
async function updateStaff(id, { full_name, email }) {
  await findStaffById(id);

  const normalizedEmail = email.trim().toLowerCase();

  const existingUsers = await query(
    `SELECT id FROM users
     WHERE email = ? AND id <> ?
     LIMIT 1`,
    [normalizedEmail, id],
  );

  if (existingUsers.length > 0) {
    throw AppError.conflict(
      "DUPLICATE_ENTRY",
      "Email đã được sử dụng bởi tài khoản khác",
    );
  }

  try {
    await query(
      `UPDATE users
       SET full_name = ?, email = ?
       WHERE id = ? AND role = 'STAFF'`,
      [full_name.trim(), normalizedEmail, id],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw AppError.conflict("DUPLICATE_ENTRY", "Email đã được sử dụng");
    }

    throw error;
  }

  return findStaffById(id);
}

// 5. Khóa hoặc mở khóa tài khoản
async function updateStaffStatus(id, status) {
  await findStaffById(id);

  await query(
    `UPDATE users
     SET status = ?
     WHERE id = ? AND role = 'STAFF'`,
    [status, id],
  );

  return findStaffById(id);
}

// 6. ADMIN đặt lại mật khẩu
async function resetStaffPassword(id, newPassword) {
  await findStaffById(id);

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await query(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ? AND role = 'STAFF'`,
    [passwordHash, id],
  );

  return {
    message: "Đặt lại mật khẩu thành công",
  };
}

// 7. Thống kê nhân viên
async function getStatistics() {
  const rows = await query(
    `SELECT
       COUNT(*) AS total_staff,
       SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)
         AS active_staff,
       SUM(CASE WHEN status = 'LOCKED' THEN 1 ELSE 0 END)
         AS locked_staff,
       SUM(
         CASE
           WHEN created_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')
           THEN 1
           ELSE 0
         END
       ) AS new_staff_this_month
     FROM users
     WHERE role = 'STAFF'`,
  );

  return rows[0];
}

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
  resetStaffPassword,
  getStatistics,
};
