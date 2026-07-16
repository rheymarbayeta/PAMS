const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { sendSms, treasuryPush, gisLookup, listEvents } = require('../utils/integrationHub');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('settings', 'integrations_manage'));

router.get('/events', async (req, res) => {
  try {
    const data = await listEvents({ channel: req.query.channel, limit: req.query.limit });
    res.json({ data });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/sms', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return fail(res, 400, 'to and message required');
    const result = await sendSms({ to, message });
    res.status(202).json(result);
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/treasury', async (req, res) => {
  try {
    const result = await treasuryPush(req.body || {});
    res.status(202).json(result);
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/gis/lookup', async (req, res) => {
  try {
    const result = await gisLookup(req.body || {});
    res.json(result);
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.get('/channels', (_req, res) => {
  res.json({
    data: [
      { id: 'sms', enabled: String(process.env.SMS_ENABLED || '').toLowerCase() === 'true' },
      { id: 'treasury', enabled: false, mode: 'stub' },
      { id: 'gis', enabled: false, mode: 'stub' },
      { id: 'etracs', enabled: Boolean(process.env.ETRACS_BASE_URL) },
    ],
  });
});

module.exports = router;
