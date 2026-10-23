const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Railway đặt app sau proxy, cần để lấy đúng IP client và protocol
app.set('trust proxy', 1);

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
if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

app.use('/health', require('./modules/health/health.routes'));

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
