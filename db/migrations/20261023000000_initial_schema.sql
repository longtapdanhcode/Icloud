-- Schema ban đầu (tuần 1). Đã chạy trên production: KHÔNG sửa file này.
-- Muốn thay đổi schema: npm run db:migrate:new -- <ten_thay_doi>

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED  NULL,
  sku         VARCHAR(50)   NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity    INT           NOT NULL DEFAULT 0,
  min_stock   INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT chk_products_price     CHECK (price >= 0),
  CONSTRAINT chk_products_quantity  CHECK (quantity >= 0),
  CONSTRAINT chk_products_min_stock CHECK (min_stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(150) NOT NULL,
  phone   VARCHAR(20)  NULL,
  email   VARCHAR(150) NULL,
  address VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transactions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('IN', 'OUT') NOT NULL,
  supplier_id INT UNSIGNED NULL,
  created_by  INT UNSIGNED NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_tx_created_at (created_at),
  CONSTRAINT fk_stock_tx_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  CONSTRAINT fk_stock_tx_user     FOREIGN KEY (created_by)  REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transaction_items (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT UNSIGNED  NOT NULL,
  product_id     INT UNSIGNED  NOT NULL,
  quantity       INT           NOT NULL,
  unit_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_stock_items_tx      FOREIGN KEY (transaction_id) REFERENCES stock_transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_items_product FOREIGN KEY (product_id)     REFERENCES products (id),
  CONSTRAINT chk_stock_items_quantity   CHECK (quantity > 0),
  CONSTRAINT chk_stock_items_unit_price CHECK (unit_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
