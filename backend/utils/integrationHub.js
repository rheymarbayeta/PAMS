const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('./idGenerator');
const logger = require('./logger');

/**
 * Integration hub (Phase 3 MVP) — SMS / treasury / GIS stubs + event log.
 */

async function recordEvent({ channel, direction = 'outbound', status = 'queued', payload = null, response = null, error = null }) {
  const eventId = generateId(ID_PREFIXES.INTEGRATION_EVENT);
  await pool.execute(
    `INSERT INTO integration_events
      (event_id, channel, direction, status, payload_json, response_json, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      channel,
      direction,
      status,
      payload ? JSON.stringify(payload) : null,
      response ? JSON.stringify(response) : null,
      error,
    ]
  );
  return eventId;
}

async function sendSms({ to, message }) {
  const enabled = String(process.env.SMS_ENABLED || '').toLowerCase() === 'true';
  const payload = { to, message, provider: process.env.SMS_PROVIDER || 'stub' };

  if (!enabled) {
    const eventId = await recordEvent({
      channel: 'sms',
      status: 'sent',
      payload,
      response: { stub: true, note: 'SMS_ENABLED is not true — logged only' },
    });
    return { eventId, status: 'stubbed' };
  }

  try {
    // Provider hook: swap for Twilio/Semaphore/etc.
    const response = { accepted: true, provider: process.env.SMS_PROVIDER || 'stub' };
    const eventId = await recordEvent({ channel: 'sms', status: 'sent', payload, response });
    return { eventId, status: 'sent' };
  } catch (err) {
    const eventId = await recordEvent({
      channel: 'sms',
      status: 'failed',
      payload,
      error: err.message,
    });
    logger.warn('SMS send failed', { error: err.message });
    return { eventId, status: 'failed', error: err.message };
  }
}

async function treasuryPush({ referenceType, referenceId, amount, receiptNo }) {
  const payload = { referenceType, referenceId, amount, receiptNo };
  const eventId = await recordEvent({
    channel: 'treasury',
    status: 'queued',
    payload,
    response: { stub: true, note: 'Treasury adapter not configured' },
  });
  return { eventId, status: 'queued' };
}

async function gisLookup({ barangay, lat, lng }) {
  const payload = { barangay, lat, lng };
  const eventId = await recordEvent({
    channel: 'gis',
    status: 'received',
    payload,
    response: { stub: true, features: [] },
  });
  return { eventId, features: [] };
}

async function listEvents({ channel, limit = 50 }) {
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  if (channel) {
    const [rows] = await pool.execute(
      `SELECT * FROM integration_events WHERE channel = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
      [channel]
    );
    return rows;
  }
  const [rows] = await pool.execute(
    `SELECT * FROM integration_events ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}

module.exports = {
  recordEvent,
  sendSms,
  treasuryPush,
  gisLookup,
  listEvents,
};
