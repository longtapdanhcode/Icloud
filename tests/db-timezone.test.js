process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');

after(() => db.close());

test('kết nối dùng múi giờ UTC', async () => {
  const [row] = await db.query('SELECT @@session.time_zone AS tz');
  assert.equal(row.tz, '+00:00');
});

test('DATETIME trả về Date, JSON dạng ISO có "Z" và đúng thời điểm hiện tại', async () => {
  const [row] = await db.query('SELECT CURRENT_TIMESTAMP AS now');
  assert.ok(row.now instanceof Date);

  const json = JSON.parse(JSON.stringify(row));
  assert.match(json.now, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  // Lệch giờ 7 tiếng (lỗi cũ) sẽ làm chênh lệch này khoảng 25.200 giây
  assert.ok(Math.abs(new Date(json.now) - Date.now()) < 60_000);
});

test('giờ lưu vào bảng đọc ra không bị lệch', async () => {
  await db.query('CREATE TABLE IF NOT EXISTS zz_test_tz (id INT PRIMARY KEY, at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  try {
    await db.query('REPLACE INTO zz_test_tz (id) VALUES (1)');
    const [row] = await db.query('SELECT at FROM zz_test_tz WHERE id = 1');
    assert.ok(Math.abs(row.at - Date.now()) < 60_000);
  } finally {
    await db.query('DROP TABLE zz_test_tz');
  }
});
