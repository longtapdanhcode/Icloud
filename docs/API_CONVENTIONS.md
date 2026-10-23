# Quy ước API (bản đề xuất, cả nhóm chốt trong tuần 1)

## 1. Định dạng response

**Thành công**, dùng `src/utils/response.js`:

```json
{ "success": true, "data": { "id": 1, "name": "..." } }
```

**Danh sách có phân trang:**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

**Lỗi** (`throw AppError...`, errorHandler tự định dạng):

```json
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "Không đủ tồn kho cho SKU DU-001" } }
```

Lỗi validate có thể kèm `details`:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ",
  "details": [{ "field": "price", "message": "Giá không được âm" }] } }
```

## 2. Mã HTTP và mã lỗi

| HTTP | code | Khi nào |
|---|---|---|
| 200 | — | Đọc/cập nhật/xóa thành công |
| 201 | — | Tạo mới thành công |
| 400 | `VALIDATION_ERROR` | Thiếu trường, sai kiểu, số âm, JSON sai |
| 401 | `UNAUTHORIZED` | Không có token hoặc token hết hạn |
| 403 | `FORBIDDEN` | Có token nhưng sai quyền |
| 404 | `NOT_FOUND` | Không tìm thấy bản ghi/route |
| 409 | `DUPLICATE_ENTRY` | Trùng SKU, email, tên danh mục |
| 409 | `IN_USE` | Xóa bản ghi đang được tham chiếu |
| 409 | `INSUFFICIENT_STOCK` | Xuất kho vượt tồn |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước |

Lỗi MySQL `ER_DUP_ENTRY` và `ER_ROW_IS_REFERENCED_2` được errorHandler tự đổi sang 409, không cần tự bắt.

## 3. Đặt tên và tham số

- URL dạng số nhiều, kebab-case: `/api/stock-transactions`.
- Trường JSON dùng **snake_case**, khớp tên cột DB: `category_id`, `min_stock`, `created_at`.
- Danh sách: `?page=1&limit=10&search=abc&sort=price&order=asc`, đọc bằng `parsePagination(req.query)`. `limit` tối đa 100.
- Lọc: `?category_id=2`, `?type=IN`, `?from=2026-10-01&to=2026-10-31`.
- `sort` chỉ nhận các cột trong whitelist, **không nối chuỗi trực tiếp vào SQL**.
- Mọi SQL dùng placeholder `?`, không nối chuỗi từ input.

## 4. Xác thực

- Header: `Authorization: Bearer <token>`.
- JWT payload: `{ id, email, role }`.
- Middleware (Người 3 cung cấp): `authenticate` và `authorize('ADMIN')` / `authorize('ADMIN', 'STAFF')`.

## 5. Ma trận quyền (đề xuất)

| Endpoint | ADMIN | STAFF |
|---|:-:|:-:|
| GET products/categories/suppliers | ✓ | ✓ |
| POST/PUT products | ✓ | ✓ |
| DELETE products | ✓ | ✗ |
| POST/PUT/DELETE categories, suppliers | ✓ | ✗ |
| POST/GET stock-transactions | ✓ | ✓ |
| GET dashboard | ✓ | ✓ |
| Quản lý users (nếu làm) | ✓ | ✗ |

## 6. Nghiệp vụ kho (Người 2)

`POST /api/stock-transactions`:

```json
{
  "type": "OUT",
  "supplier_id": null,
  "note": "Xuất bán",
  "items": [{ "product_id": 1, "quantity": 5, "unit_price": 5000 }]
}
```

Bắt buộc:
- Trong `db.withTransaction`: khóa sản phẩm bằng `SELECT ... FOR UPDATE`, kiểm tra tồn, ghi phiếu và chi tiết, cập nhật `quantity`.
- Xuất vượt tồn: `throw AppError.conflict('INSUFFICIENT_STOCK', ...)`, transaction tự rollback.
- `quantity > 0`, `unit_price >= 0`, `items` không rỗng.
- `supplier_id` bắt buộc với phiếu `IN`, để `null` với phiếu `OUT`.
