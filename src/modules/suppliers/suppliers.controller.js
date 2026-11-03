
const service = require('./suppliers.service');
const { ok, created, paginated } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

async function list(req, res) {
  const pagination = parsePagination(req.query);
  const { rows, total } = await service.list({
    ...pagination,
    search: typeof req.query.search === 'string'
      ? req.query.search.trim()
      : '',
  });

  return paginated(res, rows, {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

async function create(req, res) {
  const supplier = await service.create(req.body);
  return created(res, supplier);
}

async function findById(req, res) {
  const supplier = await service.findById(req.params.id);
  return ok(res, supplier);
}

async function update(req, res) {
  const supplier = await service.update(req.params.id, req.body);
  return ok(res, supplier);
}

async function remove(req, res) {
  const result = await service.remove(req.params.id);
  return ok(res, result);
}

module.exports = { list, create, findById, update, remove };
