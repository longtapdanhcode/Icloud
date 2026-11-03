const usersService = require("./users.service");
const { ok, created, paginated } = require("../../utils/response");
const AppError = require("../../utils/AppError");

// Kiểm tra ID hợp lệ
function validateId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw AppError.badRequest("ID nhân viên không hợp lệ");
  }

  return id;
}

// Kiểm tra họ tên
function validateFullName(full_name) {
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    full_name.trim().length > 100
  ) {
    throw AppError.badRequest(
      "Họ tên là bắt buộc và không được vượt quá 100 ký tự",
    );
  }

  return full_name.trim();
}

// Kiểm tra email
function validateEmail(email) {
  if (
    typeof email !== "string" ||
    email.trim().length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw AppError.badRequest("Email không hợp lệ");
  }

  return email.trim().toLowerCase();
}

// Kiểm tra mật khẩu
function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw AppError.badRequest(
      "Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte",
    );
  }

  return password;
}

// 1. GET /api/users
async function getAllStaff(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw AppError.badRequest("page phải >= 1 và limit phải từ 1 đến 100");
  }

  const search = String(req.query.search || "").trim();
  const status = req.query.status;

  if (search.length > 150) {
    throw AppError.badRequest("Từ khóa tìm kiếm quá dài");
  }

  if (status !== undefined && !["ACTIVE", "LOCKED"].includes(status)) {
    throw AppError.badRequest("Trạng thái không hợp lệ");
  }

  const sortBy = req.query.sortBy || "created_at";
  const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase();

  if (!["id", "full_name", "email", "created_at"].includes(sortBy)) {
    throw AppError.badRequest("Trường sắp xếp không hợp lệ");
  }

  if (!["ASC", "DESC"].includes(sortOrder)) {
    throw AppError.badRequest("Thứ tự sắp xếp không hợp lệ");
  }

  const result = await usersService.getAllStaff({
    page,
    limit,
    search,
    status,
    sortBy,
    sortOrder,
  });

  return paginated(res, result.users, {
    page,
    limit,
    total: result.total,
  });
}

// 2. GET /api/users/:id
async function getStaffById(req, res) {
  const id = validateId(req.params.id);
  const user = await usersService.getStaffById(id);

  return ok(res, user);
}

// 3. POST /api/users
async function createStaff(req, res) {
  const { full_name, email, password } = req.body || {};

  const user = await usersService.createStaff({
    full_name: validateFullName(full_name),
    email: validateEmail(email),
    password: validatePassword(password),
  });

  return created(res, user);
}

// 4. PUT /api/users/:id
async function updateStaff(req, res) {
  const id = validateId(req.params.id);
  const { full_name, email } = req.body || {};

  const user = await usersService.updateStaff(id, {
    full_name: validateFullName(full_name),
    email: validateEmail(email),
  });

  return ok(res, user);
}

// 5. PATCH /api/users/:id/status
async function updateStaffStatus(req, res) {
  const id = validateId(req.params.id);
  const { status } = req.body || {};

  if (!["ACTIVE", "LOCKED"].includes(status)) {
    throw AppError.badRequest("Status chỉ được là ACTIVE hoặc LOCKED");
  }

  // Không cho ADMIN tự khóa tài khoản của mình
  if (Number(req.user.id) === id && status === "LOCKED") {
    throw AppError.badRequest("Không thể tự khóa tài khoản đang đăng nhập");
  }

  const user = await usersService.updateStaffStatus(id, status);

  return ok(res, user);
}

// 6. PATCH /api/users/:id/password
async function resetStaffPassword(req, res) {
  const id = validateId(req.params.id);
  const { new_password } = req.body || {};

  const result = await usersService.resetStaffPassword(
    id,
    validatePassword(new_password),
  );

  return ok(res, result);
}

// 7. GET /api/users/statistics
async function getStatistics(req, res) {
  const statistics = await usersService.getStatistics();

  return ok(res, statistics);
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
