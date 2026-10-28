const authService = require("./auth.service");
const { ok } = require("../../utils/response");

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body || {};

  // Kiểm tra dữ liệu đầu vào.
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    const AppError = require("../../utils/AppError");
    throw AppError.badRequest("Email và mật khẩu là bắt buộc");
  }

  const result = await authService.login(email, password);

  return ok(res, result);
}

// GET /api/auth/me
async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);

  return ok(res, user);
}

module.exports = {
  login,
  me,
};
