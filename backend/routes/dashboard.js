const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get distinct permit type names for dashboard grouping
router.get('/permit-categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT DISTINCT permit_type_name 
       FROM permit_types 
       WHERE is_active = 1 
       ORDER BY permit_type_name`
    );
    res.json(categories.map(c => c.permit_type_name));
  } catch (error) {
    console.error('Get permit categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;
    const permitCategory = req.query.permitCategory; // Optional filter by permit type name

    let pendingQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name WHERE a.status = ?';
    let pendingParams = ['Pending'];

    let pendingApprovalQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name WHERE a.status = ?';
    let pendingApprovalParams = ['Pending Approval'];

    let approvedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name WHERE a.status IN (?, ?)';
    let approvedParams = ['Approved', 'Paid'];

    let issuedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name WHERE a.status IN (?, ?)';
    let issuedParams = ['Issued', 'Released'];

    let releasedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name WHERE a.status = ?';
    let releasedParams = ['Released'];

    let totalQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type = pt.permit_type_name';
    let totalParams = [];
    let hasWhere = false;

    // Filter by permit category (permit_type_name) if provided
    if (permitCategory) {
      pendingQuery += ' AND pt.permit_type_name = ?';
      pendingParams.push(permitCategory);
      pendingApprovalQuery += ' AND pt.permit_type_name = ?';
      pendingApprovalParams.push(permitCategory);
      approvedQuery += ' AND pt.permit_type_name = ?';
      approvedParams.push(permitCategory);
      issuedQuery += ' AND pt.permit_type_name = ?';
      issuedParams.push(permitCategory);
      releasedQuery += ' AND pt.permit_type_name = ?';
      releasedParams.push(permitCategory);
      totalQuery += ' WHERE pt.permit_type_name = ?';
      totalParams.push(permitCategory);
      hasWhere = true;
    }

    // Role-based filtering
    if (roleName === 'Application Creator') {
      pendingQuery += ' AND a.creator_id = ?';
      pendingParams.push(userId);
      pendingApprovalQuery += ' AND a.creator_id = ?';
      pendingApprovalParams.push(userId);
      approvedQuery += ' AND a.creator_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND a.creator_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND a.creator_id = ?';
      releasedParams.push(userId);
      totalQuery += (hasWhere ? ' AND' : ' WHERE') + ' a.creator_id = ?';
      totalParams.push(userId);
    } else if (roleName === 'Assessor') {
      pendingQuery += ' AND (a.status = ? OR a.assessor_id = ?)';
      pendingParams.push('Pending', userId);
      pendingApprovalQuery += ' AND a.assessor_id = ?';
      pendingApprovalParams.push(userId);
      approvedQuery += ' AND a.assessor_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND a.assessor_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND a.assessor_id = ?';
      releasedParams.push(userId);
      totalQuery += (hasWhere ? ' AND' : ' WHERE') + ' (a.assessor_id = ? OR a.status = ?)';
      totalParams.push(userId, 'Pending');
    } else if (roleName === 'Approver') {
      pendingApprovalQuery += ' AND (a.status = ? OR a.approver_id = ?)';
      pendingApprovalParams.push('Pending Approval', userId);
      approvedQuery += ' AND a.approver_id = ?';
      approvedParams.push(userId);
      issuedQuery += ' AND a.approver_id = ?';
      issuedParams.push(userId);
      releasedQuery += ' AND a.approver_id = ?';
      releasedParams.push(userId);
      totalQuery += (hasWhere ? ' AND' : ' WHERE') + ' (a.approver_id = ? OR a.status = ?)';
      totalParams.push(userId, 'Pending Approval');
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

