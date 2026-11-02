
const db = require('../../config/db');
const AppError = require('../../utils/AppError');

function validateTransaction(data) {
  const { type, supplier_id, items } = data;

  if (!['IN', 'OUT'].includes(type)) {
    throw AppError.badRequest('type phải là IN hoặc OUT');
  }

  if (
    type === 'IN' &&
    (
      supplier_id == null ||
      supplier_id === '' ||
      !Number.isInteger(Number(supplier_id)) ||
      Number(supplier_id) <= 0
    )
  ) {
    throw AppError.badRequest('Phiếu nhập kho phải có supplier_id hợp lệ');
  }

  if (type === 'OUT' && supplier_id != null) {
    throw AppError.badRequest('Phiếu xuất kho phải có supplier_id là null');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest('Phiếu kho phải có ít nhất một sản phẩm');
  }

  const seen = new Set();

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw AppError.badRequest('product_id không hợp lệ');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw AppError.badRequest('quantity phải là số nguyên dương');
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw AppError.badRequest('unit_price phải lớn hơn hoặc bằng 0');
    }

    if (seen.has(productId)) {
      throw AppError.badRequest(
        'Không được lặp lại sản phẩm trong cùng một phiếu',
      );
    }

    seen.add(productId);
  }
}

async function create(data, createdBy) {
  validateTransaction(data);

  const { type, supplier_id, note, items } = data;

  return db.withTransaction(async (conn) => {
    const checkedItems = [];

    // Khóa từng sản phẩm để tránh hai giao dịch cùng xuất vượt tồn kho.
    // Sắp xếp ID để giảm nguy cơ deadlock khi có nhiều giao dịch đồng thời.
    const sortedItems = [...items].sort(
      (a, b) => Number(a.product_id) - Number(b.product_id),
    );

    for (const item of sortedItems) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      const [products] = await conn.query(
        'SELECT id, name, quantity FROM products WHERE id = ? FOR UPDATE',
        [productId],
      );

      if (products.length === 0) {
        throw AppError.notFound(
          `Không tìm thấy sản phẩm ID ${productId}`,
        );
      }

      const product = products[0];

      if (type === 'OUT' && Number(product.quantity) < quantity) {
        throw AppError.conflict(
          'INSUFFICIENT_STOCK',
          `Sản phẩm "${product.name}" không đủ tồn kho`,
        );
      }

      checkedItems.push({ productId, quantity, unitPrice });
    }

    const [transaction] = await conn.query(
      `INSERT INTO stock_transactions
        (type, supplier_id, created_by, note)
       VALUES (?, ?, ?, ?)`,
      [
        type,
        type === 'IN' ? Number(supplier_id) : null,
        createdBy,
        note || null,
      ],
    );

    for (const item of checkedItems) {
      await conn.query(
        `INSERT INTO stock_transaction_items
          (transaction_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          transaction.insertId,
          item.productId,
          item.quantity,
          item.unitPrice,
        ],
      );

      const change = type === 'IN'
        ? item.quantity
        : -item.quantity;

      await conn.query(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [change, item.productId],
      );
    }

    return {
      id: transaction.insertId,
      type,
      supplier_id: type === 'IN' ? Number(supplier_id) : null,
      created_by: createdBy,
      note: note || null,
      items: checkedItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    };
  });
}

async function list({ page, limit, offset, type, productId, from, to }) {
  if (type && !['IN', 'OUT'].includes(type)) {
    throw AppError.badRequest('type phải là IN hoặc OUT');
  }

  const conditions = [];
  const params = [];

  if (type) {
    conditions.push('st.type = ?');
    params.push(type);
  }

  if (productId) {
    conditions.push(
      'EXISTS (SELECT 1 FROM stock_transaction_items f WHERE f.transaction_id = st.id AND f.product_id = ?)',
    );
    params.push(productId);
  }

  if (from) {
    conditions.push(
      "st.created_at >= CONVERT_TZ(?, '+07:00', '+00:00')",
    );
    params.push(`${from} 00:00:00`);
  }

  if (to) {
    conditions.push(
      "st.created_at < CONVERT_TZ(DATE_ADD(?, INTERVAL 1 DAY), '+07:00', '+00:00')",
    );
    params.push(`${to} 00:00:00`);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const rows = await db.query(
    `SELECT st.id, st.type, st.supplier_id, st.created_by,
            st.note, st.created_at, s.name AS supplier_name
     FROM stock_transactions st
     LEFT JOIN suppliers s ON s.id = st.supplier_id
     ${where}
     ORDER BY st.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total
     FROM stock_transactions st
     ${where}`,
    params,
  );

  if (rows.length === 0) {
    return { rows: [], total: Number(total) };
  }

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(', ');

  const items = await db.query(
    `SELECT sti.transaction_id, sti.product_id, p.name AS product_name,
            sti.quantity, sti.unit_price
     FROM stock_transaction_items sti
     JOIN products p ON p.id = sti.product_id
     WHERE sti.transaction_id IN (${placeholders})
     ORDER BY sti.id`,
    ids,
  );

  const itemsByTransaction = new Map();

  for (const item of items) {
    if (!itemsByTransaction.has(item.transaction_id)) {
      itemsByTransaction.set(item.transaction_id, []);
    }

    itemsByTransaction.get(item.transaction_id).push({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      items: itemsByTransaction.get(row.id) || [],
    })),
    total: Number(total),
  };
}

module.exports = { create, list };
