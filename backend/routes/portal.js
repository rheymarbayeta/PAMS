const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const { fail } = require('../utils/apiResponse');
const { generateId } = require('../utils/idGenerator');
const { sendSms } = require('../utils/integrationHub');
const { notifyRole } = require('../utils/notificationService');

const router = express.Router();

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function publicStatusMessage(status) {
  if (status === 'Released' || status === 'Issued') {
    return 'Your permit is ready for release/pickup.';
  }
  if (status === 'Rejected') {
    return 'This application was rejected. Please contact the municipal office.';
  }
  if (status === 'Approved' || status === 'Paid') {
    return 'Your application is approved. You may submit a payment intent online.';
  }
  return 'Your application is being processed.';
}

async function findApplicationByNumber(number) {
  const [apps] = await pool.execute(
    `SELECT a.application_id, a.application_number, a.permit_type, a.status,
            a.created_at, a.issued_at, a.validity_date, a.entity_id,
            e.entity_name, e.phone, e.email
     FROM applications a
     LEFT JOIN entities e ON e.entity_id = a.entity_id
     WHERE a.application_number = ?
     LIMIT 1`,
    [number]
  );
  return apps[0] || null;
}

async function requirePortalSession(req) {
  const token = req.headers['x-portal-session'] || req.body?.session_token || req.query?.session_token;
  if (!token) return null;
  const [rows] = await pool.execute(
    `SELECT * FROM portal_otp_challenges
     WHERE session_token = ? AND verified_at IS NOT NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

/**
 * Citizen / self-service portal — track + OTP + payment intake (Phase 4).
 */

router.get('/track', async (req, res) => {
  try {
    const number = String(req.query.application_number || req.query.q || '').trim();
    if (!number || number.length < 4) {
      return fail(res, 400, 'Provide a valid application_number');
    }

    const app = await findApplicationByNumber(number);
    if (!app) return fail(res, 404, 'Application not found');

    res.json({
      data: {
        application_number: app.application_number,
        permit_type: app.permit_type,
        status: app.status,
        entity_name: app.entity_name,
        submitted_at: app.created_at,
        issued_at: app.issued_at,
        validity_date: app.validity_date,
        public_message: publicStatusMessage(app.status),
        payment_eligible: ['Approved', 'Paid', 'Pending Approval'].includes(app.status),
      },
    });
  } catch (error) {
    console.error('Portal track error:', error);
    return fail(res, 500, 'Unable to look up application');
  }
});

/**
 * POST /api/portal/otp/request
 * body: { application_number, channel?: 'sms'|'email', destination? }
 */
router.post('/otp/request', async (req, res) => {
  try {
    const number = String(req.body.application_number || '').trim();
    const channel = req.body.channel === 'email' ? 'email' : 'sms';
    if (!number) return fail(res, 400, 'application_number required');

    const app = await findApplicationByNumber(number);
    if (!app) return fail(res, 404, 'Application not found');

    const destination =
      String(req.body.destination || '').trim() ||
      (channel === 'email' ? app.email : app.phone) ||
      '';
    if (!destination) {
      return fail(res, 400, 'destination required (or set entity phone/email)');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const challengeId = generateId('potp');
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.execute(
      `INSERT INTO portal_otp_challenges
        (challenge_id, application_number, channel, destination, otp_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [challengeId, number, channel, destination, hashOtp(otp), expires]
    );

    if (channel === 'sms') {
      await sendSms({
        to: destination,
        message: `PAMS verification code: ${otp}. Valid for 10 minutes.`,
      });
    }

    const exposeOtp =
      String(process.env.PORTAL_OTP_DEBUG || '').toLowerCase() === 'true' ||
      process.env.NODE_ENV !== 'production';

    res.status(201).json({
      challenge_id: challengeId,
      channel,
      destination_masked: destination.replace(/.(?=.{4})/g, '*'),
      expires_at: expires.toISOString(),
      ...(exposeOtp ? { debug_otp: otp } : {}),
      message: exposeOtp
        ? 'OTP issued (debug mode returns code)'
        : 'OTP sent if channel is configured',
    });
  } catch (error) {
    console.error('Portal OTP request error:', error);
    return fail(res, 500, 'Unable to issue OTP');
  }
});

/**
 * POST /api/portal/otp/verify
 * body: { challenge_id, otp }
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { challenge_id, otp } = req.body;
    if (!challenge_id || !otp) return fail(res, 400, 'challenge_id and otp required');

    const [rows] = await pool.execute(
      'SELECT * FROM portal_otp_challenges WHERE challenge_id = ? LIMIT 1',
      [challenge_id]
    );
    if (!rows.length) return fail(res, 404, 'Challenge not found');
    const row = rows[0];
    if (row.verified_at) return fail(res, 400, 'Already verified');
    if (new Date(row.expires_at) < new Date()) return fail(res, 400, 'OTP expired');
    if (row.otp_hash !== hashOtp(otp)) return fail(res, 401, 'Invalid OTP');

    const sessionToken = crypto.randomBytes(24).toString('hex');
    await pool.execute(
      `UPDATE portal_otp_challenges
       SET verified_at = NOW(), session_token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 2 HOUR)
       WHERE challenge_id = ?`,
      [sessionToken, challenge_id]
    );

    res.json({
      session_token: sessionToken,
      application_number: row.application_number,
      expires_in_hours: 2,
    });
  } catch (error) {
    console.error('Portal OTP verify error:', error);
    return fail(res, 500, 'Unable to verify OTP');
  }
});

/**
 * POST /api/portal/payments/intent
 * Requires X-Portal-Session header from OTP verify.
 */
router.post('/payments/intent', async (req, res) => {
  try {
    const session = await requirePortalSession(req);
    if (!session) return fail(res, 401, 'Portal session required (verify OTP first)');

    const amount = parseFloat(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail(res, 400, 'Valid amount required');
    }

    const app = await findApplicationByNumber(session.application_number);
    if (!app) return fail(res, 404, 'Application not found');

    const intentId = generateId('ppay');
    await pool.execute(
      `INSERT INTO portal_payment_intents
        (intent_id, application_id, application_number, amount, payer_name, payer_contact,
         reference_no, session_token, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        intentId,
        app.application_id,
        app.application_number,
        amount,
        req.body.payer_name || null,
        req.body.payer_contact || session.destination,
        req.body.reference_no || null,
        session.session_token,
        req.body.notes || 'Citizen portal payment intent',
      ]
    );

    try {
      const msg = `Portal payment intent ₱${amount.toFixed(2)} for ${app.application_number}`;
      await notifyRole('Admin', msg, '/admin/portal-payments');
      await notifyRole('SuperAdmin', msg, '/admin/portal-payments');
      await notifyRole('Approver', msg, '/admin/portal-payments');
    } catch (_) { /* optional */ }

    res.status(201).json({
      intent_id: intentId,
      status: 'submitted',
      message:
        'Payment intent recorded. Municipal cashier will confirm against official receipt. This is not a live gateway charge.',
      application_number: app.application_number,
      amount,
    });
  } catch (error) {
    console.error('Portal payment intent error:', error);
    return fail(res, 500, 'Unable to create payment intent');
  }
});

router.get('/payments/intents', async (req, res) => {
  try {
    const session = await requirePortalSession(req);
    if (!session) return fail(res, 401, 'Portal session required');
    const [rows] = await pool.execute(
      `SELECT intent_id, application_number, amount, currency, status, reference_no, created_at
       FROM portal_payment_intents
       WHERE application_number = ?
       ORDER BY created_at DESC LIMIT 20`,
      [session.application_number]
    );
    res.json({ data: rows });
  } catch (error) {
    return fail(res, 500, 'Unable to list intents');
  }
});

router.get('/info', (_req, res) => {
  res.json({
    name: 'PAMS Citizen Portal',
    features: ['application_status_tracking', 'otp_verification', 'payment_intent'],
    note: 'OTP + payment intent MVP — wire live SMS/gateway providers via env when ready',
  });
});

module.exports = router;
