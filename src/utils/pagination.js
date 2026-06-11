/**
 * Build pagination meta from query results
 */
const paginate = async (Model, query, queryParams) => {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(
    parseInt(queryParams.limit) || parseInt(process.env.DEFAULT_PAGE_LIMIT) || 10,
    parseInt(process.env.MAX_PAGE_LIMIT) || 100
  );
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Model.find(query).skip(skip).limit(limit),
    Model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    results,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Build sort object from query string: ?sort=-createdAt,companyName
 */
const buildSort = (sortQuery, allowedFields = []) => {
  if (!sortQuery) return { createdAt: -1 };

  const sortObj = {};
  const fields = sortQuery.split(',');

  fields.forEach((field) => {
    const dir = field.startsWith('-') ? -1 : 1;
    const name = field.replace(/^-/, '');
    if (!allowedFields.length || allowedFields.includes(name)) {
      sortObj[name] = dir;
    }
  });

  return Object.keys(sortObj).length ? sortObj : { createdAt: -1 };
};

/**
 * Build a MongoDB filter from req.query with operators
 * e.g. ?salary[gte]=50000&status=Applied
 */
const buildFilter = (queryObj, excludedFields = ['page', 'limit', 'sort', 'fields', 'search']) => {
  const filtered = { ...queryObj };
  excludedFields.forEach((f) => delete filtered[f]);

  // Allow $gte, $gt, $lte, $lt operators
  let queryStr = JSON.stringify(filtered);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (m) => `$${m}`);
  return JSON.parse(queryStr);
};

module.exports = { paginate, buildSort, buildFilter };
