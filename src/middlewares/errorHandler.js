const AppError = require('../utils/AppError');
const env = require('../config/env');
const { logError } = require('./requestLogger');

function notFound(req, res, next) {
  next(AppError.notFound(`Không tìm thấy ${req.method} ${req.originalUrl}`));
}

// Một số lỗi MySQL phổ biến được đổi sang mã lỗi nghiệp vụ dễ hiểu
function fromMysqlError(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return AppError.conflict('DUPLICATE_ENTRY', 'Dữ liệu đã tồn tại');
    case 'ER_ROW_IS_REFERENCED_2':
      return AppError.conflict('IN_USE', 'Dữ liệu đang được sử dụng, không thể xóa');
    case 'ER_NO_REFERENCED_ROW_2':
      return AppError.badRequest('Dữ liệu tham chiếu không tồn tại');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return AppError.badRequest('Giá trị không hợp lệ');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let appErr = err instanceof AppError ? err : fromMysqlError(err);

  if (err.type === 'entity.parse.failed') {
    appErr = AppError.badRequest('JSON không hợp lệ');
  }

  if (!appErr) {
    logError(req, err);
    appErr = new AppError(500, 'INTERNAL_ERROR', 'Lỗi hệ thống');
  }

  const body = { success: false, error: { code: appErr.code, message: appErr.message } };
  if (appErr.details) body.error.details = appErr.details;
  if (appErr.status === 500) {
    // Người dùng gửi mã này khi báo lỗi để tìm đúng dòng log
    body.error.requestId = req.id;
    if (!env.isProduction) body.error.debug = err.message;
  }

  res.status(appErr.status).json(body);
}

module.exports = { notFound, errorHandler };
