/**
 * Lightweight in-memory rate limiter (Phase 8).
 * Keyed by IP + route bucket. No Redis required.
 */

const buckets = new Map();

function prune(now) {
  if (buckets.size < 5000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}

/**
 * @param {object} opts
 * @param {number} opts.windowMs
 * @param {number} opts.max
 * @param {(req) => string} [opts.keyFn]
 */
function rateLimit({ windowMs, max, keyFn }) {
  return (req, res, next) => {
    const now = Date.now();
    prune(now);
    const id = keyFn
      ? keyFn(req)
      : `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.path}`;
    let entry = buckets.get(id);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(id, entry);
    }
    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retry_after_seconds: retryAfter,
      });
    }
    next();
  };
}

/** Test helper — clear all buckets */
function _resetRateLimitBuckets() {
  buckets.clear();
}

module.exports = { rateLimit, _resetRateLimitBuckets };
