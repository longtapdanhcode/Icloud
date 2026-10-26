const AppError = require("../utils/AppError");

// Chỉ cho phép những vai trò được chỉ định truy cập.
function authorize(...allowedRoles) {
  return function (req, res, next) {
    // authenticate phải chạy trước authorize.
    if (!req.user) {
      return next(AppError.unauthorized("Vui lòng đăng nhập"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden("Bạn không có quyền thực hiện thao tác này"),
      );
    }

    next();
  };
}

module.exports = { authorize };
