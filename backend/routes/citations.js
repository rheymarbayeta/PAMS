const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const etracsService = require('../utils/etracsService');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Generate ticket number
function generateTicketNumber() {
  const prefix = 'DG-' + new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return prefix + '-' + random;
}

// Get all citations (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, dateFrom, dateTo, plateNumber, driverName, enforcerId, page = 1, limit = 10 } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build base query
    let whereSQL = '';
    const params = [];

    if (status && status !== 'all') {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.payment_status = ?';
      params.push(status);
    }
    if (plateNumber && plateNumber.trim()) {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.plate_number LIKE ?';
      params.push(`%${plateNumber.trim()}%`);
    }
    if (driverName && driverName.trim()) {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.driver_name LIKE ?';
      params.push(`%${driverName.trim()}%`);
    }
    if (dateFrom) {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.violation_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.violation_date <= ?';
      params.push(dateTo);
    }
    if (enforcerId) {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.enforcer_id = ?';
      params.push(enforcerId);
    }

    // Count total
    const countSQL = `SELECT COUNT(*) as total FROM citations c${whereSQL}`;
    const [countRows] = await pool.execute(countSQL, params);
    const total = countRows[0]?.total || 0;

    // Select with pagination - use LIMIT and OFFSET as values not placeholders
    const selectSQL = `
      SELECT c.citation_id, c.ticket_number, c.driver_name, c.plate_number,
             c.violation_date, c.fine_amount, c.is_completed,
             c.violations, c.created_at, COALESCE(u.full_name, 'Unknown') as issued_by_name,
             COALESCE(cp.total_paid, 0) as total_paid,
             CASE
               WHEN COALESCE(cp.total_paid, 0) <= 0 THEN
                 CASE WHEN c.payment_status = 'Paid' THEN 'Pending' ELSE c.payment_status END
               WHEN COALESCE(cp.total_paid, 0) >= c.fine_amount THEN 'Paid'
               ELSE 'Partially Paid'
             END as payment_status
      FROM citations c
      LEFT JOIN users u ON c.issued_by_user_id = u.user_id
      LEFT JOIN (SELECT citation_id, SUM(amount_paid) as total_paid FROM citation_payments GROUP BY citation_id) cp ON cp.citation_id = c.citation_id${whereSQL}
      ORDER BY c.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(selectSQL, params);

    // Parse violations JSON for each citation
    const parsedRows = rows.map(row => {
      if (row.violations && typeof row.violations === 'string') {
        try {
          row.violations = JSON.parse(row.violations);
        } catch (e) {
          console.warn('Could not parse violations:', e);
          row.violations = [];
        }
      }
      return row;
    });

    return res.json({
      data: parsedRows || [],
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Get citations error:', error);
    return res.status(500).json({ error: 'Failed to fetch citations' });
  }
});

// Get citation statistics/report - must come before /:id route
router.get('/report/summary', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_citations,
        SUM(fine_amount) as total_fines,
        COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN payment_status IN ('Installment', 'Partially Paid') THEN 1 END) as installment_count,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_count
      FROM citations
      WHERE 1=1
    `;

    const params = [];

    if (dateFrom) {
      query += ' AND violation_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND violation_date <= ?';
      params.push(dateTo);
    }

    const [results] = await pool.execute(query, params);

    res.json(results[0]);
  } catch (error) {
    console.error('Get citation report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get single citation
router.get('/:id', async (req, res) => {
  try {
    const citationId = req.params.id;
    console.log('=== GET citation by ID ===');
    console.log('Requested citation ID:', citationId);
    console.log('Citation ID length:', citationId.length);
    console.log('Citation ID type:', typeof citationId);

    // Debug: Log first 5 citations in DB
    const [allCitations] = await pool.execute('SELECT citation_id FROM citations LIMIT 5');
    console.log('Sample citation IDs in DB:', allCitations.map(c => c.citation_id));

    const [citations] = await pool.execute(
      `SELECT 
        c.*,
        u.full_name as issued_by_name
      FROM citations c
      LEFT JOIN users u ON c.issued_by_user_id = u.user_id
      WHERE c.citation_id = ?`,
      [citationId]
    );

    console.log('Citations found:', citations.length);
    if (citations.length === 0) {
      console.log('No citation found. Debug info:');
      console.log('- Requested ID:', citationId);
      console.log('- Exact query: SELECT * FROM citations WHERE citation_id = ?');
    }

    if (citations.length === 0) {
      console.log('Citation not found for ID:', citationId);
      return res.status(404).json({ error: 'Citation not found' });
    }

    const citation = citations[0];
    
    // Handle violations - might be string or already parsed
    if (citation.violations) {
      if (typeof citation.violations === 'string') {
        try {
          citation.violations = JSON.parse(citation.violations);
        } catch (e) {
          console.warn('Could not parse violations:', e);
          citation.violations = [];
        }
      }
    }

    // Fetch payment history
    const [payments] = await pool.execute(
      `SELECT * FROM Citation_Payments WHERE citation_id = ? ORDER BY payment_date DESC`,
      [citationId]
    );

    // Compute effective payment status based on actual payments
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    if (totalPaid <= 0 && citation.payment_status === 'Paid') {
      citation.payment_status = 'Pending';
    } else if (totalPaid > 0 && totalPaid < Number(citation.fine_amount)) {
      citation.payment_status = 'Partially Paid';
    } else if (totalPaid >= Number(citation.fine_amount) && Number(citation.fine_amount) > 0) {
      citation.payment_status = 'Paid';
    }

    console.log('Citation fetched:', citation.citation_id, 'with', payments.length, 'payments');
    res.json({
      data: citation,
      payments: payments || []
    });
  } catch (error) {
    console.error('Get citation error:', error);
    res.status(500).json({ error: 'Failed to fetch citation' });
  }
});

// Create new citation
router.post('/', async (req, res) => {
  try {
    const {
      ticketNumber,
      driverName,
      driverAddress,
      driverContact,
      licenseNumber,
      licenseExpiry,
      vehicleType,
      vehicleColor,
      plateNumber,
      vehicleRegistration,
      vehicleOwner,
      ownerName,
      ownerAddress,
      ownerContact,
      violations,
      otherViolations,
      violationLocation,
      violationTime,
      violationDate,
      remarks,
      fineAmount,
      paymentStatus,
      enforcerId,
      enforcerName,
      enforcerBadge,
      enforcerSignature,
      witnessName,
      witnessSignature,
      supervisorName,
      supervisorSignature,
      sealStamp,
      isCompleted,
    } = req.body;

    const citationId = generateId(ID_PREFIXES.CITATION);
    const finalTicketNumber = ticketNumber || generateTicketNumber();

    const [result] = await pool.execute(
      `INSERT INTO citations (
        citation_id, ticket_number, driver_name, driver_address, driver_contact,
        license_number, license_expiry, vehicle_type, vehicle_color, plate_number,
        vehicle_registration, vehicle_owner, owner_name, owner_address, owner_contact,
        violations, other_violations, violation_location, violation_time, violation_date,
        remarks, fine_amount, payment_status, enforcer_id, enforcer_name, enforcer_badge,
        enforcer_signature, witness_name, witness_signature, supervisor_name,
        supervisor_signature, seal_stamp, is_completed, issued_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        citationId,
        finalTicketNumber,
        driverName || null,
        driverAddress || null,
        driverContact || null,
        licenseNumber || null,
        licenseExpiry || null,
        vehicleType || null,
        vehicleColor || null,
        plateNumber || null,
        vehicleRegistration || null,
        vehicleOwner || null,
        ownerName || null,
        ownerAddress || null,
        ownerContact || null,
        JSON.stringify(violations || []),
        otherViolations || null,
        violationLocation || null,
        violationTime || null,
        violationDate || null,
        remarks || null,
        fineAmount || 0,
        paymentStatus || 'Pending',
        enforcerId || null,
        enforcerName || null,
        enforcerBadge || null,
        enforcerSignature || null,
        witnessName || null,
        witnessSignature || null,
        supervisorName || null,
        supervisorSignature || null,
        sealStamp || null,
        isCompleted || false,
        req.user.user_id,
      ]
    );

    // Update enforcer metrics if enforcer_id provided
    if (enforcerId) {
      const fineAmountNum = parseFloat(fineAmount) || 0;
      await pool.execute(
        `UPDATE enforcers SET citations_issued = citations_issued + 1, total_fines = total_fines + ? WHERE enforcer_id = ?`,
        [fineAmountNum, enforcerId]
      );
    }

    // Log action
    const enforcerNote = enforcerId ? ` by enforcer ${enforcerId}` : '';
    await logAction(req.user.user_id, 'CREATE_CITATION', `Created citation ticket: ${finalTicketNumber}${enforcerNote}`, citationId);

    res.status(201).json({
      message: 'Citation created successfully',
      citation_id: citationId,
      ticket_number: finalTicketNumber,
    });
  } catch (error) {
    console.error('Create citation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create citation' });
  }
});

// Update citation
router.put('/:id', async (req, res) => {
  try {
    const citationId = req.params.id;
    const {
      ticketNumber,
      driverName,
      driverAddress,
      driverContact,
      licenseNumber,
      licenseExpiry,
      vehicleType,
      vehicleColor,
      plateNumber,
      vehicleRegistration,
      vehicleOwner,
      ownerName,
      ownerAddress,
      ownerContact,
      violationLocation,
      violationTime,
      violationDate,
      remarks,
      paymentStatus,
      fineAmount,
      isCompleted,
      enforcerName,
      enforcerBadge,
      witnessName,
      supervisorName,
    } = req.body;

    const [citation] = await pool.execute(
      'SELECT * FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    let updateQuery = 'UPDATE citations SET ';
    const updateParams = [];
    const updateFields = [];

    // Build dynamic update query based on provided fields
    if (ticketNumber !== undefined) {
      updateFields.push('ticket_number = ?');
      updateParams.push(ticketNumber);
    }
    if (driverName !== undefined) {
      updateFields.push('driver_name = ?');
      updateParams.push(driverName);
    }
    if (driverAddress !== undefined) {
      updateFields.push('driver_address = ?');
      updateParams.push(driverAddress);
    }
    if (driverContact !== undefined) {
      updateFields.push('driver_contact = ?');
      updateParams.push(driverContact);
    }
    if (licenseNumber !== undefined) {
      updateFields.push('license_number = ?');
      updateParams.push(licenseNumber);
    }
    if (licenseExpiry !== undefined) {
      updateFields.push('license_expiry = ?');
      updateParams.push(licenseExpiry || null);
    }
    if (vehicleType !== undefined) {
      updateFields.push('vehicle_type = ?');
      updateParams.push(vehicleType);
    }
    if (vehicleColor !== undefined) {
      updateFields.push('vehicle_color = ?');
      updateParams.push(vehicleColor);
    }
    if (plateNumber !== undefined) {
      updateFields.push('plate_number = ?');
      updateParams.push(plateNumber);
    }
    if (vehicleRegistration !== undefined) {
      updateFields.push('vehicle_registration = ?');
      updateParams.push(vehicleRegistration);
    }
    if (vehicleOwner !== undefined) {
      updateFields.push('vehicle_owner = ?');
      updateParams.push(vehicleOwner);
    }
    if (ownerName !== undefined) {
      updateFields.push('owner_name = ?');
      updateParams.push(ownerName);
    }
    if (ownerAddress !== undefined) {
      updateFields.push('owner_address = ?');
      updateParams.push(ownerAddress);
    }
    if (ownerContact !== undefined) {
      updateFields.push('owner_contact = ?');
      updateParams.push(ownerContact);
    }
    if (violationLocation !== undefined) {
      updateFields.push('violation_location = ?');
      updateParams.push(violationLocation);
    }
    if (violationTime !== undefined) {
      updateFields.push('violation_time = ?');
      updateParams.push(violationTime || null);
    }
    if (violationDate !== undefined) {
      updateFields.push('violation_date = ?');
      updateParams.push(violationDate);
    }
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateParams.push(remarks);
    }
    if (paymentStatus !== undefined) {
      updateFields.push('payment_status = ?');
      updateParams.push(paymentStatus);
    }
    if (fineAmount !== undefined) {
      updateFields.push('fine_amount = ?');
      updateParams.push(fineAmount);
    }
    if (isCompleted !== undefined) {
      updateFields.push('is_completed = ?');
      updateParams.push(isCompleted);
    }
    if (enforcerName !== undefined) {
      updateFields.push('enforcer_name = ?');
      updateParams.push(enforcerName);
    }
    if (enforcerBadge !== undefined) {
      updateFields.push('enforcer_badge = ?');
      updateParams.push(enforcerBadge);
    }
    if (witnessName !== undefined) {
      updateFields.push('witness_name = ?');
      updateParams.push(witnessName);
    }
    if (supervisorName !== undefined) {
      updateFields.push('supervisor_name = ?');
      updateParams.push(supervisorName);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateQuery += updateFields.join(', ') + ', updated_at = NOW() WHERE citation_id = ?';
    updateParams.push(citationId);

    await pool.execute(updateQuery, updateParams);

    // Log action
    await logAction(req.user.user_id, 'UPDATE_CITATION', `Updated citation: ${citationId}`, citationId);

    res.json({ message: 'Citation updated successfully' });
  } catch (error) {
    console.error('Update citation error:', error);
    res.status(500).json({ error: 'Failed to update citation' });
  }
});

// Delete citation
router.delete('/:id', authorize(['Admin', 'SuperAdmin']), async (req, res) => {
  try {
    const citationId = req.params.id;

    const [citation] = await pool.execute(
      'SELECT * FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    // Delete associated payments first (cascade delete)
    await pool.execute('DELETE FROM citation_payments WHERE citation_id = ?', [citationId]);

    // Then delete the citation
    await pool.execute('DELETE FROM citations WHERE citation_id = ?', [citationId]);

    // Log action
    await logAction(req.user.user_id, 'DELETE_CITATION', `Deleted citation: ${citationId}`, citationId);

    res.json({ message: 'Citation deleted successfully' });
  } catch (error) {
    console.error('Delete citation error:', error);
    res.status(500).json({ error: 'Failed to delete citation' });
  }
});

// Record citation payment
router.post('/:id/payment', async (req, res) => {
  try {
    const citationId = req.params.id;
    const { amountPaid, paymentMethod, receiptNumber, notes, paymentDate } = req.body;

    const [citation] = await pool.execute(
      'SELECT * FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    const paymentId = generateId(ID_PREFIXES.CITATION_PAYMENT);

    // Use provided paymentDate or current timestamp
    const finalPaymentDate = paymentDate ? new Date(paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    await pool.execute(
      `INSERT INTO citation_payments (
        payment_id, citation_id, amount_paid, payment_method, receipt_number, notes, payment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, citationId, amountPaid, paymentMethod, receiptNumber || null, notes || null, finalPaymentDate]
    );

    // Check if fully paid
    const [payments] = await pool.execute(
      'SELECT SUM(amount_paid) as total_paid FROM citation_payments WHERE citation_id = ?',
      [citationId]
    );

    const totalPaid = payments[0].total_paid || 0;
    const newStatus = totalPaid >= citation[0].fine_amount ? 'Paid' : 'Partially Paid';

    await pool.execute(
      'UPDATE citations SET payment_status = ?, updated_at = NOW() WHERE citation_id = ?',
      [newStatus, citationId]
    );

    // Log action
    await logAction(req.user.user_id, 'RECORD_CITATION_PAYMENT', `Recorded payment for citation: ${citationId}`, citationId);

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment_id: paymentId,
      status: newStatus,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get audit trail for a citation
router.get('/:id/audit-trail', async (req, res) => {
  try {
    const citationId = req.params.id;

    // Verify citation exists
    const [citation] = await pool.execute(
      'SELECT * FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    // Get audit logs for this citation
    const [auditLogs] = await pool.execute(
      `SELECT 
        a.log_id, 
        a.user_id, 
        a.action, 
        a.details, 
        a.timestamp,
        u.full_name as user_name,
        u.username as user_email
      FROM audit_trail a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE a.application_id = ?
      ORDER BY a.timestamp DESC`,
      [citationId]
    );

    res.json({ data: auditLogs });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// ==================== eTracs Integration Endpoints ====================

// Verify driver with eTracs (check for possible duplicates)
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

// Link a citation to an eTracs entity
router.post('/:id/link-etracs-entity', async (req, res) => {
  try {
    const citationId = req.params.id;
    const { etracs_objid } = req.body;

    if (!etracs_objid) {
      return res.status(400).json({ error: 'eTracs entity ID (objid) is required' });
    }

    // Verify citation exists
    const [citation] = await pool.execute(
      'SELECT * FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    // Get eTracs entity details for validation
    const etracsEntity = await etracsService.getEntity(etracs_objid);

    // Update citation with eTracs link
    await pool.execute(
      'UPDATE citations SET etracs_objid = ? WHERE citation_id = ?',
      [etracs_objid, citationId]
    );

    await logAction(req.user.user_id, 'LINK_ETRACS_ENTITY', `Linked citation ${citationId} to eTracs entity ${etracs_objid}`);

    res.json({
      message: 'Citation linked to eTracs entity',
      citation_id: citationId,
      etracs_objid,
      etracs_entity_name: etracsEntity.name
    });
  } catch (error) {
    console.error('Link eTracs entity error:', error);
    if (error.status === 404) {
      return res.status(404).json({ error: 'eTracs entity not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to link eTracs entity' });
  }
});

// Get eTracs entity linked to a citation
router.get('/:id/etracs-entity', async (req, res) => {
  try {
    const citationId = req.params.id;

    const [citation] = await pool.execute(
      'SELECT etracs_objid FROM citations WHERE citation_id = ?',
      [citationId]
    );

    if (citation.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    if (!citation[0].etracs_objid) {
      return res.status(404).json({ error: 'Citation is not linked to an eTracs entity' });
    }

    const entity = await etracsService.getEntityWithIndividuals(citation[0].etracs_objid);

    res.json({
      source: 'eTracs',
      ...entity
    });
  } catch (error) {
    console.error('Get eTracs entity for citation error:', error);
    if (error.status === 404) {
      return res.status(404).json({ error: 'eTracs entity not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch eTracs entity' });
  }
});

// Search eTracs for entities (for driver lookup during citation creation)
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

module.exports = router;
