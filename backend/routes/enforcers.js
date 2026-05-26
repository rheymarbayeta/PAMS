const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const etracsService = require('../utils/etracsService');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all enforcers with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { status, department, station, search, page = 1, limit = 20 } = req.query;

    let baseWhere = 'WHERE 1=1';
    const params = [];

    if (status) {
      baseWhere += ' AND e.status = ?';
      params.push(status);
    }

    if (department) {
      baseWhere += ' AND e.department = ?';
      params.push(department);
    }

    if (station) {
      baseWhere += ' AND e.station = ?';
      params.push(station);
    }

    if (search) {
      baseWhere += ' AND (e.full_name LIKE ? OR e.badge_number LIKE ? OR e.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM enforcers e ${baseWhere}`;
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Fetch enforcers with live citation count and actual paid amounts
    const query = `
      SELECT e.*,
        COALESCE(c.live_citations, 0) AS citations_issued,
        COALESCE(c.live_fines, 0) AS total_fines,
        COALESCE(p.total_paid, 0) AS total_paid
      FROM enforcers e
      LEFT JOIN (
        SELECT enforcer_id,
               COUNT(*) AS live_citations,
               SUM(fine_amount) AS live_fines
        FROM citations
        GROUP BY enforcer_id
      ) c ON c.enforcer_id = e.enforcer_id
      LEFT JOIN (
        SELECT ci.enforcer_id,
               SUM(cp.amount_paid) AS total_paid
        FROM citation_payments cp
        JOIN citations ci ON ci.citation_id = cp.citation_id
        GROUP BY ci.enforcer_id
      ) p ON p.enforcer_id = e.enforcer_id
      ${baseWhere}
      ORDER BY e.full_name ASC
      LIMIT ${offset}, ${limitNum}
    `;
    const [enforcers] = await pool.execute(query, params);

    res.json({
      data: enforcers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get enforcers error:', error);
    res.status(500).json({ error: 'Failed to fetch enforcers' });
  }
});

/**
 * Get enforcer statistics for dashboard
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT e.enforcer_id) as total_enforcers,
        COUNT(CASE WHEN e.status = 'Active' THEN 1 END) as active_count,
        COUNT(CASE WHEN e.status = 'Inactive' THEN 1 END) as inactive_count,
        COUNT(CASE WHEN e.status = 'Suspended' THEN 1 END) as suspended_count,
        SUM(e.citations_issued) as total_citations,
        SUM(e.total_fines) as total_fines
      FROM enforcers e
    `);

    res.json(stats[0] || {});
  } catch (error) {
    console.error('Get enforcer stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get available departments and stations for filters
 */
router.get('/filters/options', async (req, res) => {
  try {
    const [departments] = await pool.execute(
      'SELECT DISTINCT department FROM enforcers WHERE department IS NOT NULL ORDER BY department'
    );

    const [stations] = await pool.execute(
      'SELECT DISTINCT station FROM enforcers WHERE station IS NOT NULL ORDER BY station'
    );

    res.json({
      departments: departments.map(d => d.department),
      stations: stations.map(s => s.station),
      statuses: ['Active', 'Inactive', 'Suspended', 'On Leave']
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// ==================== eTracs Integration Endpoints ====================

/**
 * Verify enforcer name with eTracs (check for possible duplicates)
 */
router.get('/etracs/verify-driver', async (req, res) => {
  try {
    const { firstname, lastname, middlename, birthdate } = req.query;

    if (!firstname && !lastname) {
      return res.status(400).json({ error: 'At least firstname or lastname is required' });
    }

    const duplicates = await etracsService.checkDuplicateEntity({
      firstname: firstname || '',
      lastname: lastname || '',
      middlename: middlename || '',
      birthdate: birthdate || ''
    });

    // Group by match score for easier frontend handling
    const highMatch = duplicates.filter(d => d.match_score >= 80);
    const mediumMatch = duplicates.filter(d => d.match_score >= 50 && d.match_score < 80);
    const lowMatch = duplicates.filter(d => d.match_score < 50);

    res.json({
      criteria: { firstname, lastname, middlename, birthdate },
      all_results: duplicates,
      high_match: highMatch,    // 80-100%
      medium_match: mediumMatch,  // 50-79%
      low_match: lowMatch,       // <50%
      exact_match: duplicates.find(d => d.match_score === 100) || null
    });
  } catch (error) {
    console.error('eTracs verify driver error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify driver with eTracs' });
  }
});

/**
 * Search eTracs for entities (for enforcer lookup)
 */
router.get('/etracs/search', async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;

    const etracsResult = await etracsService.searchEntities(search, page);

    res.json({
      source: 'eTracs',
      search,
      ...etracsResult
    });
  } catch (error) {
    console.error('eTracs search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search eTracs' });
  }
});

/**
 * Recalculate citations_issued and total_fines for all enforcers from live data
 */
router.post('/recalculate-stats', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    await pool.execute(`
      UPDATE enforcers e
      JOIN (
        SELECT enforcer_id,
               COUNT(*) AS live_citations,
               COALESCE(SUM(fine_amount), 0) AS live_fines
        FROM citations
        GROUP BY enforcer_id
      ) c ON c.enforcer_id = e.enforcer_id
      SET e.citations_issued = c.live_citations,
          e.total_fines = c.live_fines
    `);

    // Zero out enforcers who have no citations at all
    await pool.execute(`
      UPDATE enforcers
      SET citations_issued = 0, total_fines = 0
      WHERE enforcer_id NOT IN (SELECT DISTINCT enforcer_id FROM citations WHERE enforcer_id IS NOT NULL)
    `);

    await logAction(req.user.user_id, 'RECALCULATE_ENFORCER_STATS', 'Recalculated citations_issued and total_fines for all enforcers');

    res.json({ message: 'Enforcer stats recalculated successfully' });
  } catch (error) {
    console.error('Recalculate enforcer stats error:', error);
    res.status(500).json({ error: 'Failed to recalculate enforcer stats' });
  }
});

/**
 * Get enforcer by ID with statistics
 */
router.get('/:id', async (req, res) => {
  try {
    const [enforcers] = await pool.execute(
      'SELECT * FROM enforcers WHERE enforcer_id = ?',
      [req.params.id]
    );

    if (enforcers.length === 0) {
      return res.status(404).json({ error: 'Enforcer not found' });
    }

    const enforcer = enforcers[0];

    // Get citations by this enforcer
    const [citations] = await pool.execute(
      `SELECT 
        citation_id, ticket_number, driver_name, driver_address, violation_date, 
        violation_time, violation_location, fine_amount, payment_status
       FROM citations 
       WHERE enforcer_id = ? 
       ORDER BY violation_date DESC 
       LIMIT 100`,

      [req.params.id]
    );

    // Get statistics using effective payment_status (mirrors citations list logic)
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_citations,
        SUM(fine_amount) as total_fines,
        COUNT(CASE WHEN eff_status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN eff_status = 'Pending' THEN 1 END) as pending_count
       FROM (
         SELECT c.fine_amount,
           CASE
             WHEN COALESCE(cp_agg.total_paid, 0) <= 0 THEN
               CASE WHEN c.payment_status = 'Paid' THEN 'Pending' ELSE c.payment_status END
             WHEN COALESCE(cp_agg.total_paid, 0) >= c.fine_amount THEN 'Paid'
             ELSE 'Partially Paid'
           END AS eff_status
         FROM citations c
         LEFT JOIN (
           SELECT citation_id, SUM(amount_paid) AS total_paid
           FROM citation_payments GROUP BY citation_id
         ) cp_agg ON cp_agg.citation_id = c.citation_id
         WHERE c.enforcer_id = ?
       ) sub`,
      [req.params.id]
    );

    res.json({
      enforcer,
      citations,
      statistics: stats[0] || {
        total_citations: 0,
        total_fines: 0,
        paid_count: 0,
        pending_count: 0
      }
    });
  } catch (error) {
    console.error('Get enforcer error:', error);
    res.status(500).json({ error: 'Failed to fetch enforcer' });
  }
});

/**
 * Create new enforcer (Admin only)
 */
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const {
      badge_number,
      full_name,
      email,
      phone,
      position,
      department,
      station,
      license_number,
      license_expiry,
      date_hired,
      supervisor_id,
      notes
    } = req.body;

    // Validation
    if (!badge_number || !full_name) {
      return res.status(400).json({ 
        error: 'Badge number and full name are required' 
      });
    }

    // Check duplicate badge
    const [existing] = await pool.execute(
      'SELECT enforcer_id FROM enforcers WHERE badge_number = ?',
      [badge_number]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Badge number already exists' });
    }

    const enforcer_id = generateId(ID_PREFIXES.ENFORCER || 'ENF');

    await pool.execute(
      `INSERT INTO enforcers (
        enforcer_id, badge_number, full_name, email, phone, 
        position, department, station, license_number, license_expiry, 
        date_hired, supervisor_id, notes, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        enforcer_id, badge_number, full_name, email || null, phone || null,
        position || 'Traffic Enforcer', department || null, station || null, license_number || null, license_expiry || null,
        date_hired || null, supervisor_id || null, notes || null, req.user.user_id
      ]
    );

    await logAction(req.user.user_id, 'CREATE_ENFORCER', `Created enforcer: ${full_name} (${badge_number})`);

    res.status(201).json({
      enforcer_id,
      badge_number,
      full_name,
      status: 'Active'
    });
  } catch (error) {
    console.error('Create enforcer error:', error);
    res.status(500).json({ error: 'Failed to create enforcer' });
  }
});

/**
 * Update enforcer (Admin only)
 */
router.put('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const enforcerId = req.params.id;
    const {
      badge_number,
      full_name,
      email,
      phone,
      position,
      department,
      station,
      license_number,
      license_expiry,
      status,
      supervisor_id,
      notes
    } = req.body;

    // Check if enforcer exists
    const [existing] = await pool.execute(
      'SELECT enforcer_id FROM enforcers WHERE enforcer_id = ?',
      [enforcerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Enforcer not found' });
    }

    // Check badge duplication
    if (badge_number) {
      const [badgeCheck] = await pool.execute(
        'SELECT enforcer_id FROM enforcers WHERE badge_number = ? AND enforcer_id != ?',
        [badge_number, enforcerId]
      );

      if (badgeCheck.length > 0) {
        return res.status(409).json({ error: 'Badge number already in use' });
      }
    }

    // Build dynamic update
    const updates = [];
    const updateValues = [];

    if (badge_number) { updates.push('badge_number = ?'); updateValues.push(badge_number); }
    if (full_name) { updates.push('full_name = ?'); updateValues.push(full_name); }
    if (email !== undefined) { updates.push('email = ?'); updateValues.push(email || null); }
    if (phone !== undefined) { updates.push('phone = ?'); updateValues.push(phone || null); }
    if (position) { updates.push('position = ?'); updateValues.push(position); }
    if (department !== undefined) { updates.push('department = ?'); updateValues.push(department || null); }
    if (station !== undefined) { updates.push('station = ?'); updateValues.push(station || null); }
    if (license_number !== undefined) { updates.push('license_number = ?'); updateValues.push(license_number || null); }
    if (license_expiry !== undefined) { updates.push('license_expiry = ?'); updateValues.push(license_expiry || null); }
    if (status) { updates.push('status = ?'); updateValues.push(status); }
    if (supervisor_id !== undefined) { updates.push('supervisor_id = ?'); updateValues.push(supervisor_id || null); }
    if (notes !== undefined) { updates.push('notes = ?'); updateValues.push(notes || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updateValues.push(enforcerId);
    await pool.execute(
      `UPDATE enforcers SET ${updates.join(', ')} WHERE enforcer_id = ?`,
      updateValues
    );

    await logAction(req.user.user_id, 'UPDATE_ENFORCER', `Updated enforcer: ${enforcerId}`);

    res.json({ message: 'Enforcer updated successfully' });
  } catch (error) {
    console.error('Update enforcer error:', error);
    res.status(500).json({ error: 'Failed to update enforcer' });
  }
});

/**
 * Delete enforcer (SuperAdmin only)
 */
router.delete('/:id', authorize('SuperAdmin'), async (req, res) => {
  try {
    const enforcerId = req.params.id;

    // Check if enforcer has citations
    const [citations] = await pool.execute(
      'SELECT COUNT(*) as count FROM citations WHERE enforcer_id = ?',
      [enforcerId]
    );

    if (citations[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete enforcer with ${citations[0].count} active citations` 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM enforcers WHERE enforcer_id = ?',
      [enforcerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Enforcer not found' });
    }

    await logAction(req.user.user_id, 'DELETE_ENFORCER', `Deleted enforcer: ${enforcerId}`);

    res.json({ message: 'Enforcer deleted successfully' });
  } catch (error) {
    console.error('Delete enforcer error:', error);
    res.status(500).json({ error: 'Failed to delete enforcer' });
  }
});

/**
 * Get citations issued by a specific enforcer
 */
router.get('/:id/citations', async (req, res) => {
  try {
    const enforcerId = req.params.id;
    const { page = 1, limit = 20, status } = req.query;

    console.log('[GET /:id/citations] enforcerId:', enforcerId, 'page:', page, 'status filter:', status);

    // Verify enforcer exists
    const [enforcer] = await pool.execute(
      'SELECT enforcer_id, full_name FROM enforcers WHERE enforcer_id = ?',
      [enforcerId]
    );

    if (enforcer.length === 0) {
      return res.status(404).json({ error: 'Enforcer not found' });
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build the effective payment_status expression (mirrors GET /api/citations logic)
    const effectiveStatus = `CASE
      WHEN COALESCE(cp_agg.total_paid, 0) <= 0 THEN
        CASE WHEN c.payment_status = 'Paid' THEN 'Pending' ELSE c.payment_status END
      WHEN COALESCE(cp_agg.total_paid, 0) >= c.fine_amount THEN 'Paid'
      ELSE 'Partially Paid'
    END`;

    // Subquery so we can filter on the computed status
    const statusCondition = status ? `AND eff_status = ?` : '';
    const baseParams = [enforcerId];
    if (status) baseParams.push(status);

    const innerSQL = `
      SELECT 
        c.citation_id, c.ticket_number, c.driver_name, c.driver_address, c.plate_number,
        c.violation_date, c.violation_time, c.violation_location, c.violations,
        c.fine_amount, c.created_at, COALESCE(cp_agg.total_paid, 0) AS amount_paid,
        ${effectiveStatus} AS eff_status
      FROM citations c
      LEFT JOIN (
        SELECT citation_id, SUM(amount_paid) AS total_paid
        FROM citation_payments GROUP BY citation_id
      ) cp_agg ON cp_agg.citation_id = c.citation_id
      WHERE c.enforcer_id = ?
    `;

    console.log('[GET /:id/citations] statusCondition:', statusCondition, 'params:', baseParams);

    // Get total count (filtered by effective status)
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${innerSQL}) sub WHERE 1=1 ${statusCondition}`,
      baseParams
    );
    const total = countResult[0]?.total || 0;
    console.log('[GET /:id/citations] total (filtered):', total);

    // Get citations (filtered + paginated)
    const [citations] = await pool.execute(
      `SELECT citation_id, ticket_number, driver_name, driver_address, plate_number,
              violation_date, violation_time, violation_location, violations,
              fine_amount, created_at, amount_paid, eff_status AS payment_status
       FROM (${innerSQL}) sub
       WHERE 1=1 ${statusCondition}
       ORDER BY created_at DESC
       LIMIT ${offset}, ${limitNum}`,
      baseParams
    );

    // Parse violations JSON
    citations.forEach(row => {
      if (row.violations && typeof row.violations === 'string') {
        try { row.violations = JSON.parse(row.violations); }
        catch (e) { row.violations = []; }
      } else if (!row.violations) {
        row.violations = [];
      }
    });

    console.log('[GET /:id/citations] rows returned:', citations.length);

    // Summary statistics using effective status
    const [statsRows] = await pool.execute(
      `SELECT 
        COUNT(*) AS total_issued,
        COALESCE(SUM(fine_amount), 0) AS total_fines,
        COALESCE(SUM(amount_paid), 0) AS total_collected,
        COUNT(CASE WHEN eff_status = 'Paid' THEN 1 END) AS paid_count,
        COUNT(CASE WHEN eff_status = 'Pending' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN eff_status IN ('Installment', 'Partially Paid') THEN 1 END) AS installment_count
       FROM (${innerSQL}) sub
       WHERE 1=1 ${statusCondition}`,
      baseParams
    );

    console.log('[GET /:id/citations] stats:', statsRows[0]);

    res.json({
      enforcer: enforcer[0],
      citations: citations || [],
      statistics: statsRows[0] || {
        total_issued: 0,
        total_fines: 0,
        total_collected: 0,
        paid_count: 0,
        pending_count: 0,
        installment_count: 0
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get enforcer citations error:', error);
    res.status(500).json({ error: 'Failed to fetch enforcer citations' });
  }
});

module.exports = router;
