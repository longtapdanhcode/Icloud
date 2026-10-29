const AppError = require('../utils/AppError');

// Giới hạn số request theo IP trong một khoảng thời gian (lưu trong bộ nhớ).
// Đủ dùng vì app chạy 1 instance; nếu chạy nhiều instance cần lưu chung (Redis).
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  // Dọn các IP đã hết hạn để Map không phình mãi
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  function middleware(req, res, next) {
    const now = Date.now();
    let entry = hits.get(req.ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, entry);
    }
    entry.count += 1;

    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new AppError(429, 'TOO_MANY_REQUESTS', message));
    }
    next();
  }

  middleware.reset = () => hits.clear();
  return middleware;
}

module.exports = { rateLimit };
