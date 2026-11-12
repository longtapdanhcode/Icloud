# Giới hạn và chi phí hạ tầng

Toàn bộ hạ tầng dùng gói miễn phí, **chi phí hiện tại: 0 đồng**. Tài liệu này ghi các giới hạn của từng gói, mức dự án đang dùng, và việc cần làm khi chạm giới hạn.

Số liệu giới hạn lấy từ tài liệu chính thức của Render, Aiven và GitHub ngày 12/11/2026. Các nhà cung cấp có thể đổi chính sách, nên kiểm tra lại trên dashboard trước khi nộp báo cáo.

## Tổng quan

| Dịch vụ | Gói | Dùng cho | Chi phí |
|---|---|---|---|
| Render | Free (Hobby workspace) | Chạy web app Node.js, HTTPS, auto-deploy | 0 |
| Aiven | Free, MySQL 8 | Database production | 0 |
| GitHub | Free, repo public | Code, PR, CI (Actions), secret scanning | 0 |

## Render (web app)

| Giới hạn | Gói Free | Dự án đang dùng | Đánh giá |
|---|---|---|---|
| Giờ chạy | 750 giờ/tháng cho mỗi workspace | 1 service, tối đa khoảng 720 giờ/tháng nếu chạy liên tục | Đủ, nếu workspace không có service Free nào khác |
| Tắt khi rảnh | Sau 15 phút không có request | App tắt phần lớn thời gian trong ngày | Gây chậm lần mở đầu (xem dưới) |
| Khởi động lại | Render ghi khoảng 1 phút | Đo thực tế: 1–3 phút (11/11: khoảng 2.5 phút) | **Rủi ro cho demo** |
| Số instance | 1, không scale | 1 | Đủ cho quy mô cửa hàng nhỏ |
| Ổ đĩa | Tạm thời, mất khi restart hoặc redeploy | Không ghi file, mọi dữ liệu nằm trong MySQL | Không ảnh hưởng |
| Băng thông, phút build | Có hạn mức theo tháng của workspace (xem Billing) | Băng thông ra 8 MB trong tháng 11 (tính đến 12/11). Build `npm ci` khoảng 1 phút | Xa hạn mức |
| Maintenance Mode, shell, one-off job | Không có | — | Khôi phục DB phải dùng **Suspend** thay cho Maintenance Mode |
| Xem CPU/RAM | Không có: trang Metrics chỉ hiện băng thông, CPU/RAM chỉ có ở gói trả phí | — | Xem mục baseline bên dưới |

**Khi vượt giới hạn:**
- Hết 750 giờ: mọi service Free bị tạm dừng đến đầu tháng sau.
- Vượt băng thông mà chưa có phương thức thanh toán: mọi service Free bị tạm dừng đến hết tháng.
- Vượt phút build: không build được bản mới đến hết tháng, bản đang chạy vẫn chạy.
- Render có thể khởi động lại service Free bất cứ lúc nào.

**Xử lý việc khởi động chậm:**
- Trước demo hoặc nghiệm thu: mở `/health` trước 5 phút, chờ thấy `"db":"up"`.
- Từ 12/11/2026 đã bật UptimeRobot (gói Free) gọi `/health` 5 phút một lần để app không tắt. App chạy liên tục tốn khoảng 720 giờ/tháng, vẫn trong hạn mức 750 giờ. UptimeRobot còn gửi email cho Người 4 khi app không phản hồi.
- Lâu dài: gói Starter của Render không tắt khi rảnh (có phí, kiểm tra giá trên render.com/pricing).

## Aiven (MySQL)

| Giới hạn | Gói Free | Dự án đang dùng | Đánh giá |
|---|---|---|---|
| CPU / RAM | 1 CPU, 1 GB RAM, 1 node | — | Đủ |
| Ổ đĩa | 1 GB (giảm từ 5 GB từ 15/05/2025) | Bản backup nén 2.8 KB, dữ liệu chỉ vài trăm KB | Còn rất nhiều |
| Tắt khi rảnh | Tự tắt nếu lâu không dùng, báo trước qua email | Chưa bị tắt lần nào | Bật lại bằng **Power on** |
| Backup, fork, restore trên dashboard | Không có trên gói Free | — | Nhóm tự backup bằng `mysqldump` (xem [BACKUP_RESTORE.md](BACKUP_RESTORE.md)) |
| Vùng, nhà cung cấp cloud | Không chọn được | — | Độ trễ DB phụ thuộc vùng Aiven chọn |

**Rủi ro quan trọng:** Aiven đã **ngừng cho tạo service MySQL miễn phí mới**. Service hiện có vẫn chạy bình thường. Nhưng nếu service bị xóa hoặc mất, sẽ không tạo lại được MySQL Free. Phương án dự phòng:
1. Luôn có bản backup mới nhất ở máy cá nhân và Google Drive riêng.
2. Nếu mất service: tạo MySQL gói Developer của Aiven (khoảng 5 USD/tháng, không tự tắt), restore bản backup bằng `npm run db:restore -- <file> --allow-remote`, đổi `DATABASE_URL` trên Render.
3. Không bấm **Delete service** trên Aiven, kể cả khi dự án kết thúc, nếu còn cần chạy lại demo.

## GitHub

| Giới hạn | Gói Free, repo public | Dự án đang dùng |
|---|---|---|
| GitHub Actions | Không giới hạn phút với runner chuẩn cho repo public | CI khoảng 40 giây mỗi lần, smoke test khoảng 20 giây mỗi ngày |
| Secret scanning, push protection | Có | Đã bật |
| Branch protection | Có | `main` cần job `test` xanh và 1 người duyệt. Admin repo được bỏ qua khi cần |

Lưu ý: GitHub tự tắt workflow chạy theo lịch (smoke test hằng ngày) nếu repo không có hoạt động trong 60 ngày.

## Baseline hiệu năng

Đo trên production. Render Free không hiển thị CPU/RAM, nên baseline dùng thời gian phản hồi và băng thông.

| Chỉ số | Giá trị | Ngày đo |
|---|---|---|
| `/health` khi app đang chạy | 0.3–0.4 giây | 11/11/2026 |
| API danh sách (products, suppliers, stock-transactions), qua smoke test | 0.3–0.5 giây | 09/11/2026 |
| `POST /api/auth/login` (bcrypt) | 0.8–0.9 giây | 09/11/2026 |
| Lần mở đầu sau khi app tắt | 23 giây đến khoảng 2.5 phút | 11–12/11/2026 |
| Băng thông ra (Render Metrics, 7 ngày) | 8 MB trong tháng, cao nhất khoảng 5.5 MB/giờ ngày 11/11 | 12/11/2026 |

Ảnh chụp metrics lưu kèm báo cáo cuối kỳ.

## Nguồn

- Render Free: https://render.com/docs/free
- Render Maintenance Mode (chỉ gói trả phí): https://render.com/docs/maintenance-mode
- Aiven free plan: https://aiven.io/docs/platform/concepts/free-plan
- Aiven ngừng MySQL miễn phí: https://aiven.io/free-mysql-database-retired
- Aiven giảm dung lượng gói Free còn 1 GB: https://aiven.io/changelog/6ad6c429-6c1c-4418-abfb-2ca82f927414
- GitHub Actions billing: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
