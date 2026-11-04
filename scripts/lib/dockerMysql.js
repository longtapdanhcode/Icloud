// Chạy mysql/mysqldump trong container mysql:8.4, để máy nào có Docker cũng dùng được
// mà không phải cài MySQL client.
// Mật khẩu ghi vào file tạm (quyền 600) rồi mount vào container, nên không xuất hiện
// trong tham số lệnh, biến môi trường hay lịch sử terminal.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const IMAGE = process.env.MYSQL_CLIENT_IMAGE || 'mysql:8.4';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) throw new Error('Thiếu URL database');
  const url = new URL(databaseUrl);
  if (!url.protocol.startsWith('mysql')) {
    throw new Error(`URL phải bắt đầu bằng mysql:// (đang là ${url.protocol})`);
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error('URL thiếu tên database (phần sau dấu /)');
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    sslMode: (url.searchParams.get('ssl-mode') || '').toUpperCase(),
  };
}

function isLocal(conn) {
  return LOCAL_HOSTS.has(conn.host);
}

/**
 * @param {'mysql'|'mysqldump'} program
 * @param {ReturnType<typeof parseDatabaseUrl>} conn
 * @param {string[]} args tham số thêm cho program
 * @param {{ caCert?: string, stdin?: boolean }} [options]
 */
function runClient(program, conn, args, { caCert, stdin = false } = {}) {
  if (conn.password.includes('"') || conn.password.includes('\n')) {
    throw new Error('Mật khẩu chứa ký tự " hoặc xuống dòng, script chưa hỗ trợ');
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-db-'));
  // Trong container, localhost là chính container, nên trỏ về máy host
  const host = isLocal(conn) ? 'host.docker.internal' : conn.host;
  const lines = [
    '[client]',
    `host=${host}`,
    `port=${conn.port}`,
    `user=${conn.user}`,
    `password="${conn.password.replace(/\\/g, '\\\\')}"`,
  ];
  if (conn.sslMode && conn.sslMode !== 'DISABLED') {
    if (caCert) {
      fs.writeFileSync(path.join(dir, 'ca.pem'), caCert, { mode: 0o600 });
      lines.push('ssl-mode=VERIFY_CA', 'ssl-ca=/run/dbconf/ca.pem');
    } else {
      lines.push('ssl-mode=REQUIRED');
    }
  }
  fs.writeFileSync(path.join(dir, 'client.cnf'), `${lines.join('\n')}\n`, { mode: 0o600 });

  const child = spawn('docker', [
    'run', '--rm', '-i',
    '--add-host=host.docker.internal:host-gateway',
    '-v', `${dir}:/run/dbconf:ro`,
    IMAGE,
    program, '--defaults-extra-file=/run/dbconf/client.cnf', ...args,
  ], { stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] });

  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  child.on('close', cleanup);
  child.on('error', (err) => {
    cleanup();
    if (err.code === 'ENOENT') err.message = 'Không tìm thấy lệnh docker. Cài Docker Desktop rồi chạy lại.';
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  // Promise kết thúc khi process thoát; lỗi kèm nội dung stderr của MySQL
  child.done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      // Bỏ cảnh báo vô hại của client
      const message = stderr
        .split('\n')
        .filter((l) => l.trim() && !l.includes('Using a password on the command line'))
        .join('\n');
      if (code === 0) resolve(message);
      else reject(new Error(`${program} thoát với mã ${code}\n${message}`));
    });
  });

  return child;
}

module.exports = { parseDatabaseUrl, isLocal, runClient };
