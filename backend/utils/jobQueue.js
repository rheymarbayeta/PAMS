const crypto = require('crypto');
const logger = require('./logger');

/**
 * Job queue with optional DB durability (Phase 4).
 * Set JOB_QUEUE_DURABLE=true to persist jobs in `job_queue` and recover queued jobs on boot.
 * Redis/BullMQ can replace the store later behind the same createJob/getJob API.
 */

const jobs = new Map();
let seq = 0;
const MAX_JOBS = 200;
const DURABLE = String(process.env.JOB_QUEUE_DURABLE || '').toLowerCase() === 'true';

function memoryJobFromRow(row) {
  return {
    id: row.job_id,
    type: row.job_type,
    payload: row.payload_json ? JSON.parse(row.payload_json) : {},
    status: row.status,
    result: row.result_json ? JSON.parse(row.result_json) : null,
    error: row.error_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistCreate(job) {
  if (!DURABLE) return;
  try {
    const pool = require('../config/database');
    await pool.execute(
      `INSERT INTO job_queue (job_id, job_type, payload_json, status)
       VALUES (?, ?, ?, 'queued')`,
      [job.id, job.type, JSON.stringify(job.payload || {})]
    );
  } catch (err) {
    logger.warn('Durable job create failed', { error: err.message, jobId: job.id });
  }
}

async function persistUpdate(job) {
  if (!DURABLE) return;
  try {
    const pool = require('../config/database');
    await pool.execute(
      `UPDATE job_queue
       SET status = ?, result_json = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
       WHERE job_id = ?`,
      [
        job.status,
        job.result ? JSON.stringify(job.result) : null,
        job.error || null,
        job.id,
      ]
    );
  } catch (err) {
    logger.warn('Durable job update failed', { error: err.message, jobId: job.id });
  }
}

function createJob(type, payload = {}) {
  const id = `job_${Date.now()}_${++seq}_${crypto.randomBytes(3).toString('hex')}`;
  const job = {
    id,
    type,
    payload,
    status: 'queued',
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  trimJobs();
  persistCreate(job).catch(() => {});
  setImmediate(() => processJob(id));
  return job;
}

function getJob(id) {
  return jobs.get(id) || null;
}

async function getJobAsync(id) {
  const mem = jobs.get(id);
  if (mem) return mem;
  if (!DURABLE) return null;
  try {
    const pool = require('../config/database');
    const [rows] = await pool.execute('SELECT * FROM job_queue WHERE job_id = ?', [id]);
    if (!rows.length) return null;
    const job = memoryJobFromRow(rows[0]);
    jobs.set(id, job);
    return job;
  } catch {
    return null;
  }
}

function trimJobs() {
  if (jobs.size <= MAX_JOBS) return;
  const entries = Array.from(jobs.entries()).sort(
    (a, b) => new Date(a[1].createdAt) - new Date(b[1].createdAt)
  );
  const toRemove = entries.slice(0, jobs.size - MAX_JOBS);
  for (const [id] of toRemove) jobs.delete(id);
}

async function processJob(id) {
  const job = jobs.get(id);
  if (!job || job.status !== 'queued') return;

  job.status = 'running';
  job.updatedAt = new Date().toISOString();
  await persistUpdate(job);

  try {
    let result = null;
    if (job.type === 'assessment_pdf') {
      const { generateAssessmentReportPDF } = require('./pdfGenerator');
      const buffer = await generateAssessmentReportPDF(
        job.payload.applicationId,
        job.payload.printedBy || 'System'
      );
      result = {
        contentType: 'application/pdf',
        base64: Buffer.from(buffer).toString('base64'),
        filename: `assessment-${job.payload.applicationId}.pdf`,
      };
    } else if (job.type === 'permit_pdf') {
      const { generatePermitPDF } = require('./pdfGenerator');
      const buffer = await generatePermitPDF(job.payload.applicationId);
      result = {
        contentType: 'application/pdf',
        base64: Buffer.from(buffer).toString('base64'),
        filename: `permit-${job.payload.applicationId}.pdf`,
      };
    } else if (job.type === 'scheduled_report') {
      result = {
        reportType: job.payload.reportType,
        scheduleId: job.payload.scheduleId,
        generatedAt: new Date().toISOString(),
        note: 'Scheduled report job accepted (export adapters plug in here)',
        params: job.payload.params || {},
      };
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    job.status = 'completed';
    job.result = result;
    job.updatedAt = new Date().toISOString();
    await persistUpdate(job);
  } catch (err) {
    logger.error('Job failed', { jobId: id, type: job.type, error: err.message });
    job.status = 'failed';
    job.error = err.message || 'Job failed';
    job.updatedAt = new Date().toISOString();
    await persistUpdate(job);
  }
}

/**
 * Recover queued/running durable jobs after process restart.
 */
async function recoverDurableJobs() {
  if (!DURABLE) return 0;
  try {
    const pool = require('../config/database');
    const [rows] = await pool.execute(
      `SELECT * FROM job_queue WHERE status IN ('queued','running') ORDER BY created_at ASC LIMIT 50`
    );
    let n = 0;
    for (const row of rows) {
      const job = memoryJobFromRow(row);
      job.status = 'queued';
      jobs.set(job.id, job);
      setImmediate(() => processJob(job.id));
      n += 1;
    }
    if (n) logger.info('Recovered durable jobs', { count: n });
    return n;
  } catch (err) {
    logger.warn('Durable job recovery skipped', { error: err.message });
    return 0;
  }
}

module.exports = {
  createJob,
  getJob,
  getJobAsync,
  recoverDurableJobs,
  isDurable: () => DURABLE,
  getQueueStats() {
    const all = Array.from(jobs.values());
    return {
      durable: DURABLE,
      total: all.length,
      queued: all.filter((j) => j.status === 'queued').length,
      running: all.filter((j) => j.status === 'running').length,
      completed: all.filter((j) => j.status === 'completed').length,
      failed: all.filter((j) => j.status === 'failed').length,
    };
  },
};
