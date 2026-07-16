const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createJob, getQueueStats, isDurable } = require('../utils/jobQueue');

describe('phase4 durable queue api', () => {
  it('exposes durable flag without requiring Redis', () => {
    assert.equal(typeof isDurable(), 'boolean');
  });

  it('creates in-memory scheduled_report job', () => {
    const job = createJob('scheduled_report', { reportType: 'test', scheduleId: 'x' });
    assert.ok(job.id);
    assert.equal(job.status, 'queued');
    const stats = getQueueStats();
    assert.ok(stats.total >= 1);
  });
});
