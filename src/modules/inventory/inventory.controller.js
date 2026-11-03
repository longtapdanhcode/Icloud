
const service = require('./inventory.service');
const { ok, created, paginated } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const AppError = require('../../utils/AppError');

async function create(req, res) {
  // created_by lấy từ người dùng đã đăng nhập, không nhận từ client.
  if (!req.user || !req.user.id) {
    throw AppError.unauthorized('Cần đăng nhập để tạo phiếu kho');
  }

  const transaction = await service.create(req.body, req.user.id);
  return created(res, transaction);
}

async function list(req, res) {
  const pagination = parsePagination(req.query);

  const productId = req.query.product_id
    ? Number(req.query.product_id)
    : undefined;

  if (
    productId !== undefined &&
    (!Number.isInteger(productId) || productId <= 0)
  ) {
    throw AppError.badRequest('product_id không hợp lệ');
  }

  const from = req.query.from;
  const to = req.query.to;

  const validDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

  if (from && !validDate(from)) {
    throw AppError.badRequest('from phải có định dạng YYYY-MM-DD');
  }

  if (to && !validDate(to)) {
    throw AppError.badRequest('to phải có định dạng YYYY-MM-DD');
  }

  if (from && to && from > to) {
    throw AppError.badRequest('from không được lớn hơn to');
  }

  const { rows, total } = await service.list({
    ...pagination,
    type: req.query.type,
    productId,
    from,
    to,
  });

  return paginated(res, rows, {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

module.exports = { create, list };
