// Đối chiếu hai database: số dòng và mã băm nội dung của từng bảng.
// Dùng sau khi restore thử để chứng minh bản khôi phục giống bản gốc.
//   npm run db:compare
// DB gốc: BACKUP_DATABASE_URL (hoặc DATABASE_URL). DB khôi phục: RESTORE_DATABASE_URL
// (mặc định mysql://root:root@localhost:3306/inventory_restore).
// In ra bảng Markdown để dán vào biên bản. Thoát với mã 1 nếu có bảng không khớp.
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { connectionOptions } = require('../src/config/db');

const DEFAULT_TARGET = 'mysql://root:root@localhost:3306/inventory_restore';

async function snapshot(databaseUrl) {
  // Lấy giá trị thô (chuỗi) để so sánh không phụ thuộc múi giờ hay kiểu số
  const conn = await mysql.createConnection({
    ...connectionOptions(databaseUrl),
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
  try {
    const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
    const [tables] = await conn.query(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`,
      [db],
    );
    const result = new Map();
    for (const { name } of tables) {
      const [keys] = await conn.query(
        `SELECT column_name AS col FROM information_schema.key_column_usage
         WHERE table_schema = ? AND table_name = ? AND constraint_name = 'PRIMARY'
         ORDER BY ordinal_position`,
        [db, name],
      );
      const orderBy = keys.length ? `ORDER BY ${keys.map((k) => `\`${k.col}\``).join(', ')}` : '';
      const [rows] = await conn.query({ sql: `SELECT * FROM \`${name}\` ${orderBy}`, rowsAsArray: true });
      const hash = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
      result.set(name, { rows: rows.length, hash });
    }
    return { db, tables: result };
  } finally {
    await conn.end();
  }
}

async function main() {
  const sourceUrl = process.env.BACKUP_DATABASE_URL || env.DATABASE_URL;
  const targetUrl = process.env.RESTORE_DATABASE_URL || DEFAULT_TARGET;
  const [source, target] = await Promise.all([snapshot(sourceUrl), snapshot(targetUrl)]);

  const names = [...new Set([...source.tables.keys(), ...target.tables.keys()])].sort();
  let mismatches = 0;
  console.log(`| Bảng | Số dòng (${source.db}) | Số dòng (${target.db}) | Mã băm nội dung | Kết quả |`);
  console.log('|---|---:|---:|---|---|');
  for (const name of names) {
    const a = source.tables.get(name);
    const b = target.tables.get(name);
    const ok = a && b && a.rows === b.rows && a.hash === b.hash;
    if (!ok) mismatches += 1;
    const hash = a && b && a.hash === b.hash ? `${a.hash.slice(0, 12)}…` : `${a?.hash.slice(0, 8) ?? '—'} / ${b?.hash.slice(0, 8) ?? '—'}`;
    console.log(`| ${name} | ${a?.rows ?? 'thiếu'} | ${b?.rows ?? 'thiếu'} | ${hash} | ${ok ? '✅ khớp' : '❌ lệch'} |`);
  }
  console.log(`\n${names.length - mismatches}/${names.length} bảng khớp`);
  if (mismatches) {
    console.log('Lưu ý: nếu DB gốc có thay đổi sau lúc backup thì sẽ lệch; chạy compare ngay sau backup.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`[compare] lỗi: ${err.message}`);
  process.exitCode = 1;
});
