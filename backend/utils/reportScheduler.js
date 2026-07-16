const logger = require('./logger');

/**
 * Scheduled reports runner + SLA tick (Phase 3).
 */

function nextRunFrom(frequency, from = new Date()) {
  const d = new Date(from);
  switch (frequency) {
    case 'hourly':
      d.setHours(d.getHours() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'daily':
    default:
      d.setDate(d.getDate() + 1);
      break;
  }
  return d;
}

async function runDueSchedules() {
  let ran = 0;
  try {
    const pool = require('../config/database');
    const { createJob } = require('./jobQueue');
    const [due] = await pool.execute(
      `SELECT * FROM scheduled_reports
       WHERE is_active = 1
         AND (next_run_at IS NULL OR next_run_at <= NOW())
       ORDER BY next_run_at ASC
       LIMIT 20`
    );
    for (const row of due) {
      const job = createJob('scheduled_report', {
        scheduleId: row.schedule_id,
        reportType: row.report_type,
        params: row.params_json ? JSON.parse(row.params_json) : {},
      });
      const next = nextRunFrom(row.frequency);
      await pool.execute(
        `UPDATE scheduled_reports SET last_run_at = NOW(), next_run_at = ? WHERE schedule_id = ?`,
        [next, row.schedule_id]
      );
      logger.info('Scheduled report enqueued', { scheduleId: row.schedule_id, jobId: job.id });
      ran += 1;
    }
  } catch (err) {
    logger.warn('runDueSchedules failed', { error: err.message });
  }
  return ran;
}

async function tickEnterpriseJobs() {
  const schedules = await runDueSchedules();
  let escalations = 0;
  try {
    const { escalateOverdueSteps } = require('./approvalEngine');
    escalations = await escalateOverdueSteps();
  } catch (err) {
    logger.warn('SLA escalation tick failed', { error: err.message });
  }
  return { schedules, escalations };
}

let timer = null;

function startScheduler(intervalMs = 5 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    tickEnterpriseJobs().catch((err) => logger.warn('Scheduler tick error', { error: err.message }));
  }, intervalMs);
  setTimeout(() => tickEnterpriseJobs().catch(() => {}), 15000);
  logger.info('Phase 3 scheduler started', { intervalMs });
}

module.exports = {
  nextRunFrom,
  runDueSchedules,
  tickEnterpriseJobs,
  startScheduler,
};
