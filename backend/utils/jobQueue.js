const logger = require('./logger');

/**
 * Lightweight in-process job queue for async PDF / report work (Phase 1).
 * Not durable across restarts — upgrade to Redis/BullMQ in Phase 2+ if needed.
 */

const jobs = new Map();
let seq = 0;
const MAX_JOBS = 200;

function createJob(type, payload = {}) {
  const id = `job_${Date.now()}_${++seq}`;
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
  setImmediate(() => processJob(id));
  return job;
}

function getJob(id) {
  return jobs.get(id) || null;
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
  } catch (err) {
    logger.error('Job failed', { jobId: id, type: job.type, error: err.message });
    job.status = 'failed';
    job.error = err.message || 'Job failed';
    job.updatedAt = new Date().toISOString();
  }
}

module.exports = {
  createJob,
  getJob,
  getQueueStats() {
    const all = Array.from(jobs.values());
    return {
      total: all.length,
      queued: all.filter((j) => j.status === 'queued').length,
      running: all.filter((j) => j.status === 'running').length,
      completed: all.filter((j) => j.status === 'completed').length,
      failed: all.filter((j) => j.status === 'failed').length,
    };
  },
};
