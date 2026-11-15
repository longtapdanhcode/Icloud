# Checklist nghiệm thu

Checklist theo mục 4 của lộ trình. Mỗi mục có hai cột:

- **Tự động:** đã có bằng chứng từ CI, smoke test, Postman hoặc biên bản. Người 4 điền sẵn, ghi ngày.
- **Trên production:** người phụ trách làm tay trên https://cloud-inventory-ruyb.onrender.com rồi tick. Đây là cột dùng để nghiệm thu.

Chỉ tick cột production sau khi tự làm và thấy đúng kết quả ghi trong cột "Cách kiểm tra". Sai thì ghi vào mục "Lỗi phát hiện" ở cuối, không tick.

**Lưu ý khi kiểm tra trên production:**
- Dùng mã SKU, tên bắt đầu bằng `NT-` (nghiệm thu) để dễ nhận ra và dọn sau.
- Không khóa và không đổi mật khẩu tài khoản `staff@inventory.local`: smoke test hằng ngày dùng tài khoản này.
- Để kiểm tra khóa tài khoản, tạo một STAFF mới tên `NT-...`.

## Tài khoản và phân quyền

| # | Tiêu chí | Cách kiểm tra | Tự động | Trên production | Người |
|---|---|---|---|---|---|
| 1 | Admin đăng nhập, dùng được toàn bộ chức năng | Đăng nhập ADMIN, mở lần lượt: Dashboard, Sản phẩm, Thêm sản phẩm, Danh mục, Thêm danh mục, Nhà cung cấp, Nhập/Xuất kho, Quản lý nhân viên. Trang nào cũng tải được dữ liệu | Smoke test đăng nhập (15/11) | ☐ | Người 3 |
| 2 | Staff đăng nhập, bị chặn đúng các chức năng của Admin | Đăng nhập STAFF (cửa sổ ẩn danh). Không có menu Quản lý nhân viên, Thêm danh mục. Không có nút xóa sản phẩm, thêm/sửa/xóa danh mục và nhà cung cấp. Gõ thẳng `/users.html` và `/category-form.html` bị từ chối. Vẫn thêm/sửa sản phẩm và tạo phiếu kho được | API: test CI và Postman thư mục 3 (6 trường hợp 403); smoke test `GET /api/users` → 403 (15/11) | ☐ | Người 3 |
| 3 | Truy cập API không có token trả về 401 | Mở `/api/products` trên trình duyệt chưa đăng nhập: thấy `"success":false` và mã lỗi `UNAUTHORIZED` | Smoke test hằng ngày: `/api/auth/me`, `/api/stock-transactions` → 401 | ☐ | Người 4 |

## Nghiệp vụ

| # | Tiêu chí | Cách kiểm tra | Tự động | Trên production | Người |
|---|---|---|---|---|---|
| 4 | CRUD sản phẩm chạy đúng | Thêm sản phẩm `NT-01`, sửa giá, xem chi tiết. Xóa một sản phẩm `NT-` chưa có phiếu kho | `tests/products.test.js` (43 test), Postman thư mục 4 | ☐ | Người 1 |
| 5 | CRUD danh mục chạy đúng | Thêm danh mục `NT-Danh mục`, sửa, xóa. Xóa danh mục đang có sản phẩm bị từ chối | `tests/categories.test.js` (19 test), Postman thư mục 4 | ☐ | Người 1 |
| 6 | CRUD nhà cung cấp chạy đúng | Thêm `NT-NCC`, sửa số điện thoại, xóa | `tests/suppliers.test.js`, Postman thư mục 4 | ☐ | Người 2 |
| 7 | Tìm kiếm, lọc, sắp xếp, phân trang chạy đúng | Sản phẩm: tìm theo tên, lọc theo danh mục, sắp xếp theo giá tăng/giảm, chuyển trang 2. Lịch sử phiếu: lọc theo loại, ngày, sản phẩm | `tests/products.test.js`, Postman thư mục 2 | ☐ | Người 1, Người 2 |
| 8 | Nhập kho tăng tồn, xuất kho giảm tồn | Nhập 50 `NT-01` → tồn 50. Xuất 40 → tồn 10 | `tests/stock-transactions.test.js`, Postman thư mục 5 | ☐ | Người 2 |
| 9 | Xuất vượt tồn bị từ chối, dữ liệu không đổi | Xuất 100 `NT-01` khi tồn 50: báo không đủ tồn kho, tồn vẫn 50, lịch sử không có phiếu mới | `tests/stock-transactions.test.js`, Postman thư mục 5 | ☐ | Người 2 |
| 10 | Giá và số lượng âm bị từ chối | Thêm sản phẩm giá `-1`: báo lỗi. Tạo phiếu số lượng `0` hoặc `-5`: báo lỗi | `tests/products.test.js`, Postman thư mục 4 | ☐ | Người 1, Người 2 |
| 11 | Dashboard đúng số liệu, cảnh báo tồn thấp xuất hiện | Sau bước 8, dashboard: tổng sản phẩm tăng, `NT-01` (tồn 10, tối thiểu 20) có trong bảng tồn thấp, biểu đồ có thêm phiếu nhập và xuất | `tests/dashboard.test.js`, Postman thư mục 5 | ☐ | Người 3 |

## Cloud và vận hành

| # | Tiêu chí | Cách kiểm tra | Tự động | Trên production | Người |
|---|---|---|---|---|---|
| 12 | Website có domain công khai, chạy HTTPS | Mở https://cloud-inventory-ruyb.onrender.com, trình duyệt hiện ổ khóa. Mở bản `http://` tự chuyển sang `https://` | Smoke test gọi qua HTTPS mỗi ngày | ☐ | Người 4 |
| 13 | Dữ liệu vẫn còn sau redeploy | Ghi số sản phẩm trên dashboard. Render → **Manual Deploy**. Sau khi deploy xong, số sản phẩm không đổi, `NT-01` vẫn còn | Dữ liệu seed còn nguyên qua các lần deploy PR #15–#22; smoke test sau mỗi deploy đọc được danh sách | ☐ | Người 4 |
| 14 | Merge vào `main` tự động deploy | Merge một PR, sau khoảng 2 phút `/health` trả `version` là commit merge | PR #19–#22: `version` khớp commit merge mỗi lần | ☐ | Người 4 |
| 15 | Secret chỉ nằm trong environment variables, không có trong Git | Render → Environment có `DATABASE_URL`, `DB_CA_CERT`, `JWT_SECRET`. GitHub → Settings → Code security: secret scanning và push protection đang bật, không có cảnh báo | Job `secrets` (gitleaks) pass ở mọi PR | ☐ | Người 4 |
| 16 | `/health` hoạt động, log xem được, metrics xem được | `/health` trả `db: up`. Render → Logs thấy dòng JSON của request vừa làm. Render → Metrics thấy băng thông; UptimeRobot thấy thời gian phản hồi | UptimeRobot kiểm tra 5 phút một lần từ 12/11 | ☐ | Người 4 |
| 17 | Đã có backup và đã restore thử thành công ít nhất một lần | Mở biên bản trong [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Biên bản 04/11: 7/7 bảng khớp | ☐ | Người 4 |

## Sau khi kiểm tra

- Xóa dữ liệu `NT-` đã tạo nếu xóa được. Sản phẩm đã có phiếu kho thì giữ lại (không xóa được), ghi vào biên bản.
- Khóa các tài khoản STAFF `NT-` đã tạo.
- Chạy smoke test một lần (GitHub → Actions → Smoke test → Run workflow).

## Biên bản

| Mục | Nội dung |
|---|---|
| Ngày nghiệm thu | |
| Người tham gia | |
| Bản đang chạy (`version` ở `/health`) | |
| Kết quả smoke test | |
| Số mục đạt | /17 |

### Lỗi phát hiện

| # | Mục | Mô tả lỗi | Người sửa | PR sửa | Kiểm tra lại |
|---|---|---|---|---|---|
| | | | | | |

**Kết luận:** ☐ Đạt nghiệm thu ☐ Chưa đạt (còn lỗi chặn ở bảng trên)
