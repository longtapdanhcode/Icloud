// Ném AppError trong service/controller; errorHandler sẽ chuyển thành response lỗi chuẩn
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Chưa đăng nhập') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Không đủ quyền') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code, message) {
    return new AppError(409, code, message);
  }
}

module.exports = AppError;
