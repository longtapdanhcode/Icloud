const crypto = require('crypto');
const env = require('../config/env');

// Gắn mã request cho mỗi request: trả về trong header X-Request-Id và có trong log,
// để khi người dùng báo lỗi chỉ cần gửi mã này là tìm được dòng log tương ứng.
function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

// Production: mỗi request là một dòng JSON, dễ tìm/lọc trên Render Logs.
// Bỏ qua /health thành công vì Render gọi liên tục, sẽ làm ngập log.
function jsonRequestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.originalUrl === '/health' && res.statusCode === 200) return;

    const entry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      type: 'request',
      time: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(1)),
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('user-agent'),
    };
    console.log(JSON.stringify(entry));
  });

  next();
}

function logError(req, err) {
  if (env.isProduction) {
    console.error(JSON.stringify({
      level: 'error',
      type: 'exception',
      time: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      error: err.message,
      code: err.code,
      stack: err.stack,
    }));
  } else {
    console.error(`[error] ${req.id} ${req.method} ${req.originalUrl}`, err);
  }
}

module.exports = { requestId, jsonRequestLogger, logError };
