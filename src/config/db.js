const mysql = require('mysql2/promise');
const env = require('./env');

let pool;

// Tạo pool khi cần lần đầu, để app vẫn khởi động được (và /health báo lỗi) khi DB chưa sẵn sàng
function getPool() {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = mysql.createPool({
      uri: env.DATABASE_URL,
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

module.exports = { getPool, query, withTransaction, ping, close };
