const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/AppError");
const { query } = require("../config/db");

// Xác minh Bearer token và kiểm tra trạng thái tài khoản.
async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  // Yêu cầu header có dạng: Authorization: Bearer <token>
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Vui lòng đăng nhập"));
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return next(AppError.unauthorized("Token không hợp lệ"));
  }

  if (!env.JWT_SECRET) {
    return next(new Error("JWT_SECRET chưa được cấu hình"));
  }

  let payload;

  try {
    // Kiểm tra chữ ký và thời hạn token.
    payload = jwt.verify(token, env.JWT_SECRET);

    // Kiểm tra cấu trúc payload.
    if (
      !payload ||
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      !["ADMIN", "STAFF"].includes(payload.role)
    ) {
      return next(AppError.unauthorized("Token không hợp lệ"));
    }
  } catch (error) {
    return next(AppError.unauthorized("Token không hợp lệ hoặc đã hết hạn"));
  }

  try {
    // Lấy thông tin tài khoản mới nhất từ database.
    const users = await query(
      `SELECT id, full_name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.id],
    );

    if (users.length === 0) {
      return next(AppError.unauthorized("Tài khoản không tồn tại"));
    }

    const user = users[0];

    // Kiểm tra tài khoản có bị khóa không.
    if (user.status === "LOCKED") {
      return next(AppError.forbidden("Tài khoản đã bị khóa"));
    }

    // Gắn thông tin mới nhất vào request.
    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate };
