# Sao lưu và khôi phục MySQL

Gói free của Aiven không có chức năng khôi phục (fork/restore) trên dashboard, nên nhóm tự sao lưu bằng `mysqldump`.

Ba lệnh:

| Lệnh | Việc |
|---|---|
| `npm run db:backup` | Dump DB ra `backups/<db>-<nguồn>-<giờ UTC>.sql.gz`, kèm file `.sha256` |
| `npm run db:restore -- <file>` | Khôi phục vào DB riêng trên MySQL local (`inventory_restore`) |
| `npm run db:compare` | So số dòng và mã băm nội dung từng bảng giữa DB gốc và bản khôi phục |

Yêu cầu: Docker đang chạy (`docker compose up -d`). `mysqldump` và `mysql` chạy trong container `mysql:8.4`, không cần cài MySQL client.

## Lưu ý an toàn

- **File backup chứa toàn bộ dữ liệu, kể cả mã băm mật khẩu.** Không commit (thư mục `backups/` đã có trong `.gitignore`), không gửi qua chat nhóm. Cất bản sao ở Google Drive cá nhân hoặc ổ đĩa riêng.
- Mật khẩu DB không nằm trong tham số lệnh: script ghi vào một file tạm quyền 600, mount vào container, rồi xóa ngay.
- `db:restore` **mặc định chỉ ghi vào DB local** và từ chối ghi đè DB đang có bảng. Muốn ghi đè phải thêm `--replace`, muốn khôi phục lên cloud phải thêm `--allow-remote`.

## Sao lưu production (Aiven)

Chạy trong terminal của bạn, **không dán Service URI vào chat hay vào file trong repo**:

```bash
# Nhập Service URI của Aiven (Aiven → service MySQL → Overview → Service URI).
# read -s không hiện ra màn hình và không lưu vào lịch sử shell.
read -s "BACKUP_DATABASE_URL?Aiven Service URI: "   # zsh (macOS)
# read -s -p "Aiven Service URI: " BACKUP_DATABASE_URL  # bash
export BACKUP_DATABASE_URL

# Không bắt buộc, nên có: xác minh chứng chỉ server bằng CA của Aiven (Overview → CA certificate)
export DB_CA_CERT="$(cat ~/Downloads/ca.pem)"

npm run db:backup
```

Aiven bản free có thể tự tắt khi lâu không dùng. Nếu báo lỗi kết nối, vào Aiven bật service rồi chạy lại.

**Khi nào cần backup:**
- trước buổi demo và trước buổi nghiệm thu
- trước khi merge một PR có migration mới (`db/migrations/`)
- định kỳ mỗi tuần một lần

## Khôi phục thử (restore test)

Làm ngay sau khi backup, trong cùng terminal (vẫn còn `BACKUP_DATABASE_URL`):

```bash
docker compose up -d                                 # MySQL local
npm run db:restore -- backups/<file vừa tạo>.sql.gz  # vào inventory_restore; thêm --replace nếu đã có
npm run db:compare                                   # Aiven so với inventory_restore
```

`db:compare` in ra bảng Markdown, chép vào biên bản bên dưới. Nếu có người thao tác trên web giữa lúc backup và lúc compare, các bảng bị sửa sẽ báo lệch. Khi đó backup lại rồi compare ngay.

Kiểm tra thêm trên bản khôi phục: trỏ app local vào DB đó rồi đăng nhập thử.

```bash
DATABASE_URL=mysql://root:root@localhost:3306/inventory_restore PORT=3001 npm start
```

## Khôi phục production khi có sự cố thật

Chỉ làm khi dữ liệu trên Aiven bị hỏng hoặc mất, và cả nhóm đã thống nhất. Dữ liệu phát sinh sau thời điểm backup sẽ mất.

1. Chặn ghi dữ liệu trong lúc khôi phục: Render → service → **Settings → Suspend Web Service** (nếu dashboard có nút này). Nếu không có, báo cả nhóm ngừng thao tác trên web. Maintenance Mode chỉ có trên gói trả phí nên không dùng được.
2. Backup trạng thái hiện tại trước (`npm run db:backup`), phòng khi cần quay lại.
3. Khôi phục bản tốt gần nhất:
   ```bash
   read -s "RESTORE_DATABASE_URL?Aiven Service URI: "; export RESTORE_DATABASE_URL
   npm run db:restore -- backups/<bản tốt>.sql.gz --replace --allow-remote
   ```
4. Nếu đã Suspend thì bấm **Resume Web Service**. Mở `/health`, chạy smoke test (GitHub → Actions → Smoke test → Run workflow).

Bảng `schema_migrations` được khôi phục cùng dữ liệu, nên lần deploy sau `db:migrate` chỉ chạy những migration mới hơn bản backup.

---

## Biên bản khôi phục thử

Dùng mẫu này cho mỗi lần khôi phục thử. Bản đã điền của lần đầu nằm ngay bên dưới.

| Mục | Nội dung |
|---|---|
| Ngày giờ | |
| Người thực hiện | |
| DB nguồn | Aiven MySQL (production) |
| DB đích | `inventory_restore` trên MySQL 8.4 local (Docker) |
| File backup | `backups/…` |
| Dung lượng / sha256 | |

**Kết quả đối chiếu (`npm run db:compare`):** _(dán bảng vào đây)_

**Kiểm tra trên app:** chạy app trỏ vào bản khôi phục, gọi các API chính: ☐ được ☐ không

**Kết luận:** ☐ Khôi phục thành công, dữ liệu khớp 100% ☐ Có lệch (ghi rõ nguyên nhân)

### Lần 1: 04/11/2026 (production Aiven → local)

| Mục | Nội dung |
|---|---|
| Ngày giờ | 04/11/2026, 16:40 (giờ Việt Nam), tức 09:40 UTC |
| Người thực hiện | Long |
| DB nguồn | Aiven MySQL `mysql-icloud-icloud`, database `defaultdb` (production) |
| DB đích | `inventory_restore` trên MySQL 8.4 local (Docker) |
| File backup | `defaultdb-mysql-icloud-icloud-20261104-094023Z.sql.gz` (cất ngoài Git) |
| Dung lượng / sha256 | 2.8 KB / `f2f502ca1f67db74…` |
| Các bước | `npm run db:backup` → `npm run db:restore -- <file> --replace` → `npm run db:compare` |

**Kết quả đối chiếu:**

| Bảng | Số dòng (defaultdb) | Số dòng (inventory_restore) | Mã băm nội dung | Kết quả |
|---|---:|---:|---|---|
| categories | 4 | 4 | c585ead73de7… | ✅ khớp |
| products | 10 | 10 | 819c36a8b852… | ✅ khớp |
| schema_migrations | 2 | 2 | dfbfe10aad0e… | ✅ khớp |
| stock_transaction_items | 14 | 14 | 818e79ca5726… | ✅ khớp |
| stock_transactions | 4 | 4 | 9f0ea2bc88c4… | ✅ khớp |
| suppliers | 3 | 3 | e9690de4caee… | ✅ khớp |
| users | 2 | 2 | 57903147c91f… | ✅ khớp |

7/7 bảng khớp. Mã băm được tính trên toàn bộ nội dung từng bảng, sắp theo khóa chính, nên khớp mã băm nghĩa là từng dòng, từng cột đều giống nhau.

**Kiểm tra trên app:** chạy app (`npm start`) trỏ vào `inventory_restore`. Kết quả: `/health` trả `db: up`. Các API đều trả 200 với đủ dữ liệu:
- `/api/auth/me`: tài khoản ADMIN
- `/api/products`: 10 sản phẩm
- `/api/suppliers`: 3 nhà cung cấp
- `/api/stock-transactions`: 4 phiếu
- `/api/users/statistics`: 1 nhân viên

Token dùng để gọi API được ký bằng `JWT_SECRET` local, nên không cần dùng mật khẩu production.

**Kết luận:** ☑ Khôi phục thành công, dữ liệu khớp 100%.

**Ghi chú:** lần này chạy chưa có `DB_CA_CERT`, nên đường truyền tới Aiven có mã hóa TLS nhưng chưa xác minh chứng chỉ server. Các lần sau nên đặt `DB_CA_CERT` (xem mục "Sao lưu production").

### Lần chạy thử trên DB local (kiểm tra script)

Ngày 04/11/2026, DB `inventory` local → `inventory_restore`: 7/7 bảng khớp (categories 5, products 11, schema_migrations 2, stock_transaction_items 17, stock_transactions 7, suppliers 4, users 2). Đã thử thêm: từ chối ghi đè khi không có `--replace`, từ chối đích không phải local, phát hiện file backup bị sửa (sha256), không để lại file dở khi sai mật khẩu, `compare` báo lệch khi sửa 1 dòng, chạy được với `ssl-mode=REQUIRED` như Aiven.
