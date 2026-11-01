# Triển khai lên Render + Aiven MySQL

Render không có MySQL, nên dùng:
- **Render** (gói Free): chạy Node.js/Express, domain công khai, deploy tự động từ GitHub.
- **Aiven** (gói Free): MySQL 8, có backup tự động, metrics và log.

## Bước 1: Tạo MySQL trên Aiven

1. Đăng ký https://console.aiven.io (đăng nhập bằng GitHub được).
2. **Create service → MySQL → Free plan**. Chọn vùng gần Render nhất (ví dụ châu Á/Singapore nếu có).
3. Chờ trạng thái **Running** (khoảng 2–5 phút).
4. Trong trang **Overview** của service, lấy 2 thứ:
   - **Service URI**: dạng `mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED`
   - **CA certificate**: bấm **Download** để lấy file `ca.pem`.

Không lưu URI hoặc `ca.pem` vào repo. `.gitignore` đã chặn `.env`, đừng tạo file khác chứa chúng.

## Bước 2: Tạo bảng và dữ liệu mẫu (chạy một lần, từ máy bạn)

```bash
export DATABASE_URL='<Service URI của Aiven>'
export DB_CA_CERT="$(cat ~/Downloads/ca.pem)"
npm run db:migrate
SEED_ADMIN_PASSWORD='<mật khẩu admin mạnh>' SEED_STAFF_PASSWORD='<mật khẩu staff mạnh>' npm run db:seed
unset DATABASE_URL DB_CA_CERT
```

Kết quả mong đợi: `[migrate] done, 6 tables` và `[seed] done: { users: 2, ... }`.

## Bước 3: Tạo web service trên Render

1. Đăng ký https://dashboard.render.com bằng GitHub, cấp quyền cho repo `longtapdanhcode/Icloud`.
2. **New → Blueprint**, chọn repo `Icloud`. Render đọc `render.yaml` và tạo service `cloud-inventory`:
   - Build `npm ci`, start `npm run db:migrate && npm start`.
   - Health check `/health`, vùng Singapore, gói Free.
   - `JWT_SECRET` được Render tự sinh ngẫu nhiên.
   - Chỉ deploy khi CI trên GitHub xanh (`autoDeployTrigger: checksPass`).
3. Render hỏi 2 biến không lưu trong Git:

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Service URI của Aiven |
   | `DB_CA_CERT` | Toàn bộ nội dung `ca.pem`, gồm cả dòng `-----BEGIN/END CERTIFICATE-----` |

4. **Apply**, chờ deploy xong. Domain có dạng `https://cloud-inventory-xxxx.onrender.com`.
5. Kiểm tra: `https://<domain>/health` phải trả `{"status":"ok","db":"up",...}`, và `version` là 7 ký tự đầu của commit đang chạy.

Nếu không dùng Blueprint: **New → Web Service**, chọn repo, rồi nhập tay đúng các giá trị ở trên (Runtime Node, Build `npm ci`, Start `npm run db:migrate && npm start`, Health Check Path `/health`, thêm `NODE_ENV=production`, `NODE_VERSION=22` và các biến môi trường).

## Deploy tự động (CI/CD)

PR → GitHub Actions chạy test → merge `main` → CI xanh → Render build và deploy → health check đạt → chuyển traffic sang bản mới. Nếu health check lỗi, bản cũ vẫn chạy.

## Vận hành

| Việc | Ở đâu |
|---|---|
| Log app | Render → service → **Logs** |
| CPU/RAM, số request | Render → service → **Metrics** |
| Rollback | Render → **Events** → chọn deploy cũ → **Rollback** |
| Metrics và log MySQL | Aiven → service → **Metrics** / **Logs** |
| Backup MySQL | Aiven tự backup. Thêm `mysqldump` thủ công ở tuần 4 (RUNBOOK) |
| Smoke test | GitHub → Actions → **Smoke test (production)** → Run workflow, hoặc `BASE_URL=<domain> npm run smoke` |

### Đọc log

Ở production, mỗi request là một dòng JSON:

```json
{"level":"warn","type":"request","requestId":"3bdbf1a2-...","method":"POST","path":"/api/auth/login","status":401,"durationMs":53.4,"ip":"...","userId":1}
```

- Lọc trên Render Logs: gõ `"level":"error"` để xem lỗi, `"status":5` để xem lỗi 5xx, hoặc dán `requestId`.
- Lỗi 500 trả về cho người dùng có `error.requestId`. Khi có người báo lỗi, xin mã này rồi tìm trong Logs để thấy đúng dòng `"type":"exception"` kèm stack trace.
- `/health` thành công không được ghi log, vì Render gọi liên tục.

### Smoke test

Workflow `.github/workflows/smoke.yml` chạy lúc 08:00 giờ Việt Nam mỗi ngày, hoặc khi bấm **Run workflow**. Nó kiểm tra: `/health` (app và DB), trang chủ, header bảo mật, chuẩn lỗi 404, `/api/auth/me` khi không có token.

Để smoke test thử cả đăng nhập, thêm 2 secret trong GitHub → Settings → Secrets and variables → Actions:
`SMOKE_EMAIL`, `SMOKE_PASSWORD` (nên dùng tài khoản STAFF).

Workflow này **không chạy khi push**. Render chỉ deploy khi mọi check của commit xanh: nếu smoke test chờ bản deploy mới thì hai bên sẽ chờ nhau mãi. Sau khi merge, đợi Render deploy xong rồi bấm Run workflow, có thể nhập commit vào ô `expect_version` để chắc chắn đúng bản.

### Bảo mật đã bật

- Giới hạn đăng nhập: tối đa 10 lần mỗi 15 phút cho mỗi IP, lần vượt trả `429 TOO_MANY_REQUESTS`.
  - IP người dùng lấy từ header `CF-Connecting-IP` do Cloudflare (đứng trước Render) đặt, vì `req.ip` trên Render chỉ là IP của proxy và thay đổi theo từng request. Chỉ tin header này khi chạy trên Render (`RENDER=true`). Đặt `TRUST_CF_CONNECTING_IP=false` để tắt, hoặc `=true` để bật ở nơi khác có Cloudflare phía trước.
- GitHub secret scanning và push protection: GitHub chặn push có chứa key.
- CI job `secrets` (gitleaks, cấu hình trong `.gitleaks.toml`): quét các commit của mỗi PR, bắt cả chuỗi kết nối DB có mật khẩu và các dòng `*_SECRET=`, `*_PASSWORD=`.

## Giới hạn gói Free cần biết

- **Render tắt app sau 15 phút không có request**, lần truy cập sau chờ khoảng 1 phút. Trước demo/nghiệm thu, mở web trước vài phút.
- Render Free có 750 giờ chạy mỗi tháng, đủ cho 1 service chạy liên tục.
- Render Free không lưu file trên ổ đĩa: mọi dữ liệu phải nằm trong MySQL. Upload ảnh (phần mở rộng) cần dịch vụ lưu trữ ngoài.
- Aiven Free: 1 CPU, 1 GB RAM, 1 GB ổ đĩa. Có thể bị tắt nếu lâu không dùng, Aiven báo trước qua email và bật lại được.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `/health` trả `"db":"down"` | Sai `DATABASE_URL`, hoặc service Aiven đang tắt |
| Log có `HANDSHAKE_SSL_ERROR` | `DB_CA_CERT` sai hoặc thiếu dòng BEGIN/END |
| Log có `SSL enabled without DB_CA_CERT` | Chưa đặt `DB_CA_CERT`: vẫn chạy nhưng không xác minh server, nên bổ sung |
| Deploy treo ở health check | App không kết nối được DB: xem Logs |
| `Missing required environment variables` | Thiếu `DATABASE_URL` hoặc `JWT_SECRET` |
