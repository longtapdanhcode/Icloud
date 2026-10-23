# Triển khai lên Railway

## Lần đầu (Người 4)

1. Đăng nhập https://railway.com bằng GitHub.
2. **New Project → Deploy from GitHub repo**, chọn repo này. Railway tạo một service Node.
3. Trong project: **+ New → Database → MySQL**. Railway tạo service `MySQL`.
4. Mở Node service → tab **Variables**, thêm:

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (tham chiếu, dùng mạng nội bộ Railway) |
   | `JWT_SECRET` | chuỗi ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `NODE_ENV` | `production` |
   | `SEED_ADMIN_PASSWORD` | mật khẩu admin mạnh (chỉ dùng khi seed) |
   | `SEED_STAFF_PASSWORD` | mật khẩu staff mạnh |

5. Node service → **Settings → Networking → Generate Domain** để có URL công khai `*.up.railway.app`.
6. Deploy. `railway.json` đã cấu hình sẵn:
   - Start: `npm run db:migrate && npm start` (tạo bảng nếu chưa có, không xóa dữ liệu).
   - Health check: `/health`. Deploy mới chỉ nhận traffic khi trả 200.
7. Seed dữ liệu lần đầu (chỉ một lần), chạy từ máy bạn. Máy bạn không vào được mạng nội bộ Railway, nên dùng URL công khai:
   - MySQL service → tab **Variables** → copy giá trị `MYSQL_PUBLIC_URL`.
   - Chạy:
     ```bash
     DATABASE_URL="<MYSQL_PUBLIC_URL>" \
     SEED_ADMIN_PASSWORD="<mật khẩu admin>" SEED_STAFF_PASSWORD="<mật khẩu staff>" \
     npm run db:seed
     ```
   - Không lưu URL này vào file nào trong repo.
8. Kiểm tra: `https://<domain>/health` phải trả `{"status":"ok","db":"up",...}`.

## Auto-deploy (CI/CD)

- Node service → **Settings → Source**: branch `main`, bật auto-deploy.
- Bật **Wait for CI** để Railway chỉ deploy khi GitHub Actions xanh.
- Luồng: PR → CI chạy test → merge `main` → CI xanh → Railway build và deploy → health check → chuyển traffic.

## Vận hành

| Việc | Ở đâu |
|---|---|
| Xem log | Service → Deployments → View Logs, hoặc `railway logs` |
| CPU/RAM/Network | Service → Metrics |
| Rollback | Deployments → chọn bản cũ → Redeploy |
| Chi phí | Project → Usage. Đặt usage limit để tránh vượt ngân sách |

Backup và restore: làm ở tuần 4 (`docs/RUNBOOK.md`).

## Biến môi trường: quy tắc

- Không commit `.env`. Chỉ commit `.env.example` (không có giá trị thật).
- Secret chỉ đặt trong tab Variables của Railway.
- Khi thêm biến mới: cập nhật `.env.example` và báo cả nhóm.
