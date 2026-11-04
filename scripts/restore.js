// Khôi phục file backup .sql.gz vào một database.
//   npm run db:restore -- backups/<file>.sql.gz
//   npm run db:restore -- backups/<file>.sql.gz --replace          # xóa DB đích rồi khôi phục
// DB đích lấy từ RESTORE_DATABASE_URL, mặc định là DB riêng trên MySQL local:
//   mysql://root:root@localhost:3306/inventory_restore
// Mặc định chỉ cho khôi phục vào DB local. Khôi phục vào DB trên cloud (khi có sự cố thật)
// cần thêm --allow-remote. Xem docs/BACKUP_RESTORE.md.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { connectionOptions } = require('../src/config/db');
const { parseDatabaseUrl, isLocal, runClient } = require('./lib/dockerMysql');

const DEFAULT_TARGET = 'mysql://root:root@localhost:3306/inventory_restore';

function parseArgs(argv) {
  const args = { file: null, replace: false, allowRemote: false };
  for (const arg of argv) {
    if (arg === '--replace') args.replace = true;
    else if (arg === '--allow-remote') args.allowRemote = true;
    else if (arg.startsWith('--')) throw new Error(`Không hiểu tham số ${arg}`);
    else args.file = arg;
  }
  if (!args.file) throw new Error('Thiếu đường dẫn file backup. Ví dụ: npm run db:restore -- backups/x.sql.gz');
  return args;
}

function verifyChecksum(file) {
  const sumFile = `${file}.sha256`;
  if (!fs.existsSync(sumFile)) {
    console.warn('[restore] không có file .sha256, bỏ qua bước kiểm tra toàn vẹn');
    return;
  }
  const expected = fs.readFileSync(sumFile, 'utf8').split(/\s+/)[0];
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (expected !== actual) throw new Error('sha256 không khớp: file backup đã bị thay đổi hoặc hỏng');
  console.log('[restore] sha256 khớp');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetUrl = process.env.RESTORE_DATABASE_URL || DEFAULT_TARGET;
  const conn = parseDatabaseUrl(targetUrl);

  if (!isLocal(conn) && !args.allowRemote) {
    throw new Error(`DB đích ${conn.host} không phải local. Nếu thật sự muốn khôi phục lên cloud, thêm --allow-remote`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(conn.database)) throw new Error('Tên database chỉ được gồm chữ, số và _');
  if (!fs.existsSync(args.file)) throw new Error(`Không thấy file ${args.file}`);
  verifyChecksum(args.file);

  // Kết nối không chọn database để tạo/xóa database đích
  const serverUrl = new URL(targetUrl);
  serverUrl.pathname = '/';
  const admin = await mysql.createConnection(connectionOptions(serverUrl.toString()));
  try {
    const [[{ tables }]] = await admin.query(
      'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ?',
      [conn.database],
    );
    if (tables > 0 && !args.replace) {
      throw new Error(`Database ${conn.database} đang có ${tables} bảng. Thêm --replace để xóa và khôi phục lại`);
    }
    if (args.replace) await admin.query(`DROP DATABASE IF EXISTS \`${conn.database}\``);
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${conn.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await admin.end();
  }

  console.log(`[restore] ${path.basename(args.file)} -> ${conn.user}@${conn.host}:${conn.port}/${conn.database}`);
  const client = runClient('mysql', conn, ['--default-character-set=utf8mb4', conn.database], {
    caCert: env.DB_CA_CERT || undefined,
    stdin: true,
  });
  await Promise.all([
    pipeline(fs.createReadStream(args.file), zlib.createGunzip(), client.stdin),
    client.done,
  ]);

  console.log('[restore] xong. Đối chiếu với DB gốc: npm run db:compare');
}

main().catch((err) => {
  console.error(`[restore] lỗi: ${err.message}`);
  process.exitCode = 1;
});
