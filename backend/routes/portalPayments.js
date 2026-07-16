const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { fail } = require('../utils/apiResponse');
const { logAction } = require('../utils/auditLogger');
const applicationsService = require('../modules/permits/applicationsService');
const { treasuryPush } = require('../utils/integrationHub');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('settings', 'reports', 'view_reports', 'applications'));

/**
 * Staff admin for citizen portal payment intents (Phase 5–6).
 */

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  try {
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    let where = '';
    const params = [];
    if (status && status !== 'all') {
      where = 'WHERE status = ?';
      params.push(status);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM portal_payment_intents ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.execute(
      `SELECT * FROM portal_payment_intents ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('List portal intents error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.put('/:id/confirm', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM portal_payment_intents WHERE intent_id = ?',
      [req.params.id]
    );
    if (!rows.length) return fail(res, 404, 'Intent not found');
    const intent = rows[0];

    if (intent.status === 'confirmed') {
      return res.json({ message: 'Already confirmed', intent });
    }
    if (intent.status === 'cancelled' || intent.status === 'failed') {
      return fail(res, 400, `Cannot confirm intent in status ${intent.status}`);
    }

    const officialReceipt =
      req.body.reference_no || req.body.official_receipt_no || intent.reference_no;
    if (!officialReceipt) {
      return fail(res, 400, 'Official receipt / reference number is required to confirm');
    }

    const amount = req.body.amount != null ? req.body.amount : intent.amount;
    const paymentDate = req.body.payment_date || todayDate();

    const created = await applicationsService.recordPayment(
      intent.application_id,
      {
        official_receipt_no: officialReceipt,
        payment_date: paymentDate,
        address: req.body.address || intent.payer_name || null,
        amount,
      },
      req.user.user_id
    );

    await pool.execute(
      `UPDATE portal_payment_intents
       SET status = 'confirmed',
           reference_no = ?,
           payment_id = ?,
           notes = CONCAT(COALESCE(notes,''), ?),
           updated_at = NOW()
       WHERE intent_id = ?`,
      [
        officialReceipt,
        created.payment_id,
        `\n[Confirmed by ${req.user.username} at ${new Date().toISOString()}; payment ${created.payment_id}]`,
        req.params.id,
      ]
    );

    try {
      await treasuryPush({
        referenceType: 'portal_payment_intent',
        referenceId: intent.intent_id,
        amount: created.amount,
        receiptNo: officialReceipt,
      });
    } catch (treasuryErr) {
      console.warn('[PortalPayments] treasuryPush failed (non-fatal):', treasuryErr.message);
    }

    await logAction(
      req.user.user_id,
      'CONFIRM_PORTAL_PAYMENT_INTENT',
      `Confirmed portal payment intent ${req.params.id} for ${intent.application_number} → payment ${created.payment_id}`,
      intent.application_id
    );

    const [updated] = await pool.execute(
      'SELECT * FROM portal_payment_intents WHERE intent_id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Confirmed',
      intent: updated[0],
      payment_id: created.payment_id,
      marked_paid: created.marked_paid,
    });
  } catch (error) {
    console.error('Confirm portal intent error:', error);
    if (error.status) {
      return fail(res, error.status, error.message);
    }
    return fail(res, 500, error.message || 'Internal server error');
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE portal_payment_intents SET status = 'cancelled', updated_at = NOW()
       WHERE intent_id = ? AND status IN ('pending','submitted')`,
      [req.params.id]
    );
    if (!result.affectedRows) return fail(res, 404, 'Intent not found or not cancellable');
    await logAction(
      req.user.user_id,
      'CANCEL_PORTAL_PAYMENT_INTENT',
      `Cancelled portal payment intent ${req.params.id}`,
      null
    );
    res.json({ message: 'Cancelled' });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
