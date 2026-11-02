process.env.NODE_ENV = 'test';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mysql = require('mysql2/promise');
const { connectionOptions } = require('../src/config/db');
const migrator = require('../scripts/lib/migrator');

// Dùng bảng riêng có tiền tố zz_test_ để không đụng vào dữ liệu thật
const TABLE = 'zz_test_migrations';
const silent = () => {};
let conn;
let dir;

async function dropTestTables() {
  const [rows] = await conn.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'zz\\_test\\_%'",
  );
  for (const { name } of rows) await conn.query(`DROP TABLE \`${name}\``);
}

function write(file, sql) {
  fs.writeFileSync(path.join(dir, file), sql);
}

async function tableExists(name) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [name],
  );
  return rows.length > 0;
}

before(async () => {
  conn = await mysql.createConnection({ ...connectionOptions(), multipleStatements: true });
});

after(async () => {
  await dropTestTables();
  await conn.end();
});

beforeEach(async () => {
  await dropTestTables();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
});

test('chạy các migration theo thứ tự tên file và ghi lại', async () => {
  write('20260101000002_add_col.sql', 'ALTER TABLE zz_test_a ADD COLUMN note VARCHAR(10) NULL;');
  write('20260101000001_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY);');

  const applied = await migrator.migrate(conn, { dir, table: TABLE, log: silent });
  assert.deepEqual(applied, ['20260101000001_create_a.sql', '20260101000002_add_col.sql']);

  const [cols] = await conn.query("SHOW COLUMNS FROM zz_test_a LIKE 'note'");
  assert.equal(cols.length, 1);
  const [rows] = await conn.query(`SELECT version FROM ${TABLE} ORDER BY version`);
  assert.deepEqual(rows.map((r) => r.version), ['20260101000001', '20260101000002']);
});

test('chạy lại không làm gì (như khi redeploy)', async () => {
  write('20260101000001_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY);');
  await migrator.migrate(conn, { dir, table: TABLE, log: silent });
  assert.deepEqual(await migrator.migrate(conn, { dir, table: TABLE, log: silent }), []);
});

test('chỉ chạy migration mới thêm vào', async () => {
  write('20260101000001_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY);');
  await migrator.migrate(conn, { dir, table: TABLE, log: silent });

  write('20260101000002_create_b.sql', 'CREATE TABLE zz_test_b (id INT PRIMARY KEY);');
  const applied = await migrator.migrate(conn, { dir, table: TABLE, log: silent });
  assert.deepEqual(applied, ['20260101000002_create_b.sql']);
  assert.ok(await tableExists('zz_test_b'));
});

test('migration cũ hơn (đến từ nhánh merge sau) vẫn được chạy', async () => {
  write('20260101000005_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY);');
  await migrator.migrate(conn, { dir, table: TABLE, log: silent });

  write('20260101000003_create_b.sql', 'CREATE TABLE zz_test_b (id INT PRIMARY KEY);');
  const logs = [];
  const applied = await migrator.migrate(conn, { dir, table: TABLE, log: (m) => logs.push(m) });
  assert.deepEqual(applied, ['20260101000003_create_b.sql']);
  assert.ok(logs.some((l) => l.includes('cũ hơn')));
});

test('file đã chạy bị sửa: dừng lại, không chạy migration nào', async () => {
  write('20260101000001_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY);');
  await migrator.migrate(conn, { dir, table: TABLE, log: silent });

  write('20260101000001_create_a.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY, x INT);');
  write('20260101000002_create_b.sql', 'CREATE TABLE zz_test_b (id INT PRIMARY KEY);');
  await assert.rejects(migrator.migrate(conn, { dir, table: TABLE, log: silent }), /bị sửa nội dung/);
  assert.equal(await tableExists('zz_test_b'), false);
});

test('chỉ đổi xuống dòng Windows (CRLF) không bị coi là sửa', async () => {
  write('20260101000001_create_a.sql', '-- tao bang\nCREATE TABLE zz_test_a (id INT PRIMARY KEY);\n');
  await migrator.migrate(conn, { dir, table: TABLE, log: silent });
  write('20260101000001_create_a.sql', '-- tao bang\r\nCREATE TABLE zz_test_a (id INT PRIMARY KEY);\r\n');
  assert.deepEqual(await migrator.migrate(conn, { dir, table: TABLE, log: silent }), []);
});

test('migration lỗi: báo tên file, không ghi là đã chạy, sửa xong chạy lại được', async () => {
  write('20260101000001_bad.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY); SELEC 1;');
  await assert.rejects(migrator.migrate(conn, { dir, table: TABLE, log: silent }), /20260101000001_bad\.sql lỗi/);

  const { list } = await migrator.getStatus(conn, { dir, table: TABLE });
  assert.equal(list[0].state, 'pending');

  // Câu đầu đã chạy trước khi lỗi (MySQL tự commit DDL) nên bản sửa dùng IF NOT EXISTS
  write('20260101000001_bad.sql', 'CREATE TABLE IF NOT EXISTS zz_test_a (id INT PRIMARY KEY);');
  assert.deepEqual(await migrator.migrate(conn, { dir, table: TABLE, log: silent }), ['20260101000001_bad.sql']);
});

test('tên file sai định dạng bị từ chối', async () => {
  write('2_bad.sql', 'SELECT 1;');
  await assert.rejects(migrator.migrate(conn, { dir, table: TABLE, log: silent }), /Tên file migration không hợp lệ/);
});

test('hai tiến trình migrate cùng lúc: chỉ một tiến trình chạy migration', async () => {
  write('20260101000001_slow.sql', 'CREATE TABLE zz_test_a (id INT PRIMARY KEY); DO SLEEP(1);');
  const conn2 = await mysql.createConnection({ ...connectionOptions(), multipleStatements: true });
  try {
    const [a, b] = await Promise.all([
      migrator.migrate(conn, { dir, table: TABLE, log: silent }),
      migrator.migrate(conn2, { dir, table: TABLE, log: silent }),
    ]);
    assert.equal(a.length + b.length, 1);
  } finally {
    await conn2.end();
  }
});

test('db:migrate:new tạo file đúng tên, bỏ dấu tiếng Việt, dùng giờ UTC', () => {
  const file = migrator.createMigrationFile(dir, 'Thêm ghi chú cho Đơn vị', new Date('2026-10-29T03:04:05Z'));
  assert.equal(file, '20261029030405_them_ghi_chu_cho_don_vi.sql');
  assert.match(fs.readFileSync(path.join(dir, file), 'utf8'), /PRIMARY KEY/);
  assert.throws(() => migrator.createMigrationFile(dir, '  '), /Thiếu tên migration/);
});

test('migration ban đầu trong repo khớp với các bảng ứng dụng đang dùng', () => {
  const list = migrator.loadMigrations(path.join(__dirname, '..', 'db', 'migrations'));
  assert.equal(list[0].file, '20261023000000_initial_schema.sql');
  for (const t of ['users', 'categories', 'products', 'suppliers', 'stock_transactions', 'stock_transaction_items']) {
    assert.match(list[0].sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${t} `));
  }
});
