const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { listLedger } = require('../utils/paymentLedger');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('reports', 'view_reports', 'settings', 'waterworks_payments', 'rights_rentals_record_payment'));

/**
 * GET /api/payments-ledger — cross-module payment reconciliation
 */
router.get('/', async (req, res) => {
  try {
    const result = await listLedger({
      module: req.query.module,
      entityId: req.query.entity_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    console.error('Payment ledger list error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
