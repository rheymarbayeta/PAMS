const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createJob, getJob, getJobAsync } = require('../utils/jobQueue');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/jobs — enqueue an async PDF job
 * body: { type: 'assessment_pdf'|'permit_pdf', applicationId }
 */
router.post('/', requirePermission('applications', 'view_reports', 'reports'), async (req, res) => {
  try {
    const { type, applicationId } = req.body;
    if (!type || !applicationId) {
      return res.status(400).json({ error: 'type and applicationId are required' });
    }
    if (!['assessment_pdf', 'permit_pdf'].includes(type)) {
      return res.status(400).json({ error: 'Unsupported job type' });
    }

    const job = createJob(type, {
      applicationId,
      printedBy: req.user.full_name || req.user.username,
    });

    res.status(202).json({
      job_id: job.id,
      status: job.status,
      status_url: `/api/jobs/${job.id}`,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/jobs/:id — poll job status / result
 */
router.get('/:id', requirePermission('applications', 'view_reports', 'reports'), async (req, res) => {
  const job = (await getJobAsync(req.params.id)) || getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const body = {
    job_id: job.id,
    type: job.type,
    status: job.status,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };

  if (job.status === 'failed') {
    body.error = job.error;
  }
  if (job.status === 'completed' && job.result) {
    body.result = job.result;
  }

  res.json(body);
});

module.exports = router;
