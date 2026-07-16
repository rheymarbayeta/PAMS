const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit, _resetRateLimitBuckets } = require('../utils/rateLimit');

function mockReq(ip = '1.2.3.4') {
  return { ip, path: '/test', socket: { remoteAddress: ip } };
}

function mockRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader(k, v) {
      headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe('rateLimit', () => {
  beforeEach(() => _resetRateLimitBuckets());

  it('allows requests under the limit', () => {
    const mw = rateLimit({ windowMs: 60000, max: 3 });
    const req = mockReq();
    let nextCount = 0;
    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      mw(req, res, () => {
        nextCount += 1;
      });
      assert.equal(res.statusCode, 200);
    }
    assert.equal(nextCount, 3);
  });

  it('blocks after max with 429', () => {
    const mw = rateLimit({ windowMs: 60000, max: 2 });
    const req = mockReq('9.9.9.9');
    mw(req, mockRes(), () => {});
    mw(req, mockRes(), () => {});
    const res = mockRes();
    let nexted = false;
    mw(req, res, () => {
      nexted = true;
    });
    assert.equal(nexted, false);
    assert.equal(res.statusCode, 429);
    assert.match(res.body.error, /Too many/i);
  });
});
