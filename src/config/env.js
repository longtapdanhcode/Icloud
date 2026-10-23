require('dotenv').config({ quiet: true });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

env.isProduction = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';

// Production thiếu biến bắt buộc thì dừng ngay, tránh chạy với cấu hình sai
if (env.isProduction) {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = env;
