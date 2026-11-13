# Kịch bản demo

Thời lượng khoảng 15 phút: 10 phút nghiệp vụ trên web, 5 phút phần cloud và vận hành.

- Web: https://cloud-inventory-ruyb.onrender.com
- Tài khoản production: ADMIN và STAFF. **Mật khẩu không ghi trong repo**, Người 4 đưa trực tiếp cho người trình bày.
- Không dùng tài khoản `staff@inventory.local` để demo chức năng khóa nhân viên: smoke test hằng ngày dùng tài khoản này.

## Chuẩn bị

**Trước 1 ngày:**
- [ ] `npm run db:backup` bản production (xem [BACKUP_RESTORE.md](BACKUP_RESTORE.md)), cất vào Google Drive riêng.
- [ ] Chạy smoke test (GitHub → Actions → Smoke test → Run workflow), kết quả `13/13 passed`.
- [ ] Đăng nhập thử cả hai tài khoản ADMIN và STAFF bằng mật khẩu sẽ dùng khi demo.
- [ ] Không merge PR nào sau lần chạy thử cuối cùng.

**Trước 10 phút:**
- [ ] Mở https://cloud-inventory-ruyb.onrender.com/health, chờ đến khi thấy `"db":"up"`. Lần mở đầu có thể mất 1–3 phút vì Render Free tắt app khi không có request.
- [ ] Mở sẵn các tab: trang web (chưa đăng nhập), GitHub repo tab **Actions**, Render tab **Logs**, file `docs/BACKUP_RESTORE.md` phần biên bản.
- [ ] Mở thêm một cửa sổ ẩn danh để đăng nhập STAFF song song với ADMIN.
- [ ] Chọn mã SKU chưa dùng cho sản phẩm mới, ví dụ `DEMO-01`. Mỗi lần chạy thử dùng mã khác (`DEMO-02`, ...) vì SKU không được trùng.

## Phần 1: Nghiệp vụ (khoảng 10 phút)

| # | Thao tác | Điều cần chỉ ra | Phụ trách |
|---|---|---|---|
| 1 | Mở trang web, đăng nhập ADMIN | Đăng nhập xong vào thẳng dashboard. Mật khẩu lưu dạng bcrypt, phiên đăng nhập dùng JWT | Người 3 |
| 2 | Dashboard | 4 thẻ số liệu, biểu đồ nhập/xuất, bảng cảnh báo tồn thấp. Ghi lại **tổng sản phẩm** và **số sản phẩm tồn thấp** để so sánh ở bước 9 | Người 3 |
| 3 | Danh mục → thêm danh mục "Đồ uống đóng chai" | CRUD danh mục. Thử xóa danh mục đang có sản phẩm, ví dụ "Đồ uống": bị từ chối | Người 1 |
| 4 | Sản phẩm → thêm sản phẩm `DEMO-01` "Trà xanh chai 455ml", giá 10.000, tồn tối thiểu 20, danh mục vừa tạo | Validate: thử nhập lại SKU `DU-001` → báo trùng. Giá âm → báo lỗi. Số lượng tồn không sửa trực tiếp được, chỉ thay đổi qua phiếu kho | Người 1 |
| 5 | Danh sách sản phẩm: tìm "trà", lọc theo danh mục, sắp xếp theo giá, chuyển trang | Tìm kiếm, lọc, sắp xếp, phân trang chạy phía server | Người 1 |
| 6 | Nhà cung cấp → thêm "Công ty Nước giải khát Sông Hàn" | CRUD nhà cung cấp, chỉ ADMIN được thêm, sửa, xóa | Người 2 |
| 7 | Nhập/Xuất kho → tạo **phiếu nhập**: nhà cung cấp vừa tạo, `DEMO-01` số lượng 50, đơn giá 7.000 | Tồn kho `DEMO-01` tăng từ 0 lên 50 | Người 2 |
| 8 | Tạo **phiếu xuất** `DEMO-01` số lượng 100 | Bị từ chối "Không đủ tồn kho" (409), tồn kho vẫn là 50. Nói về transaction và khóa dòng `SELECT ... FOR UPDATE`: lỗi giữa chừng thì không thay đổi gì | Người 2 |
| 9 | Tạo phiếu xuất `DEMO-01` số lượng 40, rồi xem chi tiết phiếu trong lịch sử | Tồn còn 10, dưới mức tối thiểu 20. Lịch sử lọc được theo loại, ngày, sản phẩm | Người 2 |
| 10 | Quay lại dashboard | Tổng sản phẩm tăng 1, `DEMO-01` xuất hiện trong bảng tồn thấp, biểu đồ có thêm 1 nhập và 1 xuất | Người 3 |
| 11 | Nhân viên → thêm một STAFF mới, sau đó khóa tài khoản đó | ADMIN quản lý nhân viên. Tài khoản bị khóa không đăng nhập được nữa, kể cả token cũ cũng bị chặn | Người 3 |
| 12 | Cửa sổ ẩn danh: đăng nhập STAFF | Không có menu Nhân viên. Không có nút xóa sản phẩm, không thêm/sửa/xóa nhà cung cấp. Vẫn tạo được phiếu kho | Người 3 |

## Phần 2: Cloud và vận hành (khoảng 5 phút, Người 4)

| # | Nội dung | Mở ở đâu |
|---|---|---|
| 1 | Kiến trúc: trình duyệt → Render (Node.js/Express, HTTPS) → Aiven MySQL qua TLS. Secret chỉ nằm trong biến môi trường | Sơ đồ trong README |
| 2 | Health check: `version` là commit đang chạy, `db: up` | `/health` |
| 3 | CI/CD: mỗi PR chạy test với MySQL thật và quét secret (gitleaks). Merge vào `main`, CI xanh thì Render tự deploy | GitHub → Actions, một PR đã merge |
| 4 | Smoke test production chạy mỗi sáng: 13 kiểm tra gồm đăng nhập, các API chính, phân quyền STAFF | GitHub → Actions → Smoke test |
| 5 | Log có cấu trúc: lọc `"status":4` để thấy chính phiếu xuất vượt tồn (409) vừa tạo ở bước 8, kèm `requestId` | Render → Logs |
| 6 | Backup và restore thử: biên bản 7/7 bảng khớp với production | `docs/BACKUP_RESTORE.md` |
| 7 | Bảo mật: header bảo mật (helmet), giới hạn 10 lần đăng nhập mỗi 15 phút, mật khẩu mặc định đã tắt trên production | `docs/RENDER_SETUP.md` |
| 8 | Giới hạn gói Free và cách xử lý | `docs/LIMITS.md` |

## Nếu có sự cố khi demo

| Sự cố | Xử lý |
|---|---|
| Trang quay mãi không lên | App đang khởi động lại, chờ thêm 1–2 phút. Trong lúc chờ, chuyển sang trình bày Phần 2 bằng GitHub |
| `/health` báo `db: down` | Aiven đang tắt: Aiven → **Power on**, chờ 2–5 phút ([RUNBOOK.md](RUNBOOK.md)) |
| Đăng nhập báo quá nhiều lần thử | Đã nhập sai quá 10 lần trong 15 phút. Dùng tài khoản còn lại, hoặc dùng mạng khác (4G) |
| Một trang báo lỗi | Mở Render → Logs, tìm `requestId` hiện trên thông báo lỗi. Có thể dùng chính việc này để demo cách tra log |

## Sau buổi demo

- Đổi mật khẩu ADMIN và STAFF đã đưa cho người trình bày. Nếu đổi mật khẩu `staff@inventory.local` thì cập nhật luôn secret `SMOKE_PASSWORD`.
- Chạy smoke test một lần để chắc hệ thống vẫn ổn.
