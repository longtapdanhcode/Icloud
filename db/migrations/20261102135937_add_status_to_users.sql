-- add_status_to_users
-- Tạo bởi: npm run db:migrate:new (2026-11-02T13:59:37.598Z)
--
-- Quy tắc:
--  * Mỗi file một thay đổi nhỏ. Đã merge vào main thì KHÔNG sửa file này nữa, muốn sửa thì tạo file mới.
--  * Bảng mới phải có PRIMARY KEY (Aiven MySQL bắt buộc).
--  * Không xóa cột/bảng đang có dữ liệu nếu chưa thống nhất với cả nhóm.
--
-- Ví dụ:
--   ALTER TABLE suppliers ADD COLUMN note VARCHAR(255) NULL;
--   CREATE INDEX idx_stock_items_product ON stock_transaction_items (product_id);

ALTER TABLE users
ADD COLUMN status ENUM('ACTIVE', 'LOCKED')
NOT NULL DEFAULT 'ACTIVE';