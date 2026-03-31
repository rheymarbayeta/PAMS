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
      `SELECT DISTINCT pt.permit_type_name 
       FROM permit_types pt
       INNER JOIN applications a ON a.permit_type_id = pt.permit_type_id
       WHERE pt.is_active = 1
       ORDER BY pt.permit_type_name`
    );
    res.json(categories.map(c => c.permit_type_name));
  } catch (error) {
    console.error('Get permit categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get full dashboard data (permits + citations + recent activity)
router.get('/full-stats', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;
    const permitCategory = req.query.permitCategory;

    // Build role filter
    let roleWhere = '';
    const roleParams = [];
    if (roleName === 'Application Creator') {
      roleWhere = ' AND a.creator_id = ?';
      roleParams.push(userId);
    } else if (roleName === 'Assessor') {
      roleWhere = ' AND (a.assessor_id = ? OR a.status = ?)';
      roleParams.push(userId, 'Pending');
    } else if (roleName === 'Approver') {
      roleWhere = ' AND (a.approver_id = ? OR a.status = ?)';
      roleParams.push(userId, 'Pending Approval');
    }

    let catWhere = '';
    const catParams = [];
    if (permitCategory) {
      catWhere = ' AND pt.permit_type_name = ?';
      catParams.push(permitCategory);
    }

    // Permit status counts
    const [statusCounts] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN a.status='Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN a.status='Pending Approval' THEN 1 END) as pendingApproval,
        COUNT(CASE WHEN a.status IN ('Approved','Paid') THEN 1 END) as approved,
        COUNT(CASE WHEN a.status IN ('Issued','Released') THEN 1 END) as issued,
        COUNT(CASE WHEN a.status='Released' THEN 1 END) as released,
        COUNT(*) as total
      FROM applications a
      LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
      WHERE 1=1${catWhere}${roleWhere}`,
      [...catParams, ...roleParams]
    );

    // Permits by category (for donut chart)
    const [permitByCategory] = await pool.execute(
      `SELECT pt.permit_type_name as category, COUNT(*) as count
       FROM applications a JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
       WHERE 1=1${roleWhere}
       GROUP BY pt.permit_type_name ORDER BY count DESC`,
      [...roleParams]
    );

    // Monthly trend (last 6 months)
    const [monthlyTrend] = await pool.execute(
      `SELECT DATE_FORMAT(a.created_at,'%Y-%m') as month,
              DATE_FORMAT(a.created_at,'%b') as month_label,
              COUNT(*) as count
       FROM applications a
       LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
       WHERE a.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)${catWhere}${roleWhere}
       GROUP BY month, month_label ORDER BY month ASC`,
      [...catParams, ...roleParams]
    );

    // Citation stats
    const [citationStats] = await pool.execute(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN payment_status='Paid' THEN 1 END) as paid,
        COUNT(CASE WHEN payment_status='Pending' THEN 1 END) as pending,
        SUM(fine_amount) as totalFines,
        SUM(CASE WHEN payment_status='Paid' THEN fine_amount ELSE 0 END) as collectedFines
      FROM citations`
    );

    // Recent applications (last 5)
    const [recentApplications] = await pool.execute(
      `SELECT a.application_id, a.application_number, a.status, a.created_at,
              e.entity_name, pt.permit_type_name
       FROM applications a
       LEFT JOIN entities e ON a.entity_id = e.entity_id
       LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
       WHERE 1=1${roleWhere}
       ORDER BY a.created_at DESC LIMIT 5`,
      [...roleParams]
    );

    // Recent citations (last 5)
    const [recentCitations] = await pool.execute(
      `SELECT citation_id, ticket_number, driver_name, plate_number,
              fine_amount, payment_status, violation_date
       FROM citations ORDER BY created_at DESC LIMIT 5`
    );

    // Expiring permits (next 30 days)
    const [expiringPermits] = await pool.execute(
      `SELECT a.application_id, a.application_number, a.validity_date,
              e.entity_name, pt.permit_type_name
       FROM applications a
       LEFT JOIN entities e ON a.entity_id = e.entity_id
       LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
       WHERE a.validity_date IS NOT NULL
         AND a.validity_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         AND a.status IN ('Issued','Released')
       ORDER BY a.validity_date ASC LIMIT 5`
    );

    // Entity count
    const [entityCount] = await pool.execute('SELECT COUNT(*) as count FROM entities');

    res.json({
      permits: {
        ...statusCounts[0],
        byCategory: permitByCategory,
        monthlyTrend
      },
      citations: {
        ...citationStats[0],
        totalFines: Number(citationStats[0].totalFines) || 0,
        collectedFines: Number(citationStats[0].collectedFines) || 0,
      },
      entities: entityCount[0].count,
      recentApplications,
      recentCitations,
      expiringPermits
    });
  } catch (error) {
    console.error('Full dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;
    const permitCategory = req.query.permitCategory; // Optional filter by permit_type_name

    let pendingQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id WHERE a.status = ?';
    let pendingParams = ['Pending'];

    let pendingApprovalQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id WHERE a.status = ?';
    let pendingApprovalParams = ['Pending Approval'];

    let approvedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id WHERE a.status IN (?, ?)';
    let approvedParams = ['Approved', 'Paid'];

    let issuedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id WHERE a.status IN (?, ?)';
    let issuedParams = ['Issued', 'Released'];

    let releasedQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id WHERE a.status = ?';
    let releasedParams = ['Released'];

    let totalQuery = 'SELECT COUNT(*) as count FROM applications a LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id';
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

