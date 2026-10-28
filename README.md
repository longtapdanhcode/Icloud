# Cloud Inventory

Hệ thống quản lý sản phẩm và tồn kho cho cửa hàng/doanh nghiệp nhỏ, triển khai trên Render (web) và Aiven (MySQL).

**Stack:** Node.js 22+ • Express 5 • MySQL 8 • Bootstrap • Render + Aiven MySQL • GitHub Actions

## Chạy trên máy (khoảng 10 phút)

Yêu cầu: Node.js 22+, Docker Desktop (để chạy MySQL).

```bash
git clone https://github.com/longtapdanhcode/Icloud.git && cd Icloud
npm install
cp .env.example .env
docker compose up -d       # chạy MySQL local trên cổng 3306
npm run db:migrate         # tạo bảng
npm run db:seed            # nạp dữ liệu mẫu
npm run dev                # http://localhost:3000, tự restart khi sửa code
```

Kiểm tra: mở http://localhost:3000/health và thấy `"db":"up"`.

Tài khoản mẫu: `admin@inventory.local / Admin@123` (ADMIN), `staff@inventory.local / Staff@123` (STAFF).

Không dùng Docker? Có thể cài MySQL 8 trực tiếp, tạo database `inventory`, rồi sửa `DATABASE_URL` trong `.env`.

## Lệnh

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy server, tự reload khi sửa code |
| `npm start` | Chạy server (production) |
| `npm test` | Chạy test |
| `npm run db:migrate` | Tạo bảng theo `db/schema.sql` (không xóa dữ liệu) |
| `npm run db:seed` | Nạp dữ liệu mẫu (chạy lại không bị trùng) |
| `npm run db:reset` | **Xóa toàn bộ bảng**, tạo lại và seed (chỉ dùng local) |

## Cấu trúc

```
src/
├── app.js                 # cấu hình Express, gắn router các module
├── server.js              # khởi động server, tắt an toàn khi redeploy
├── config/                # env.js (biến môi trường), db.js (pool MySQL, withTransaction)
├── middlewares/           # errorHandler.js (+ auth.js, role.js do Người 3 thêm)
├── utils/                 # response.js, AppError.js, pagination.js
└── modules/
    ├── health/            # GET /health                   — Người 4
    ├── auth/              # /api/auth                     — Người 3
    ├── products/          # /api/products                 — Người 1
    ├── categories/        # /api/categories               — Người 1
    ├── suppliers/         # /api/suppliers                — Người 2
    ├── inventory/         # /api/stock-transactions       — Người 2
    └── dashboard/         # /api/dashboard                — Người 3
public/                    # frontend tĩnh (HTML/CSS/JS)
db/schema.sql              # schema dùng chung
scripts/                   # migrate.js, seed.js
tests/                     # node:test + supertest
docs/                      # quy ước API, hướng dẫn deploy
```

Mỗi người chỉ làm trong thư mục module của mình. Router đã được gắn sẵn trong `src/app.js` nên **không cần sửa app.js**, tránh xung đột merge.

## Quy ước

- API: xem [docs/API_CONVENTIONS.md](docs/API_CONVENTIONS.md). Mọi response theo dạng `{ success, data, meta }` hoặc `{ success: false, error }`.
- Lỗi: `throw AppError.notFound(...)`, `AppError.conflict('INSUFFICIENT_STOCK', ...)`. Express 5 tự bắt lỗi async, không cần `try/catch` trong controller.
- Nghiệp vụ kho: dùng `db.withTransaction(async (conn) => { ... })`.

## Quy trình Git

1. Tạo nhánh từ `main`: `git checkout -b feature/products-crud`.
2. Commit nhỏ, rõ ràng: `feat(products): add pagination`.
3. Mỗi ngày cập nhật: `git pull origin main` vào nhánh của mình.
4. Push và mở Pull Request vào `main`. CI phải xanh và có ít nhất 1 người duyệt.
5. Merge vào `main`, CI xanh thì Render tự deploy.

**Không bao giờ commit `.env`, mật khẩu hoặc key.**

## Triển khai

Môi trường chính: **Render + Aiven MySQL**, xem [docs/RENDER_SETUP.md](docs/RENDER_SETUP.md).

Phương án dự phòng: Railway, xem [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md) (`railway.json` vẫn giữ).
