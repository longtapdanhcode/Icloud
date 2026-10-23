// Chuẩn response chung cho toàn bộ API — xem docs/API_CONVENTIONS.md

function ok(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data) {
  return ok(res, data, undefined, 201);
}

function paginated(res, items, { page, limit, total }) {
  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

module.exports = { ok, created, paginated };
