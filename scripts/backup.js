// Sao lưu MySQL ra file .sql.gz trong thư mục backups/ (đã có trong .gitignore).
//   npm run db:backup                                   # DB trong DATABASE_URL (local)
//   BACKUP_DATABASE_URL='<Aiven Service URI>' npm run db:backup
// Cần Docker: mysqldump chạy trong container mysql:8.4. Xem docs/BACKUP_RESTORE.md.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { PassThrough } = require('stream');
const env = require('../src/config/env');
const { parseDatabaseUrl, isLocal, runClient } = require('./lib/dockerMysql');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function timestamp() {
  // 2026-11-04T09:30:00.000Z -> 20261104-093000Z
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15) + 'Z';
}

async function main() {
  const conn = parseDatabaseUrl(process.env.BACKUP_DATABASE_URL || env.DATABASE_URL);
  const source = isLocal(conn) ? 'local' : conn.host.split('.')[0];
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${conn.database}-${source}-${timestamp()}.sql.gz`);

  console.log(`[backup] ${conn.user}@${conn.host}:${conn.port}/${conn.database} -> ${path.relative(process.cwd(), file)}`);

  const dump = runClient('mysqldump', conn, [
    '--single-transaction', // ảnh chụp nhất quán, không khóa bảng (InnoDB)
    '--set-gtid-purged=OFF', // Aiven bật GTID; bỏ để restore được vào DB khác
    '--no-tablespaces', // không cần quyền PROCESS
    '--routines',
    '--triggers',
    '--hex-blob',
    '--default-character-set=utf8mb4',
    conn.database,
  ], { caCert: env.DB_CA_CERT || undefined });

  // mysqldump ghi dòng "-- Dump completed" ở cuối khi chạy trọn vẹn
  let tail = '';
  const watchTail = new PassThrough();
  watchTail.on('data', (chunk) => { tail = (tail + chunk.toString('utf8')).slice(-200); });

  const hash = crypto.createHash('sha256');
  const hashGz = new PassThrough();
  hashGz.on('data', (chunk) => hash.update(chunk));

  try {
    await Promise.all([
      pipeline(dump.stdout, watchTail, zlib.createGzip(), hashGz, fs.createWriteStream(file, { mode: 0o600 })),
      dump.done,
    ]);
    if (!tail.includes('-- Dump completed')) {
      throw new Error('File dump không có dòng "-- Dump completed", có thể bị cắt giữa chừng');
    }
  } catch (err) {
    fs.rmSync(file, { force: true });
    throw err;
  }

  const sha256 = hash.digest('hex');
  fs.writeFileSync(`${file}.sha256`, `${sha256}  ${path.basename(file)}\n`);
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`[backup] xong: ${kb} KB, sha256 ${sha256.slice(0, 16)}…`);
  console.log(`[backup] khôi phục thử: npm run db:restore -- ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error(`[backup] lỗi: ${err.message}`);
  process.exitCode = 1;
});
