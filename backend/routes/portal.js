const express = require('express');
const pool = require('../config/database');
const { fail } = require('../utils/apiResponse');

const router = express.Router();

/**
 * Citizen / self-service portal (Phase 3 MVP) — public, read-only status tracking.
 */

router.get('/track', async (req, res) => {
  try {
    const number = String(req.query.application_number || req.query.q || '').trim();
    if (!number || number.length < 4) {
      return fail(res, 400, 'Provide a valid application_number');
    }

    const [apps] = await pool.execute(
      `SELECT a.application_id, a.application_number, a.permit_type, a.status,
              a.created_at, a.issued_at, a.validity_date,
              e.entity_name
       FROM applications a
       LEFT JOIN entities e ON e.entity_id = a.entity_id
       WHERE a.application_number = ?
       LIMIT 1`,
      [number]
    );

    if (!apps.length) {
      return fail(res, 404, 'Application not found');
    }

    const app = apps[0];
    // Public payload — no internal IDs beyond what's needed for status
    res.json({
      data: {
        application_number: app.application_number,
        permit_type: app.permit_type,
        status: app.status,
        entity_name: app.entity_name,
        submitted_at: app.created_at,
        issued_at: app.issued_at,
        validity_date: app.validity_date,
        public_message:
          app.status === 'Released' || app.status === 'Issued'
            ? 'Your permit is ready for release/pickup.'
            : app.status === 'Rejected'
              ? 'This application was rejected. Please contact the municipal office.'
              : 'Your application is being processed.',
      },
    });
  } catch (error) {
    console.error('Portal track error:', error);
    return fail(res, 500, 'Unable to look up application');
  }
});

router.get('/info', (_req, res) => {
  res.json({
    name: 'PAMS Citizen Portal',
    features: ['application_status_tracking'],
    note: 'MVP — expand with OTP auth and online payments in later releases',
  });
});

module.exports = router;
