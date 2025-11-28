const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;

    let pendingQuery = 'SELECT COUNT(*) as count FROM applications WHERE status = ?';
    let pendingParams = ['Pending'];

    let pendingApprovalQuery = 'SELECT COUNT(*) as count FROM applications WHERE status = ?';
    let pendingApprovalParams = ['Pending Approval'];

    let approvedQuery = 'SELECT COUNT(*) as count FROM applications WHERE status IN (?, ?)';
    let approvedParams = ['Approved', 'Paid'];

    let issuedQuery = 'SELECT COUNT(*) as count FROM applications WHERE status IN (?, ?)';
    let issuedParams = ['Issued', 'Released'];

    let releasedQuery = 'SELECT COUNT(*) as count FROM applications WHERE status = ?';
    let releasedParams = ['Released'];

    let totalQuery = 'SELECT COUNT(*) as count FROM applications';
    let totalParams = [];

    // Role-based filtering
    if (roleName === 'Application Creator') {
      pendingQuery += ' AND creator_id = ?';
      pendingParams.push(userId);
      pendingApprovalQuery += ' AND creator_id = ?';
      pendingApprovalParams.push(userId);
      approvedQuery += ' AND creator_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND creator_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND creator_id = ?';
      releasedParams.push(userId);
      totalQuery += ' WHERE creator_id = ?';
      totalParams.push(userId);
    } else if (roleName === 'Assessor') {
      pendingQuery += ' AND (status = ? OR assessor_id = ?)';
      pendingParams = ['Pending', userId];
      pendingApprovalQuery += ' AND assessor_id = ?';
      pendingApprovalParams.push(userId);
      approvedQuery += ' AND assessor_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND assessor_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND assessor_id = ?';
      releasedParams.push(userId);
      totalQuery += ' WHERE assessor_id = ? OR status = ?';
      totalParams = [userId, 'Pending'];
    } else if (roleName === 'Approver') {
      pendingQuery += ' AND status = ?';
      pendingApprovalQuery += ' AND (status = ? OR approver_id = ?)';
      pendingApprovalParams = ['Pending Approval', userId];
      approvedQuery += ' AND approver_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND approver_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND approver_id = ?';
      releasedParams.push(userId);
      totalQuery += ' WHERE approver_id = ? OR status = ?';
      totalParams = [userId, 'Pending Approval'];
    }

    const [pending] = await pool.execute(pendingQuery, pendingParams);
    const [pendingApproval] = await pool.execute(pendingApprovalQuery, pendingApprovalParams);
    const [approved] = await pool.execute(approvedQuery, approvedParams);
    const [issued] = await pool.execute(issuedQuery, issuedParams);
    const [released] = await pool.execute(releasedQuery, releasedParams);
    const [total] = await pool.execute(totalQuery, totalParams);

    res.json({
      pending: pending[0].count,
      pendingApproval: pendingApproval[0].count,
      approved: approved[0].count,
      issued: issued[0].count,
      released: released[0].count,
      total: total[0].count,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

