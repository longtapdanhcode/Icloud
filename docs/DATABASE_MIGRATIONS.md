# Thay đổi schema database (migration)

Schema không còn nằm trong một file `schema.sql` duy nhất, mà là một chuỗi file trong `db/migrations/`, chạy theo thứ tự tên file:

```
db/migrations/
├── 20261023000000_initial_schema.sql         ← 6 bảng ban đầu (tuần 1)
├── 20261030081500_add_note_to_suppliers.sql  ← ví dụ: thay đổi sau này
└── ...
```

DB nào cũng có bảng `schema_migrations` ghi lại file nào đã chạy. `npm run db:migrate` chỉ chạy những file **chưa chạy**. Mỗi lần Render deploy đều tự chạy lệnh này trước khi khởi động app, nên DB production luôn được cập nhật theo code.

## Vì sao cần

Trước đây app chỉ dùng `CREATE TABLE IF NOT EXISTS`. Ai thêm cột vào `schema.sql` thì máy người đó chạy được (vì `db:reset` tạo lại bảng), nhưng **DB production không có cột mới, vì bảng đã tồn tại nên bị bỏ qua**, và app lỗi ngay sau khi deploy.

## Cách thêm một thay đổi schema

```bash
# 1. Tạo file (tên viết tiếng Việt có dấu cũng được, sẽ tự chuyển)
npm run db:migrate:new -- add_note_to_suppliers
# → db/migrations/20261030081500_add_note_to_suppliers.sql

# 2. Viết SQL vào file đó
#    ALTER TABLE suppliers ADD COLUMN note VARCHAR(255) NULL;

# 3. Chạy trên máy và kiểm tra
npm run db:migrate
npm run db:migrate:status
npm test

# 4. Commit file migration cùng code dùng đến nó, mở PR
```

Sau khi PR được merge, Render tự chạy migration khi deploy. Không cần ai vào Aiven chạy tay.

## Quy tắc bắt buộc

1. **Không sửa file migration đã merge vào `main`.** File đó đã chạy trên production. Nếu sửa, `db:migrate` sẽ dừng với lỗi *"File migration đã chạy nhưng bị sửa nội dung"* và **deploy sẽ thất bại**. Muốn đổi gì thì tạo file mới.
   - Trên nhánh của mình, **trước khi merge**, thì sửa thoải mái. Nếu đã chạy file đó trên máy thì chạy `npm run db:reset` để làm lại từ đầu.
2. **Bảng mới phải có `PRIMARY KEY`.** Aiven MySQL bắt buộc điều này. Thiếu khóa chính thì migration lỗi trên production dù máy bạn vẫn chạy được.
3. **Mỗi file một thay đổi nhỏ.** MySQL tự commit lệnh `ALTER`/`CREATE`, nên nếu file có 3 lệnh mà lệnh thứ 3 lỗi thì 2 lệnh đầu vẫn đã chạy. File càng nhỏ càng dễ sửa.
4. **Không xóa cột/bảng đang có dữ liệu** (`DROP COLUMN`, `DROP TABLE`) khi chưa thống nhất với cả nhóm và chưa có backup.
5. **Thêm cột `NOT NULL` vào bảng đã có dữ liệu thì ghi rõ `DEFAULT`.** Nếu thiếu, MySQL không báo lỗi mà âm thầm điền chuỗi rỗng `''` hoặc `0` vào mọi dòng cũ (ví dụ đơn vị tính bị trống), và lỗi chỉ lộ ra khi dùng.

## Ví dụ hay gặp

```sql
-- Thêm cột
ALTER TABLE suppliers ADD COLUMN note VARCHAR(255) NULL;

-- Thêm cột bắt buộc vào bảng đã có dữ liệu
ALTER TABLE products ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'cái';

-- Thêm index cho truy vấn hay dùng
CREATE INDEX idx_stock_items_product ON stock_transaction_items (product_id);

-- Bảng mới (nhớ PRIMARY KEY)
CREATE TABLE audit_logs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  action     VARCHAR(50)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run db:migrate` | Chạy các migration chưa chạy |
| `npm run db:migrate:status` | `✔` đã chạy, `…` đang chờ, `✖` đã bị sửa sau khi chạy |
| `npm run db:migrate:new -- <ten>` | Tạo file mới, tên theo giờ UTC hiện tại |
| `npm run db:reset` | **Xóa mọi bảng**, chạy lại toàn bộ migration và seed. Chỉ dùng trên máy, bị chặn ở production |

## Tình huống thường gặp

| Tình huống | Cách xử lý |
|---|---|
| Hai người cùng tạo migration trên 2 nhánh | Không sao. Tên file theo thời gian nên không trùng, nhánh merge sau vẫn được chạy bình thường. Chỉ cần 2 file không sửa cùng một cột |
| Pull `main` về thấy có migration mới | Chạy `npm run db:migrate` |
| `db:migrate` báo file bị sửa, trên máy mình | File đã chạy trên máy rồi mới sửa: chạy `npm run db:reset` |
| `db:migrate` báo file bị sửa, trên Render | Ai đó đã sửa file đã merge: hoàn tác thay đổi đó, tạo migration mới thay thế |
| Migration lỗi giữa chừng | Đọc lỗi (có ghi tên file), kiểm tra lệnh nào đã chạy, sửa file (dùng `IF NOT EXISTS` nếu cần) rồi chạy lại. File lỗi không được ghi là đã chạy |
| Cảnh báo "đã chạy trên DB nhưng không còn file" | File migration bị xóa khỏi repo. Khôi phục file đó |
| "Một tiến trình migrate khác đang chạy" | Có tiến trình khác đang migrate (ví dụ 2 lần deploy chồng nhau). Chờ rồi chạy lại |
