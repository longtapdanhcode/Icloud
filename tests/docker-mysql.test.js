const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDatabaseUrl, isLocal } = require('../scripts/lib/dockerMysql');

test('parseDatabaseUrl đọc URL kiểu Aiven, giải mã ký tự đặc biệt trong mật khẩu', () => {
  // URL giả để thử giải mã %40, %2F; không phải secret thật
  const conn = parseDatabaseUrl('mysql://avnadmin:p%40ss%2Fw0rd@mysql-abc.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED'); // gitleaks:allow
  assert.deepEqual(conn, {
    host: 'mysql-abc.aivencloud.com',
    port: 12345,
    user: 'avnadmin',
    password: 'p@ss/w0rd',
    database: 'defaultdb',
    sslMode: 'REQUIRED',
  });
  assert.equal(isLocal(conn), false);
});

test('parseDatabaseUrl: cổng mặc định 3306, localhost là local', () => {
  const conn = parseDatabaseUrl('mysql://inventory:inventory@localhost/inventory');
  assert.equal(conn.port, 3306);
  assert.equal(conn.sslMode, '');
  assert.equal(isLocal(conn), true);
});

test('parseDatabaseUrl từ chối URL thiếu tên database hoặc sai giao thức', () => {
  assert.throws(() => parseDatabaseUrl('mysql://u:p@localhost:3306/'), /thiếu tên database/);
  assert.throws(() => parseDatabaseUrl('postgres://u:p@localhost/db'), /mysql:\/\//);
  assert.throws(() => parseDatabaseUrl(''), /Thiếu URL/);
});
