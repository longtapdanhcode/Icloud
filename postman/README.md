# Postman collection

| File | Dùng cho |
|---|---|
| `Cloud-Inventory.postman_collection.json` | 46 request, mỗi request có test kiểm tra mã HTTP và dữ liệu trả về |
| `local.postman_environment.json` | App chạy ở `http://localhost:3000` với tài khoản mẫu của `npm run db:seed` |
| `production.postman_environment.json` | https://cloud-inventory-ruyb.onrender.com, **mật khẩu để trống** |

## Import

Postman → **Import** → kéo cả 3 file vào. Chọn environment ở góc trên bên phải.

## Các thư mục

| Thư mục | Ghi dữ liệu | Chạy trên production |
|---|---|---|
| 1. Health và đăng nhập | Không | Được |
| 2. Đọc dữ liệu | Không | Được |
| 3. Phân quyền STAFF | Không (bị chặn 403 trước khi ghi) | Được |
| 4. Danh mục, sản phẩm, nhà cung cấp | Có | **Không** |
| 5. Nhập/xuất kho | Có | **Không** |
| 6. Quản lý nhân viên | Có | **Không** |

Thư mục 4–6 tạo dữ liệu không xóa được hết: sản phẩm đã có phiếu kho thì không xóa được, và không có API xóa nhân viên. Mỗi lần chạy dùng một mã `runId` mới (6 số cuối của thời gian), nên chạy lặp nhiều lần trên local không bị trùng SKU hay email.

Thư mục 1 phải chạy trước: hai request đăng nhập lưu `adminToken`, `staffToken` cho các request sau. Thư mục 5 dùng sản phẩm và nhà cung cấp tạo ở thư mục 4.

## Chạy trên local

```bash
docker compose up -d
npm run db:migrate && npm run db:seed
npm start
```

Postman → chuột phải vào collection → **Run collection** → chọn environment `local` → **Run**. Kết quả đúng: tất cả test pass.

## Chạy trên production

1. Chọn environment `production`, nhập `adminPassword` và `staffPassword` vào cột **Current value** (không nhập vào Initial value: giá trị đó được lưu khi export/share). Hỏi Người 4 để lấy mật khẩu.
2. Run collection, **chỉ tick thư mục 1, 2, 3**.
3. Không export lại environment production sau khi đã nhập mật khẩu, không commit file đó.

Lần đầu gọi production có thể mất 1–3 phút nếu app đang tắt (xem [docs/RUNBOOK.md](../docs/RUNBOOK.md)).
