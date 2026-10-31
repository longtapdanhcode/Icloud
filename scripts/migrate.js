// Quản lý schema bằng các file trong db/migrations (không cần cài mysql client)
//   npm run db:migrate                  chạy các migration chưa chạy
//   npm run db:migrate:status           xem migration nào đã chạy / đang chờ
//   npm run db:migrate:new -- <ten>     tạo file migration mới
//   node scripts/migrate.js --reset     XÓA toàn bộ bảng rồi chạy lại từ đầu (bị chặn ở production)
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { connectionOptions } = require('../src/config/db');
const migrator = require('./lib/migrator');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const TABLE = 'schema_migrations';

async function withConnection(fn) {
  const conn = await mysql.createConnection({ ...connectionOptions(), multipleStatements: true });
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function status() {
  await withConnection(async (conn) => {
    const { list, missing } = await migrator.getStatus(conn, { dir: MIGRATIONS_DIR, table: TABLE });
    const icon = { applied: '✔', pending: '…', modified: '✖' };
    for (const m of list) {
      const note = m.state === 'applied' ? `đã chạy ${m.appliedAt}` : m.state === 'pending' ? 'chưa chạy' : 'ĐÃ BỊ SỬA SAU KHI CHẠY';
      console.log(`${icon[m.state]} ${m.file}  (${note})`);
    }
    for (const m of missing) console.log(`? ${m.version}_${m.name}  (có trên DB, không còn file)`);
    const pending = list.filter((m) => m.state === 'pending').length;
    console.log(`\n${list.length - pending}/${list.length} đã chạy, ${pending} đang chờ`);
  });
}

async function run(reset) {
  if (reset && env.isProduction) {
    throw new Error('--reset is not allowed when NODE_ENV=production');
  }
  await withConnection(async (conn) => {
    if (reset) {
      const dropped = await migrator.dropAllTables(conn);
      console.log(`[migrate] đã xóa ${dropped.length} bảng`);
    }
    const applied = await migrator.migrate(conn, { dir: MIGRATIONS_DIR, table: TABLE });
    console.log(applied.length ? `[migrate] xong, đã chạy ${applied.length} migration` : '[migrate] DB đã mới nhất');
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'new') {
    const file = migrator.createMigrationFile(MIGRATIONS_DIR, args.slice(1).join('_'));
    console.log(`[migrate] đã tạo db/migrations/${file}`);
    return;
  }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (args[0] === 'status') return status();
  return run(args.includes('--reset'));
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
