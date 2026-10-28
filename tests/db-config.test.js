const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ENV_KEYS = ['DATABASE_URL', 'DB_SSL', 'DB_CA_CERT'];
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

// env.js đọc biến môi trường lúc require, nên mỗi test nạp lại module
function loadOptions(vars) {
  for (const key of ENV_KEYS) {
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/config/db')];
  return require('../src/config/db').connectionOptions();
}

beforeEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('URL thường: không bật SSL', () => {
  const opts = loadOptions({ DATABASE_URL: 'mysql://u:p@localhost:3306/db' });
  assert.equal(opts.ssl, undefined);
  assert.equal(opts.uri, 'mysql://u:p@localhost:3306/db');
});

test('URL Aiven có ssl-mode=REQUIRED: bỏ tham số khỏi URI và bật SSL', () => {
  const opts = loadOptions({ DATABASE_URL: 'mysql://u:p@host.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED' });
  assert.ok(!opts.uri.includes('ssl-mode'));
  assert.deepEqual(opts.ssl, { rejectUnauthorized: false });
});

test('Có DB_CA_CERT: xác minh server, đổi \\n thành xuống dòng', () => {
  const opts = loadOptions({
    DATABASE_URL: 'mysql://u:p@host:1/db',
    DB_SSL: 'true',
    DB_CA_CERT: '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----',
  });
  assert.equal(opts.ssl.rejectUnauthorized, true);
  assert.equal(opts.ssl.ca, '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----');
});

test('ssl-mode=DISABLED: không bật SSL', () => {
  const opts = loadOptions({ DATABASE_URL: 'mysql://u:p@host:1/db?ssl-mode=DISABLED' });
  assert.equal(opts.ssl, undefined);
});
