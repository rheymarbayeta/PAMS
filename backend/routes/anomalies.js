const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { listAnomalies } = require('../utils/anomalyDetection');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('dashboard_view', 'waterworks_view', 'assess_fees', 'settings'));

router.get('/', async (_req, res) => {
  try {
    const data = await listAnomalies();
    res.json({ data, count: data.length });
  } catch (error) {
    console.error('Anomalies error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
