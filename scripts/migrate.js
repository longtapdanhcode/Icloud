// Chạy db/schema.sql lên database trong DATABASE_URL (không cần cài mysql client)
//   npm run db:migrate            tạo bảng nếu chưa có
//   node scripts/migrate.js --reset   XÓA toàn bộ bảng rồi tạo lại (bị chặn ở production)
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const TABLES_DROP_ORDER = [
  'stock_transaction_items',
  'stock_transactions',
  'products',
  'suppliers',
  'categories',
  'users',
];

async function main() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const reset = process.argv.includes('--reset');
  if (reset && env.isProduction) {
    throw new Error('--reset is not allowed when NODE_ENV=production');
  }

  const conn = await mysql.createConnection({ uri: env.DATABASE_URL, multipleStatements: true });
  try {
    if (reset) {
      console.log('[migrate] dropping tables...');
      await conn.query(`DROP TABLE IF EXISTS ${TABLES_DROP_ORDER.join(', ')}`);
    }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await conn.query(sql);
    const [rows] = await conn.query('SHOW TABLES');
    console.log(`[migrate] done, ${rows.length} tables: ${rows.map((r) => Object.values(r)[0]).join(', ')}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
