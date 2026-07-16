#!/usr/bin/env node
/**
 * Document / job worker entrypoint (Phase 3 — extract readiness).
 * Run separately from the API to process queued PDF/report jobs:
 *   node worker.js
 *
 * Today the in-process queue is shared only within one Node process.
 * For true separation, set WORKER_MODE=standalone and use a durable
 * queue (Redis/BullMQ). This worker still starts the scheduler +
 * can drain jobs when JOB_QUEUE_MODE=inline (default shared Map).
 */

require('dotenv').config();
const logger = require('./utils/logger');
const { startScheduler } = require('./utils/reportScheduler');
const { getQueueStats } = require('./utils/jobQueue');

async function main() {
  logger.info('PAMS worker starting', {
    pid: process.pid,
    mode: process.env.WORKER_MODE || 'inline-scheduler',
  });

  // Ensure DB is reachable
  const pool = require('./config/database');
  await pool.execute('SELECT 1');

  startScheduler(Number(process.env.SCHEDULER_INTERVAL_MS) || 5 * 60 * 1000);

  setInterval(() => {
    const stats = getQueueStats();
    logger.debug('Worker queue stats', stats);
  }, 60000);

  logger.info('Worker ready (scheduler + queue monitor)');
}

main().catch((err) => {
  logger.error('Worker failed to start', err);
  process.exit(1);
});
