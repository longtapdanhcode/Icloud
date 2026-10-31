// Smoke test: kiểm tra nhanh các chức năng chính trên một môi trường đang chạy.
//   BASE_URL=https://cloud-inventory-ruyb.onrender.com npm run smoke
// Tùy chọn:
//   SMOKE_EMAIL / SMOKE_PASSWORD   tài khoản để thử đăng nhập và API cần token
//   EXPECT_VERSION                 7 ký tự commit mong đợi ở /health (kiểm tra đã deploy đúng bản)
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const { SMOKE_PASSWORD, EXPECT_VERSION } = process.env;
// Chuẩn hóa giống server (auth.service): secret dán vào GitHub hay dính dấu cách hoặc chữ hoa
const SMOKE_EMAIL = process.env.SMOKE_EMAIL?.trim().toLowerCase();

const results = [];

async function call(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - start });
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - start, error: err.message });
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// Render Free tắt app khi không có request, lần đầu có thể mất khoảng 1 phút để khởi động
async function waitUntilAwake() {
  const deadline = Date.now() + 180_000;
  let last = 'không kết nối được';
  while (Date.now() < deadline) {
    try {
      const res = await call('/health');
      if (res.status === 200) return;
      // Service bị tạm dừng trên Render: chờ thêm cũng vô ích
      if (res.headers.get('x-render-routing')?.startsWith('suspend')) {
        throw new Error(`Service đang bị tạm dừng trên Render (${res.headers.get('x-render-routing')})`);
      }
      last = `HTTP ${res.status} ${typeof res.body === 'string' ? res.body.slice(0, 80) : JSON.stringify(res.body)}`;
    } catch (err) {
      if (err.message.startsWith('Service đang bị tạm dừng')) throw err;
      last = err.message;
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error(`App không phản hồi /health sau 3 phút (lần cuối: ${last})`);
}

async function main() {
  console.log(`Smoke test: ${BASE_URL}`);
  await waitUntilAwake();

  await check('GET /health → 200, DB up', async () => {
    const res = await call('/health');
    expect(res.status === 200, `status ${res.status}`);
    expect(res.body.db === 'up', `db = ${res.body.db}`);
    if (EXPECT_VERSION) {
      expect(res.body.version === EXPECT_VERSION.slice(0, 7), `version ${res.body.version}, mong đợi ${EXPECT_VERSION.slice(0, 7)}`);
    }
  });

  await check('GET / → trang HTML', async () => {
    const res = await call('/');
    expect(res.status === 200, `status ${res.status}`);
    expect(String(res.headers.get('content-type')).includes('text/html'), 'không phải HTML');
  });

  await check('Header bảo mật (CSP, nosniff, X-Request-Id)', async () => {
    const res = await call('/health');
    expect(res.headers.get('content-security-policy'), 'thiếu Content-Security-Policy');
    expect(res.headers.get('x-content-type-options') === 'nosniff', 'thiếu X-Content-Type-Options');
    expect(res.headers.get('x-request-id'), 'thiếu X-Request-Id');
  });

  await check('API không tồn tại → 404 theo chuẩn lỗi', async () => {
    const res = await call('/api/khong-ton-tai');
    expect(res.status === 404, `status ${res.status}`);
    expect(res.body.success === false && res.body.error?.code === 'NOT_FOUND', 'sai định dạng lỗi');
  });

  await check('GET /api/auth/me không token → 401', async () => {
    const res = await call('/api/auth/me');
    expect(res.status === 401, `status ${res.status}`);
  });

  if (SMOKE_EMAIL && SMOKE_PASSWORD) {
    let token;
    await check('POST /api/auth/login → token', async () => {
      const res = await call('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
      });
      expect(res.status === 200, `status ${res.status}: ${JSON.stringify(res.body)}`);
      token = res.body.data?.token;
      expect(token, 'không có token');
    });

    await check('GET /api/auth/me có token → 200', async () => {
      expect(token, 'bỏ qua vì đăng nhập thất bại');
      const res = await call('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      expect(res.status === 200, `status ${res.status}`);
      expect(res.body.data?.email === SMOKE_EMAIL, `sai người dùng: ${res.body.data?.email}`);
    });
  } else {
    console.log('(bỏ qua đăng nhập: chưa đặt SMOKE_EMAIL/SMOKE_PASSWORD)');
  }

  for (const r of results) {
    console.log(`${r.ok ? '✔' : '✖'} ${r.name} (${r.ms}ms)${r.ok ? '' : ` — ${r.error}`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('✖', err.message);
  process.exitCode = 1;
});
