const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { requestId, jsonRequestLogger } = require('./middlewares/requestLogger');
const { rateLimit } = require('./middlewares/rateLimit');

const app = express();

// Render đặt app sau proxy, cần để lấy đúng IP client và protocol
app.set('trust proxy', 1);

app.use(requestId);
if (env.isProduction) {
  app.use(jsonRequestLogger);
} else if (!env.isTest) {
  app.use(morgan('dev'));
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // cho phép Bootstrap/Chart.js từ CDN
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    },
  },
}));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.use('/health', require('./modules/health/health.routes'));

// Chống dò mật khẩu: tối đa 10 lần đăng nhập mỗi 15 phút ở production; nới lỏng ở dev/test.
if (env.isProduction) {
  app.post('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút',
  }));
}

// Mỗi module tự quản lý router của mình; chỉ cần sửa file routes trong module tương ứng
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/products', require('./modules/products/products.routes'));
app.use('/api/categories', require('./modules/categories/categories.routes'));
app.use('/api/suppliers', require('./modules/suppliers/suppliers.routes'));
app.use('/api/stock-transactions', require('./modules/inventory/inventory.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));

app.use('/api', notFound);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
