const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { getQueueStats } = require('./jobQueue');
const logger = require('./logger');

/**
 * Deep health checks (Phase 3).
 */

async function checkDatabase() {
  const start = Date.now();
  try {
    await pool.execute('SELECT 1 AS ok');
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err.message, latency_ms: Date.now() - start };
  }
}

async function checkEtracs() {
  const base = process.env.ETRACS_BASE_URL;
  if (!base) {
    return { status: 'skipped', reason: 'ETRACS_BASE_URL not set' };
  }
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(base, { method: 'GET', signal: controller.signal }).catch(() => null);
    clearTimeout(timer);
    return {
      status: res && res.ok ? 'ok' : 'degraded',
      http_status: res ? res.status : null,
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return { status: 'error', error: err.message, latency_ms: Date.now() - start };
  }
}

function checkDisk() {
  const uploads = path.join(__dirname, '..', 'uploads');
  try {
    if (!fs.existsSync(uploads)) {
      fs.mkdirSync(uploads, { recursive: true });
    }
    const testFile = path.join(uploads, '.healthcheck');
    fs.writeFileSync(testFile, String(Date.now()));
    fs.unlinkSync(testFile);
    return { status: 'ok', path: uploads };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

async function getDetailedHealth() {
  const [database, etracs] = await Promise.all([checkDatabase(), checkEtracs()]);
  const disk = checkDisk();
  let queue = { status: 'ok', stats: {} };
  try {
    queue = { status: 'ok', stats: getQueueStats() };
  } catch (err) {
    queue = { status: 'error', error: err.message };
  }

  const parts = [database.status, disk.status, queue.status];
  const overall =
    parts.includes('error') ? 'error' : parts.includes('degraded') || etracs.status === 'error' ? 'degraded' : 'ok';

  return {
    status: overall,
    time: new Date().toISOString(),
    checks: { database, disk, queue, etracs },
  };
}

module.exports = { getDetailedHealth, checkDatabase, checkDisk, checkEtracs };
