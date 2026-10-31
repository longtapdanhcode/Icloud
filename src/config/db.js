const mysql = require('mysql2/promise');
const env = require('./env');

let pool;
let sslWarned = false;

// Cấu hình kết nối dùng chung cho app và scripts/migrate.js.
// mysql2 không hiểu tham số ssl-mode trong URL (Aiven có sẵn), nên bỏ nó đi và tự bật SSL.
function connectionOptions() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(env.DATABASE_URL);
  const sslMode = (url.searchParams.get('ssl-mode') || '').toUpperCase();
  url.searchParams.delete('ssl-mode');

  const options = { uri: url.toString() };

  if (env.DB_SSL || (sslMode && sslMode !== 'DISABLED')) {
    if (env.DB_CA_CERT) {
      options.ssl = { ca: env.DB_CA_CERT, rejectUnauthorized: true };
    } else {
      // Vẫn mã hóa đường truyền nhưng không xác minh server; nên đặt DB_CA_CERT ở production
      options.ssl = { rejectUnauthorized: false };
      if (!sslWarned) {
        console.warn('[db] SSL enabled without DB_CA_CERT: server certificate is not verified');
        sslWarned = true;
      }
    }
  }

  return options;
}

// Tạo pool khi cần lần đầu, để app vẫn khởi động được (và /health báo lỗi) khi DB chưa sẵn sàng
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...connectionOptions(),
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true,
    });
  }
  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

// Dùng cho nghiệp vụ kho: tự commit khi thành công, rollback khi có lỗi
async function withTransaction(work) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function ping() {
  await getPool().query('SELECT 1');
}

async function close() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { connectionOptions, getPool, query, withTransaction, ping, close };
