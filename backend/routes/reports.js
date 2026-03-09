const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get report data with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;
    
    // Get filter parameters
    const attributeId = req.query.attributeId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const statusFilter = req.query.status;

    let query = `
      SELECT 
        a.application_id,
        a.application_number,
        a.entity_id,
        a.permit_type_id,
        COALESCE(pt.permit_type_name, a.permit_type) as permit_type_name,
        a.status,
        a.created_at,
        e.entity_name,
        COALESCE(ar.business_name, e.entity_name, 'Unknown') as business_name,
        ar.owner_name,
        COALESCE(ar.address, '') as address,
        COALESCE(
          ar.total_amount_due,
          (SELECT COALESCE(SUM(arf.total), 0) FROM assessment_record_fees arf WHERE arf.assessment_id = ar.assessment_id),
          0
        ) as total_amount_due,
        COALESCE(ar.total_balance_due, 0) as total_balance_due,
        COALESCE(attr.attribute_name, pt.attribute, 'N/A') as attribute_name
      FROM applications a
      LEFT JOIN entities e ON a.entity_id = e.entity_id
      LEFT JOIN assessment_records ar ON a.application_id = ar.application_id
      LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
      LEFT JOIN attributes attr ON pt.attribute_id = attr.attribute_id
      WHERE 1=1
    `;

    const params = [];

    // Role-based filtering
    if (roleName === 'Application Creator') {
      query += ' AND a.creator_id = ?';
      params.push(userId);
    } else if (roleName === 'Assessor') {
      query += ' AND (a.assessor_id = ? OR a.status = ?)';
      params.push(userId, 'Pending');
    } else if (roleName === 'Approver') {
      query += ' AND (a.approver_id = ? OR a.status = ?)';
      params.push(userId, 'Pending Approval');
    }
    // SuperAdmin, Admin, Viewer can see all

    // Filter by Attribute
    if (attributeId) {
      query += ' AND pt.attribute_id = ?';
      params.push(attributeId);
    }

    // Filter by Status
    if (statusFilter) {
      query += ' AND a.status = ?';
      params.push(statusFilter);
    }

    // Date range filter
    if (startDate) {
      query += ' AND a.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      query += ' AND a.created_at <= ?';
      params.push(endDateWithTime.toISOString().slice(0, 19).replace('T', ' '));
    }

    query += ' ORDER BY a.created_at DESC';

    console.log('📊 REPORT QUERY DEBUG INFO');
    console.log('================================================');
    console.log('User:', { userId, roleName });
    console.log('Filters:', { attributeId, statusFilter, startDate, endDate });
    console.log('SQL Query (first 500 chars):', query.substring(0, 500));
    console.log('Query Parameters:', params);
    
    const [reports] = await pool.execute(query, params);
    
    console.log('================================================');
    console.log('Total Records Found:', reports.length);
    
    if (reports.length > 0) {
      console.log('First Record (Full Structure):');
      console.log(JSON.stringify(reports[0], null, 2));
      console.log('');
      console.log('Field Check:');
      console.log('  ✓ application_id:', reports[0].application_id || 'MISSING');
      console.log('  ✓ application_number:', reports[0].application_number || 'MISSING');
      console.log('  ✓ business_name:', reports[0].business_name || 'MISSING');
      console.log('  ✓ permit_type_name:', reports[0].permit_type_name || 'MISSING');
      console.log('  ✓ attribute_name:', reports[0].attribute_name || 'MISSING');
      console.log('  ✓ total_amount_due:', reports[0].total_amount_due || 'MISSING/0');
      console.log('  ✓ address:', reports[0].address ? reports[0].address.substring(0, 50) : 'MISSING');
      console.log('  ✓ status:', reports[0].status || 'MISSING');
      console.log('  ✓ created_at:', reports[0].created_at || 'MISSING');
      console.log('================================================');
    } else {
      console.log('⚠️ No records found! Check filters or role-based access.');
      console.log('================================================');
    }
    
    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report summary statistics
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleName = req.user.role_name;
    const attributeId = req.query.attributeId;
    const statusFilter = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let baseQuery = `
      FROM applications a
      LEFT JOIN assessment_records ar ON a.application_id = ar.application_id
      LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
      WHERE 1=1
    `;

    const params = [];

    // Role-based filtering
    if (roleName === 'Application Creator') {
      baseQuery += ' AND a.creator_id = ?';
      params.push(userId);
    } else if (roleName === 'Assessor') {
      baseQuery += ' AND (a.assessor_id = ? OR a.status = ?)';
      params.push(userId, 'Pending');
    } else if (roleName === 'Approver') {
      baseQuery += ' AND (a.approver_id = ? OR a.status = ?)';
      params.push(userId, 'Pending Approval');
    }

    // Filter by Attribute
    if (attributeId) {
      baseQuery += ' AND pt.attribute_id = ?';
      params.push(attributeId);
    }

    // Filter by Status
    if (statusFilter) {
      baseQuery += ' AND a.status = ?';
      params.push(statusFilter);
    }

    // Date range filter
    if (startDate) {
      baseQuery += ' AND a.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      baseQuery += ' AND a.created_at <= ?';
      params.push(endDate);
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [[{ total }]] = await pool.execute(countQuery, params);

    // Sum total amount due with fallback logic
    let sumQuery = `
      SELECT COALESCE(SUM(COALESCE(ar.total_amount_due, 0)), 0) as totalAmount ${baseQuery}
    `;
    const [[{ totalAmount }]] = await pool.execute(sumQuery, params);

    // Count by status
    const statusQuery = `
      SELECT a.status, COUNT(*) as count ${baseQuery}
      GROUP BY a.status
    `;
    const [statuses] = await pool.execute(statusQuery, params);

    console.log('📊 REPORT SUMMARY DEBUG INFO');
    console.log('================================================');
    console.log('Summary Filters:', { attributeId, statusFilter, startDate, endDate });
    console.log('Total Records:', total);
    console.log('Total Amount:', totalAmount);
    console.log('Status Breakdown:', statuses);
    console.log('================================================');

    res.json({
      success: true,
      summary: {
        totalRecords: total,
        totalAmount: parseFloat(totalAmount),
        byStatus: statuses
      }
    });
  } catch (error) {
    console.error('Get report summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all attributes for filter options
router.get('/filter-options/attributes', async (req, res) => {
  try {
    const [attributes] = await pool.execute(`
      SELECT DISTINCT 
        attr.attribute_id,
        attr.attribute_name
      FROM attributes attr
      INNER JOIN permit_types pt ON pt.attribute_id = attr.attribute_id
      INNER JOIN applications a ON a.permit_type_id = pt.permit_type_id
      WHERE attr.is_active = 1
      ORDER BY attr.attribute_name
    `);

    res.json({
      success: true,
      data: attributes
    });
  } catch (error) {
    console.error('Get filter attributes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
