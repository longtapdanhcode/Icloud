// Lõi hệ thống migration: chạy các file db/migrations/*.sql chưa chạy, theo thứ tự tên file,
// và ghi lại file đã chạy vào bảng schema_migrations (kèm checksum để phát hiện file cũ bị sửa).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FILE_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const LOCK_NAME = 'cloud_inventory_migrate';

// Bỏ khác biệt xuống dòng Windows/Unix để checksum giống nhau trên mọi máy
function normalize(sql) {
  return sql.replace(/\r\n/g, '\n').trim();
}

function checksum(sql) {
  return crypto.createHash('sha256').update(normalize(sql)).digest('hex');
}

function loadMigrations(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  return files.map((file) => {
    const match = FILE_PATTERN.exec(file);
    if (!match) {
      throw new Error(`Tên file migration không hợp lệ: ${file} (đúng dạng: YYYYMMDDHHMMSS_ten_thay_doi.sql)`);
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    return { version: match[1], name: match[2], file, sql, checksum: checksum(sql) };
  });
}

async function ensureTable(conn, table) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      version    CHAR(14)     NOT NULL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      checksum   CHAR(64)     NOT NULL,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getStatus(conn, { dir, table }) {
  await ensureTable(conn, table);
  const migrations = loadMigrations(dir);
  const [rows] = await conn.query(`SELECT version, name, checksum, applied_at FROM \`${table}\` ORDER BY version`);
  const applied = new Map(rows.map((r) => [r.version, r]));

  const list = migrations.map((m) => {
    const row = applied.get(m.version);
    let state = 'pending';
    if (row) state = row.checksum === m.checksum ? 'applied' : 'modified';
    return { ...m, state, appliedAt: row?.applied_at };
  });

  // Có trong DB nhưng file đã bị xóa khỏi repo
  const known = new Set(migrations.map((m) => m.version));
  const missing = rows.filter((r) => !known.has(r.version));

  return { list, missing };
}

async function migrate(conn, { dir, table, log = console.log }) {
  const [[{ locked }]] = await conn.query('SELECT GET_LOCK(?, 60) AS locked', [LOCK_NAME]);
  if (locked !== 1) {
    throw new Error('Một tiến trình migrate khác đang chạy, thử lại sau');
  }

  try {
    const { list, missing } = await getStatus(conn, { dir, table });

    // File đã chạy mà bị sửa: DB không khớp với code nữa, dừng lại thay vì chạy tiếp
    const modified = list.filter((m) => m.state === 'modified');
    if (modified.length) {
      throw new Error(
        `File migration đã chạy nhưng bị sửa nội dung: ${modified.map((m) => m.file).join(', ')}. `
        + 'Không sửa migration cũ, hãy tạo migration mới (npm run db:migrate:new -- <ten>).',
      );
    }
    for (const m of missing) {
      log(`[migrate] cảnh báo: ${m.version}_${m.name} đã chạy trên DB nhưng không còn file trong repo`);
    }

    const pending = list.filter((m) => m.state === 'pending');
    const lastApplied = list.filter((m) => m.state === 'applied').at(-1);
    if (lastApplied) {
      for (const m of pending) {
        if (m.version < lastApplied.version) {
          log(`[migrate] lưu ý: ${m.file} cũ hơn migration đã chạy gần nhất (thường do merge nhánh), vẫn chạy bình thường`);
        }
      }
    }

    for (const m of pending) {
      log(`[migrate] chạy ${m.file}`);
      try {
        await conn.query(m.sql);
      } catch (err) {
        // MySQL tự commit lệnh DDL, nên các câu lệnh trước câu lỗi trong file có thể đã được áp dụng
        throw new Error(
          `${m.file} lỗi: ${err.message.replace(/\.$/, '')}. Các lệnh trước câu lỗi trong file này có thể đã chạy: `
          + 'kiểm tra DB, sửa file rồi chạy lại.',
        );
      }
      await conn.query(`INSERT INTO \`${table}\` (version, name, checksum) VALUES (?, ?, ?)`, [m.version, m.name, m.checksum]);
    }

    return pending.map((m) => m.file);
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
  }
}

// Xóa toàn bộ bảng trong database hiện tại (kể cả bảng do migration mới tạo)
async function dropAllTables(conn) {
  const [rows] = await conn.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
  );
  if (!rows.length) return [];
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await conn.query(`DROP TABLE ${rows.map((r) => `\`${r.name}\``).join(', ')}`);
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  return rows.map((r) => r.name);
}

function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function createMigrationFile(dir, rawName, date = new Date()) {
  const name = String(rawName || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!name) {
    throw new Error('Thiếu tên migration. Ví dụ: npm run db:migrate:new -- add_note_to_suppliers');
  }
  const file = `${timestamp(date)}_${name}.sql`;
  const content = `-- ${name}
-- Tạo bởi: npm run db:migrate:new (${date.toISOString()})
--
-- Quy tắc:
--  * Mỗi file một thay đổi nhỏ. Đã merge vào main thì KHÔNG sửa file này nữa, muốn sửa thì tạo file mới.
--  * Bảng mới phải có PRIMARY KEY (Aiven MySQL bắt buộc).
--  * Không xóa cột/bảng đang có dữ liệu nếu chưa thống nhất với cả nhóm.
--
-- Ví dụ:
--   ALTER TABLE suppliers ADD COLUMN note VARCHAR(255) NULL;
--   CREATE INDEX idx_stock_items_product ON stock_transaction_items (product_id);

`;
  fs.writeFileSync(path.join(dir, file), content, { flag: 'wx' });
  return file;
}

module.exports = { loadMigrations, getStatus, migrate, dropAllTables, createMigrationFile, checksum };
