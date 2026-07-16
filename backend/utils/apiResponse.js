/**
 * Standard API response helpers (Phase 1 — pagination & error envelopes).
 */

function paginated(res, data, { page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  return res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

function fail(res, status, error, details) {
  const body = { error };
  if (details !== undefined && process.env.NODE_ENV !== 'production') {
    body.details = details;
  }
  return res.status(status).json(body);
}

function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

module.exports = { paginated, fail, ok };
