const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/AppError");

// Xác minh Bearer token trước khi cho phép truy cập API.
function authenticate(req, res, next) {
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

  try {
    // Kiểm tra chữ ký và thời hạn token.
    const payload = jwt.verify(token, env.JWT_SECRET);

    // Chỉ chấp nhận payload có đủ thông tin theo quy ước dự án.
    if (
      !payload ||
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      !["ADMIN", "STAFF"].includes(payload.role)
    ) {
      return next(AppError.unauthorized("Token không hợp lệ"));
    }

    // Gắn thông tin người dùng vào request để controller dùng tiếp.
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    // Token hết hạn, sai chữ ký hoặc không hợp lệ.
    return next(AppError.unauthorized("Token không hợp lệ hoặc đã hết hạn"));
  }
}

module.exports = { authenticate };
