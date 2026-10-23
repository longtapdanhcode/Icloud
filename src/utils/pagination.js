// Đọc ?page=&limit= theo quy ước chung; giới hạn limit để tránh truy vấn quá lớn
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { parsePagination };
