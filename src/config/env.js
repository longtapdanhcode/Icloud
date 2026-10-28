require('dotenv').config({ quiet: true });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  // Bật SSL khi DB nằm ngoài mạng nội bộ (Aiven). URL có ?ssl-mode=REQUIRED cũng tự bật.
  DB_SSL: process.env.DB_SSL === 'true',
  // Chứng chỉ CA dạng PEM (Aiven: Overview → CA certificate). Có thể dán với \n thay cho xuống dòng.
  DB_CA_CERT: (process.env.DB_CA_CERT || '').replace(/\\n/g, '\n'),
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
