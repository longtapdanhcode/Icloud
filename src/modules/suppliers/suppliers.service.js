
const db = require('../../config/db');
const AppError = require('../../utils/AppError');

function validateSupplier({ name, phone, email, address }) {
  if (typeof name !== 'string' || !name.trim()) {
    throw AppError.badRequest('Tên nhà cung cấp không được để trống');
  }

  if (name.trim().length > 150) {
    throw AppError.badRequest('Tên nhà cung cấp không được vượt quá 150 ký tự');
  }

  if (email != null && email !== '') {
    if (
      typeof email !== 'string' ||
      email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw AppError.badRequest('Email nhà cung cấp không hợp lệ');
    }
  }

  if (phone != null && String(phone).length > 20) {
    throw AppError.badRequest('Số điện thoại không được vượt quá 20 ký tự');
  }

  if (address != null && String(address).length > 255) {
    throw AppError.badRequest('Địa chỉ không được vượt quá 255 ký tự');
  }
}

async function list({ page, limit, offset, search }) {
  const keyword = `%${search || ''}%`;

  const rows = await db.query(
    `SELECT id, name, phone, email, address
     FROM suppliers
     WHERE (? = '' OR name LIKE ? OR phone LIKE ? OR email LIKE ?)
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [search || '', keyword, keyword, keyword, limit, offset],
  );

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total
     FROM suppliers
     WHERE (? = '' OR name LIKE ? OR phone LIKE ? OR email LIKE ?)`,
    [search || '', keyword, keyword, keyword],
  );

  return { rows, total: Number(total) };
}

async function create(data) {
  const { name, phone = null, email = null, address = null } = data;

  validateSupplier({ name, phone, email, address });

  const result = await db.query(
    `INSERT INTO suppliers (name, phone, email, address)
     VALUES (?, ?, ?, ?)`,
    [name.trim(), phone, email || null, address],
  );

  return findById(result.insertId);
}

async function findById(id) {
  const rows = await db.query(
    `SELECT id, name, phone, email, address
     FROM suppliers WHERE id = ?`,
    [id],
  );

  if (!rows.length) {
    throw AppError.notFound('Không tìm thấy nhà cung cấp');
  }

  return rows[0];
}

async function update(id, data) {
  const current = await findById(id);

  const name = data.name ?? current.name;
  const phone = data.phone === undefined ? current.phone : data.phone;
  const email = data.email === undefined ? current.email : data.email;
  const address = data.address === undefined ? current.address : data.address;

  validateSupplier({ name, phone, email, address });

  await db.query(
    `UPDATE suppliers
     SET name = ?, phone = ?, email = ?, address = ?
     WHERE id = ?`,
    [name.trim(), phone, email || null, address, id],
  );

  return findById(id);
}

async function remove(id) {
  await findById(id);

  await db.query('DELETE FROM suppliers WHERE id = ?', [id]);

  return { id: Number(id) };
}

module.exports = { list, create, findById, update, remove };
