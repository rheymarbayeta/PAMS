const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { createNotification, notifyRole } = require('../utils/notificationService');
const { generatePermitPDF, generateAssessmentReportPDF, generateAssessmentReportHTML, getAssessmentData } = require('../utils/pdfGenerator');
const { generateApplicationNumber } = require('../utils/applicationNumberGenerator');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// View assessment report (HTML) - must be defined BEFORE global authenticate
// This route needs special handling because it's opened in a new window
router.get('/:id/assessment/html', async (req, res, next) => {
  // Check if token is in query parameter (for new window requests)
  const tokenFromQuery = req.query.token;
  
  if (tokenFromQuery) {
    // Temporarily set Authorization header for authentication middleware
    req.headers.authorization = `Bearer ${tokenFromQuery}`;
  }
  
  // Continue to authentication middleware
  next();
}, authenticate, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const printedBy = req.user ? req.user.full_name : 'System';
    
    // Get token from query parameter or Authorization header for passing to HTML
    const token = req.query.token || req.headers.authorization?.split(' ')[1] || '';

    const html = await generateAssessmentReportHTML(applicationId, printedBy, token);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Generate assessment report HTML error:', error);
    res.status(500).send(`<html><body><h1>Error</h1><p>${error.message || 'Error generating assessment report'}</p></body></html>`);
  }
});

// Print assessment report (PDF) - must be defined BEFORE global authenticate
// This route needs special handling because it's opened in a new window with token in query
router.get('/:id/assessment', async (req, res, next) => {
  // Check if token is in query parameter (for new window/download requests)
  const tokenFromQuery = req.query.token;
  
  if (tokenFromQuery) {
    // Temporarily set Authorization header for authentication middleware
    req.headers.authorization = `Bearer ${tokenFromQuery}`;
  }
  
  // Continue to authentication middleware
  next();
}, authenticate, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const printedBy = req.user ? req.user.full_name : 'System';

    console.log(`[PDF] Generating assessment PDF for application ${applicationId}, printed by: ${printedBy}`);
    
    const pdfBuffer = await generateAssessmentReportPDF(applicationId, printedBy);

    console.log(`[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="assessment-${applicationId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF] Generate assessment report error:', error);
    console.error('[PDF] Error stack:', error.stack);
    
    // If it's a PDF generation error, return a proper error response
    if (error.message) {
      return res.status(500).json({ 
        error: error.message || 'Error generating assessment report',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    res.status(500).json({ error: 'Error generating assessment report' });
  }
});

// All routes require authentication
router.use(authenticate);

// Get all applications (filtered by role)
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT 
        a.application_id,
        a.application_number,
        a.entity_id,
        a.creator_id,
        a.assessor_id,
        a.approver_id,
        a.permit_type,
        a.status,
        a.created_at,
        a.updated_at,
        e.entity_name,
        u1.full_name as creator_name,
        u2.full_name as assessor_name,
        u3.full_name as approver_name
      FROM applications a
      INNER JOIN entities e ON a.entity_id = e.entity_id
      INNER JOIN users u1 ON a.creator_id = u1.user_id
      LEFT JOIN users u2 ON a.assessor_id = u2.user_id
      LEFT JOIN users u3 ON a.approver_id = u3.user_id
    `;

    const conditions = [];
    const params = [];

    // Role-based filtering
    const roleName = req.user.role_name;
    if (roleName === 'Application Creator') {
      conditions.push('a.creator_id = ?');
      params.push(req.user.user_id);
    } else if (roleName === 'Assessor') {
      conditions.push('(a.status = ? OR a.assessor_id = ?)');
      params.push('Pending', req.user.user_id);
    } else if (roleName === 'Approver') {
      conditions.push('(a.status = ? OR a.approver_id = ?)');
      params.push('Pending Approval', req.user.user_id);
    }
    // SuperAdmin, Admin, Viewer can see all

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';

    const [applications] = await pool.execute(query, params);
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assessment record data (for HTML report)
router.get('/:id/assessment-record', async (req, res) => {
  try {
    const applicationId = req.params.id;

    const data = await getAssessmentData(applicationId);
    
    res.json({
      app_number: data.assessment.app_number,
      app_date: data.assessment.app_date,
      app_type: data.assessment.app_type,
      business_name: data.assessment.business_name,
      owner_name: data.assessment.owner_name,
      address: data.businessAddress,
      prepared_by_name: data.assessment.prepared_by_name,
      approved_by_name: data.assessment.approved_by_name,
      validity_date: data.validityDate, // Use calculated last weekday of month
      total_balance_due: data.assessment.total_balance_due,
      total_surcharge: data.assessment.total_surcharge,
      total_interest: data.assessment.total_interest,
      total_amount_due: data.assessment.total_amount_due,
      q1_amount: data.assessment.q1_amount,
      q2_amount: data.assessment.q2_amount,
      q3_amount: data.assessment.q3_amount,
      q4_amount: data.assessment.q4_amount,
      fees: data.assessmentFees
    });
  } catch (error) {
    console.error('Get assessment record error:', error);
    res.status(500).json({ error: error.message || 'Error retrieving assessment record' });
  }
});

// Print permit (PDF) - must come before /:id route
router.get('/:id/print', async (req, res) => {
  try {
    const applicationId = req.params.id;

    const pdfBuffer = await generatePermitPDF(applicationId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="permit-${applicationId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: error.message || 'Error generating PDF' });
  }
});

// Get single application with details
router.get('/:id', async (req, res) => {
  try {
    const applicationId = req.params.id;

    console.log('\n========== GET APPLICATION DETAIL ==========');
    console.log('[Applications] Fetching application:', applicationId);

    // Get application
    const [applications] = await pool.execute(
      `SELECT 
        a.*,
        a.application_number,
        e.entity_name,
        e.contact_person,
        e.email,
        e.phone,
        u1.full_name as creator_name,
        u2.full_name as assessor_name,
        u3.full_name as approver_name
       FROM applications a
       INNER JOIN entities e ON a.entity_id = e.entity_id
       INNER JOIN users u1 ON a.creator_id = u1.user_id
       LEFT JOIN users u2 ON a.assessor_id = u2.user_id
       LEFT JOIN users u3 ON a.approver_id = u3.user_id
       WHERE a.application_id = ?`,
      [applicationId]
    );

    if (applications.length === 0) {
      console.error('[Applications] ❌ Application not found:', applicationId);
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applications[0];

    console.log('[Applications] ✅ Application found:');
    console.log('  - application_id:', application.application_id);
    console.log('  - application_number:', application.application_number);
    console.log('  - permit_type:', application.permit_type);
    console.log('  - permit_type_id:', application.permit_type_id);
    console.log('  - entity_id:', application.entity_id);
    console.log('  - status:', application.status);

    // Get parameters
    const [parameters] = await pool.execute(
      'SELECT * FROM application_parameters WHERE application_id = ?',
      [applicationId]
    );

    console.log('[Applications] Parameters found:', parameters.length);

    // Get assessed fees
    const [assessedFees] = await pool.execute(
      `SELECT 
        af.assessed_fee_id,
        af.fee_id,
        af.assessed_amount,
        af.assessed_by_user_id,
        af.created_at,
        fc.fee_name,
        fc.default_amount,
        fcat.category_name,
        u.full_name as assessed_by_name
       FROM assessed_fees af
       INNER JOIN fees_charges fc ON af.fee_id = fc.fee_id
       INNER JOIN fees_categories fcat ON fc.category_id = fcat.category_id
       INNER JOIN users u ON af.assessed_by_user_id = u.user_id
       WHERE af.application_id = ?
       ORDER BY fcat.category_name, fc.fee_name`,
      [applicationId]
    );

    // Get audit trail
    const [auditTrail] = await pool.execute(
      `SELECT 
        at.*,
        u.full_name as user_name
       FROM audit_trail at
       INNER JOIN users u ON at.user_id = u.user_id
       WHERE at.application_id = ?
       ORDER BY at.timestamp DESC`,
      [applicationId]
    );

    console.log('[Applications] ✅ Sending response with:');
    console.log('  - application_id:', application.application_id);
    console.log('  - permit_type:', application.permit_type);
    console.log('  - permit_type_id:', application.permit_type_id);
    console.log('  - parameters count:', parameters.length);
    console.log('  - assessed_fees count:', assessedFees.length);
    console.log('  - audit_trail count:', auditTrail.length);
    console.log('==========================================\n');

    res.json({
      ...application,
      parameters,
      assessed_fees: assessedFees,
      audit_trail: auditTrail
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete application
// - SuperAdmin: Can delete any application
// - Admin, Application Creator: Can only delete applications with status 'Pending'
// - Viewer: Cannot delete
router.delete('/:id', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const applicationId = req.params.id;
    const userRole = req.user.role_name;

    // Get application details
    const [applications] = await connection.execute(
      'SELECT application_id, application_number, status FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applications[0];

    // Non-SuperAdmin users can only delete Pending applications
    if (userRole !== 'SuperAdmin' && application.status !== 'Pending') {
      await connection.rollback();
      return res.status(403).json({ error: 'You can only delete applications that are not yet assessed (Pending status)' });
    }

    // Delete related records in order (child tables first)
    // 1. Delete assessment_record_fees (child of assessment_records)
    await connection.execute(
      `DELETE arf FROM assessment_record_fees arf
       INNER JOIN assessment_records ar ON arf.assessment_id = ar.assessment_id
       WHERE ar.application_id = ?`,
      [applicationId]
    );
    
    // 2. Delete assessment_records
    await connection.execute(
      'DELETE FROM assessment_records WHERE application_id = ?',
      [applicationId]
    );
    
    // 3. Delete assessed_fees
    await connection.execute(
      'DELETE FROM assessed_fees WHERE application_id = ?',
      [applicationId]
    );
    
    // 4. Delete application_parameters
    await connection.execute(
      'DELETE FROM application_parameters WHERE application_id = ?',
      [applicationId]
    );
    
    // 5. Delete payments
    await connection.execute(
      'DELETE FROM payments WHERE application_id = ?',
      [applicationId]
    );
    
    // 6. Update audit_trail to set application_id to NULL (preserve audit history)
    await connection.execute(
      'UPDATE audit_trail SET application_id = NULL WHERE application_id = ?',
      [applicationId]
    );
    
    // 7. Finally delete the application itself
    await connection.execute(
      'DELETE FROM applications WHERE application_id = ?',
      [applicationId]
    );

    await connection.commit();

    console.log('\n========== DELETE APPLICATION LOGGING ==========');
    console.log('[DeleteApp] Step 1 - Application Data:');
    console.log('  - applicationId:', applicationId);
    console.log('  - application_number:', application.application_number);
    console.log('  - status:', application.status);
    console.log('  - user_id:', req.user.user_id);
    console.log('[DeleteApp] Step 2 - Deleted related records from:');
    console.log('  - Assessment_Record_Fees');
    console.log('  - Assessment_Records');
    console.log('  - Assessed_Fees');
    console.log('  - Application_Parameters');
    console.log('  - Payments');
    console.log('  - (Audit_Trail updated to NULL)');

    const deleteLogMessage = `Deleted application #${application.application_number || applicationId} (Status: ${application.status}) and all related records`;
    
    console.log('[DeleteApp] Step 3 - Final Log Message:');
    console.log('  - message:', deleteLogMessage);
    console.log('================================================\n');

    await logAction(
      req.user.user_id,
      'DELETE_APPLICATION',
      deleteLogMessage
    );

    res.json({ message: 'Application and all related records deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Create new application
router.post('/', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  try {
    const { entity_id, permit_type, rule_id, parameters } = req.body;

    if (!entity_id || !permit_type) {
      return res.status(400).json({ error: 'Entity ID and permit type are required' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate unique application number using the same connection/transaction
      // This ensures the FOR UPDATE lock works correctly for concurrent requests
      const applicationNumber = await generateApplicationNumber(connection);

      // Create application
      const application_id = generateId(ID_PREFIXES.APPLICATION);

      // Get permit_type_id from rule_id if provided, otherwise from permit_type name
      let permit_type_id = null;
      if (rule_id) {
        const [rules] = await connection.execute(
          'SELECT permit_type_id FROM assessment_rules WHERE rule_id = ? LIMIT 1',
          [rule_id]
        );
        permit_type_id = rules.length > 0 ? rules[0].permit_type_id : null;
      }
      
      if (!permit_type_id) {
        const [permitTypes] = await connection.execute(
          'SELECT permit_type_id FROM permit_types WHERE permit_type_name = ? LIMIT 1',
          [permit_type]
        );
        permit_type_id = permitTypes.length > 0 ? permitTypes[0].permit_type_id : null;
      }

      const [result] = await connection.execute(
        'INSERT INTO applications (application_id, application_number, entity_id, creator_id, permit_type, permit_type_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [application_id, applicationNumber, entity_id, req.user.user_id, permit_type, permit_type_id, 'Pending']
      );

      // Insert parameters
      if (parameters && Array.isArray(parameters)) {
        for (const param of parameters) {
          if (param.param_name && param.param_value !== undefined) {
            const param_id = generateId(ID_PREFIXES.PARAMETER);
            await connection.execute(
              'INSERT INTO application_parameters (parameter_id, application_id, param_name, param_value) VALUES (?, ?, ?, ?)',
              [param_id, application_id, param.param_name, param.param_value]
            );
          }
        }
      }

      await connection.commit();

      console.log('\n========== CREATE APPLICATION LOGGING ==========');
      console.log('[CreateApp] Step 1 - Generated Data:');
      console.log('  - application_id:', application_id);
      console.log('  - applicationNumber:', applicationNumber);
      console.log('  - entity_id:', entity_id);
      console.log('  - permit_type:', permit_type);
      console.log('  - permit_type_id:', permit_type_id);
      console.log('  - creator_id:', req.user.user_id);

      // Log and notify
      const createLogMessage = `Created application #${applicationNumber} for permit type: ${permit_type}`;
      
      console.log('[CreateApp] Step 2 - Final Log Message:');
      console.log('  - message:', createLogMessage);
      console.log('===============================================\n');

      await logAction(
        req.user.user_id,
        'CREATE_APP',
        createLogMessage,
        application_id
      );

      await notifyRole(
        'Assessor',
        `New application ${applicationNumber} requires assessment`,
        `/applications/${application_id}`
      );

      res.status(201).json({
        application_id,
        application_number: applicationNumber,
        message: 'Application created successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add assessed fee
router.post('/:id/fees', authorize('SuperAdmin', 'Admin', 'Assessor'), async (req, res) => {
  try {
    const { fee_id, assessed_amount, unit_amount, quantity } = req.body;
    const applicationId = req.params.id;

    if (!fee_id || assessed_amount === undefined) {
      return res.status(400).json({ error: 'Fee ID and assessed amount are required' });
    }

    // Check application status
    const [apps] = await pool.execute(
      'SELECT status FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending' && apps[0].status !== 'Assessed') {
      return res.status(400).json({ error: 'Cannot add fees to application in current status' });
    }

    const assessed_fee_id = generateId(ID_PREFIXES.ASSESSED_FEE);
    
    // Store quantity and unit_amount if provided
    const feeQuantity = parseInt(quantity) || 1;
    const feeUnitAmount = parseFloat(unit_amount) || parseFloat(assessed_amount);

    const [result] = await pool.execute(
      'INSERT INTO assessed_fees (assessed_fee_id, application_id, fee_id, assessed_amount, unit_amount, quantity, assessed_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [assessed_fee_id, applicationId, fee_id, parseFloat(assessed_amount), feeUnitAmount, feeQuantity, req.user.user_id]
    );

    console.log('\n========== ADD FEE LOGGING ==========');
    console.log('[AddFee] Step 1 - Input Parameters:');
    console.log('  - fee_id:', fee_id);
    console.log('  - assessed_amount:', assessed_amount);
    console.log('  - unit_amount:', feeUnitAmount);
    console.log('  - quantity:', feeQuantity);
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get fee name for logging
    const [feeInfo] = await pool.execute(
      'SELECT fee_name FROM fees_charges WHERE fee_id = ?',
      [fee_id]
    );
    const feeName = feeInfo.length > 0 ? feeInfo[0].fee_name : 'Unknown Fee';
    
    console.log('[AddFee] Step 2 - Fee Query Result:');
    console.log('  - feeInfo query result:', feeInfo);
    console.log('  - feeName:', feeName);

    // Get application number for logging
    const [appInfo] = await pool.execute(
      'SELECT application_number FROM applications WHERE application_id = ?',
      [applicationId]
    );
    const appNumber = appInfo.length > 0 ? appInfo[0].application_number : applicationId;
    
    console.log('[AddFee] Step 3 - Application Query Result:');
    console.log('  - appInfo query result:', appInfo);
    console.log('  - appNumber:', appNumber);

    const logMessage = `Added fee "${feeName}" with amount ₱${assessed_amount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} to application #${appNumber}`;
    
    console.log('[AddFee] Step 4 - Final Log Message:');
    console.log('  - message:', logMessage);
    console.log('=====================================\n');

    await logAction(
      req.user.user_id,
      'ADD_FEE',
      logMessage,
      applicationId
    );

    res.status(201).json({
      assessed_fee_id,
      message: 'Fee added successfully'
    });
  } catch (error) {
    console.error('Add fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assessed fee
router.delete('/:id/fees/:feeId', authorize('SuperAdmin', 'Admin', 'Assessor'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const feeId = req.params.feeId;

    // Check application status
    const [apps] = await pool.execute(
      'SELECT status FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending' && apps[0].status !== 'Assessed') {
      return res.status(400).json({ error: 'Cannot remove fees from application in current status' });
    }

    await pool.execute(
      'DELETE FROM Assessed_Fees WHERE assessed_fee_id = ? AND application_id = ?',
      [feeId, applicationId]
    );

    console.log('\n========== REMOVE FEE LOGGING ==========');
    console.log('[RemoveFee] Step 1 - Input Parameters:');
    console.log('  - feeId:', feeId);
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get fee name for logging
    const [removeFeeInfo] = await pool.execute(
      'SELECT fc.fee_name FROM Assessed_Fees af INNER JOIN Fees_Charges fc ON af.fee_id = fc.fee_id WHERE af.assessed_fee_id = ?',
      [feeId]
    );
    const removedFeeName = removeFeeInfo.length > 0 ? removeFeeInfo[0].fee_name : 'Unknown Fee';
    
    console.log('[RemoveFee] Step 2 - Fee Query Result:');
    console.log('  - removeFeeInfo query result:', removeFeeInfo);
    console.log('  - removedFeeName:', removedFeeName);

    // Get application number for logging
    const [removeAppInfo] = await pool.execute(
      'SELECT application_number FROM Applications WHERE application_id = ?',
      [applicationId]
    );
    const removeAppNumber = removeAppInfo.length > 0 ? removeAppInfo[0].application_number : applicationId;

    console.log('[RemoveFee] Step 3 - Application Query Result:');
    console.log('  - removeAppInfo query result:', removeAppInfo);
    console.log('  - removeAppNumber:', removeAppNumber);

    const removeLogMessage = `Removed fee "${removedFeeName}" from application #${removeAppNumber}`;
    
    console.log('[RemoveFee] Step 4 - Final Log Message:');
    console.log('  - message:', removeLogMessage);
    console.log('=========================================\n');

    await logAction(
      req.user.user_id,
      'REMOVE_FEE',
      removeLogMessage,
      applicationId
    );

    res.json({ message: 'Fee removed successfully' });
  } catch (error) {
    console.error('Remove fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assessed fee (for re-assessment by approver)
router.put('/:id/fees/:feeId', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const { assessed_amount } = req.body;
    const applicationId = req.params.id;
    const feeId = req.params.feeId;

    if (assessed_amount === undefined) {
      return res.status(400).json({ error: 'Assessed amount is required' });
    }

    // Get old amount for audit
    const [oldFee] = await pool.execute(
      'SELECT assessed_amount FROM Assessed_Fees WHERE assessed_fee_id = ?',
      [feeId]
    );

    if (oldFee.length === 0) {
      return res.status(404).json({ error: 'Assessed fee not found' });
    }

    const oldAmount = oldFee[0].assessed_amount;

    await pool.execute(
      'UPDATE Assessed_Fees SET assessed_amount = ?, assessed_by_user_id = ? WHERE assessed_fee_id = ?',
      [parseFloat(assessed_amount), req.user.user_id, feeId]
    );

    await logAction(
      req.user.user_id,
      'REASSESS_FEE',
      `Re-assessed fee ID ${feeId} from ${oldAmount} to ${assessed_amount} for application #${applicationId}`,
      applicationId
    );

    res.json({ message: 'Fee updated successfully' });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit assessment
router.put('/:id/assess', authorize('SuperAdmin', 'Admin', 'Assessor'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const applicationId = req.params.id;

    // Check application status and get full details
    const [apps] = await connection.execute(
      `SELECT 
        a.*,
        a.application_number,
        e.entity_name,
        e.contact_person,
        e.email,
        e.phone
       FROM Applications a
       INNER JOIN Entities e ON a.entity_id = e.entity_id
       WHERE a.application_id = ?`,
      [applicationId]
    );

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending' && apps[0].status !== 'Assessed') {
      await connection.rollback();
      return res.status(400).json({ error: 'Application is not in a state that can be assessed' });
    }

    const app = apps[0];

    // Get assessed fees
    const [assessedFees] = await connection.execute(
      `SELECT 
        af.assessed_fee_id,
        af.fee_id,
        af.assessed_amount,
        af.unit_amount,
        af.quantity,
        fc.fee_name,
        fcat.category_name
       FROM Assessed_Fees af
       INNER JOIN Fees_Charges fc ON af.fee_id = fc.fee_id
       INNER JOIN Fees_Categories fcat ON fc.category_id = fcat.category_id
       WHERE af.application_id = ?
       ORDER BY fc.fee_name`,
      [applicationId]
    );

    if (assessedFees.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No fees assessed for this application' });
    }

    // Get address from parameters
    const [parameters] = await connection.execute(
      'SELECT * FROM Application_Parameters WHERE application_id = ?',
      [applicationId]
    );
    const addressParam = parameters.find(p => 
      p.param_name.toLowerCase().includes('address') || 
      p.param_name.toLowerCase() === 'address'
    );
    const address = addressParam ? addressParam.param_value : '';

    // Calculate totals
    let totalBalanceDue = 0;
    let totalSurcharge = 0;
    let totalInterest = 0;
    let totalAmountDue = 0;

    assessedFees.forEach(fee => {
      const amount = parseFloat(fee.assessed_amount) || 0;
      // assessed_amount already includes quantity, no need to multiply
      const balanceDue = amount;
      const surcharge = 0; // Default surcharge
      const interest = 0; // Default interest
      const total = balanceDue + surcharge + interest;

      totalBalanceDue += balanceDue;
      totalSurcharge += surcharge;
      totalInterest += interest;
      totalAmountDue += total;
    });

    // Determine app type
    const appType = app.permit_type && app.permit_type.toLowerCase().includes('renew') ? 'RENEW' : 'NEW';
    const appDate = new Date(app.created_at);
    
    // Calculate validity date (end of next month)
    const validityDate = new Date();
    validityDate.setMonth(validityDate.getMonth() + 1);
    validityDate.setDate(0); // Last day of next month

    // Calculate quarterly amounts (default: divide by 4, can be customized later)
    // For now, Q1 is 0, and the rest is divided among Q2, Q3, Q4
    const q1Amount = 0;
    const remainingAmount = totalAmountDue;
    const q2Amount = remainingAmount * 0.38; // ~38% for Q2
    const q3Amount = remainingAmount * 0.36; // ~36% for Q3
    const q4Amount = remainingAmount * 0.26; // ~26% for Q4

    // Create or update assessment record
    const [existingRecords] = await connection.execute(
      'SELECT assessment_id FROM Assessment_Records WHERE application_id = ?',
      [applicationId]
    );

    let assessmentId;
    if (existingRecords.length > 0) {
      assessmentId = existingRecords[0].assessment_id;
      // Update existing record
      await connection.execute(
        `UPDATE Assessment_Records SET
          business_name = ?,
          owner_name = ?,
          address = ?,
          app_number = ?,
          app_type = ?,
          app_date = ?,
          validity_date = ?,
          total_balance_due = ?,
          total_surcharge = ?,
          total_interest = ?,
          total_amount_due = ?,
          q1_amount = ?,
          q2_amount = ?,
          q3_amount = ?,
          q4_amount = ?,
          prepared_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE assessment_id = ?`,
        [
          app.entity_name,
          app.contact_person || app.entity_name,
          address,
          app.application_number || `#${applicationId}`,
          appType,
          appDate,
          validityDate,
          totalBalanceDue,
          totalSurcharge,
          totalInterest,
          totalAmountDue,
          q1Amount,
          q2Amount,
          q3Amount,
          q4Amount,
          req.user.user_id,
          assessmentId
        ]
      );
      // Delete existing fees
      await connection.execute(
        'DELETE FROM Assessment_Record_Fees WHERE assessment_id = ?',
        [assessmentId]
      );
    } else {
      // Create new record
      const assessment_id = generateId(ID_PREFIXES.ASSESSMENT_RECORD);

      const [result] = await connection.execute(
        `INSERT INTO Assessment_Records (
          assessment_id, application_id, business_name, owner_name, address, app_number, app_type, app_date,
          validity_date, total_balance_due, total_surcharge, total_interest, total_amount_due,
          q1_amount, q2_amount, q3_amount, q4_amount, prepared_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assessment_id,
          applicationId,
          app.entity_name,
          app.contact_person || app.entity_name,
          address,
          app.application_number || `#${applicationId}`,
          appType,
          appDate,
          validityDate,
          totalBalanceDue,
          totalSurcharge,
          totalInterest,
          totalAmountDue,
          q1Amount,
          q2Amount,
          q3Amount,
          q4Amount,
          req.user.user_id
        ]
      );
      assessmentId = assessment_id;
    }

    // Insert assessment record fees
    for (const fee of assessedFees) {
      const amount = parseFloat(fee.assessed_amount) || 0;
      // Use stored quantity from Assessed_Fees, default to 1 if not available
      const quantity = parseInt(fee.quantity) || 1;
      const balanceDue = amount;  // assessed_amount already includes quantity
      const surcharge = 0;
      const interest = 0;
      const total = balanceDue + surcharge + interest;

      const record_fee_id = generateId(ID_PREFIXES.ASSESSMENT_RECORD_FEE);

      await connection.execute(
        `INSERT INTO Assessment_Record_Fees (
          record_fee_id, assessment_id, fee_id, fee_name, amount, quantity, balance_due,
          surcharge, interest, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record_fee_id,
          assessmentId,
          fee.fee_id,
          fee.fee_name,
          amount,
          quantity,
          balanceDue,
          surcharge,
          interest,
          total
        ]
      );
    }

    // Update application status
    await connection.execute(
      'UPDATE Applications SET status = ?, assessor_id = ? WHERE application_id = ?',
      ['Pending Approval', req.user.user_id, applicationId]
    );

    await connection.commit();

    console.log('\n========== SUBMIT ASSESSMENT LOGGING ==========');
    console.log('[SubmitAssessment] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get application number for logging
    const [assessAppInfo] = await pool.execute(
      'SELECT application_number FROM Applications WHERE application_id = ?',
      [applicationId]
    );
    const assessAppNumber = assessAppInfo.length > 0 ? assessAppInfo[0].application_number : applicationId;

    console.log('[SubmitAssessment] Step 2 - Application Query Result:');
    console.log('  - assessAppInfo query result:', assessAppInfo);
    console.log('  - assessAppNumber:', assessAppNumber);

    const assessLogMessage = `Submitted assessment for application #${assessAppNumber}`;
    
    console.log('[SubmitAssessment] Step 3 - Final Log Message:');
    console.log('  - message:', assessLogMessage);
    console.log('==============================================\n');

    await logAction(
      req.user.user_id,
      'SUBMIT_ASSESSMENT',
      assessLogMessage,
      applicationId
    );

    await notifyRole(
      'Approver',
      `Application #${applicationId} is pending approval`,
      `/applications/${applicationId}`
    );

    res.json({ message: 'Assessment submitted successfully', assessment_id: assessmentId });
  } catch (error) {
    await connection.rollback();
    console.error('Submit assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Approve application
router.put('/:id/approve', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const applicationId = req.params.id;

    // Check application status
    const [apps] = await pool.execute(
      'SELECT status, creator_id FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }

    // Update application
    await pool.execute(
      'UPDATE Applications SET status = ?, approver_id = ? WHERE application_id = ?',
      ['Approved', req.user.user_id, applicationId]
    );

    // Update assessment record with approver
    await pool.execute(
      'UPDATE Assessment_Records SET approved_by_user_id = ? WHERE application_id = ?',
      [req.user.user_id, applicationId]
    );

    console.log('\n========== APPROVE APPLICATION LOGGING ==========');
    console.log('[ApproveApp] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get application number for logging
    const [approveAppInfo] = await pool.execute(
      'SELECT application_number FROM Applications WHERE application_id = ?',
      [applicationId]
    );
    const approveAppNumber = approveAppInfo.length > 0 ? approveAppInfo[0].application_number : applicationId;

    console.log('[ApproveApp] Step 2 - Application Query Result:');
    console.log('  - approveAppInfo query result:', approveAppInfo);
    console.log('  - approveAppNumber:', approveAppNumber);

    const approveLogMessage = `Approved application #${approveAppNumber}`;
    
    console.log('[ApproveApp] Step 3 - Final Log Message:');
    console.log('  - message:', approveLogMessage);
    console.log('=================================================\n');

    await logAction(
      req.user.user_id,
      'APPROVE_APP',
      approveLogMessage,
      applicationId
    );

    // Notify creator
    await createNotification(
      apps[0].creator_id,
      `Application #${applicationId} has been approved`,
      `/applications/${applicationId}`
    );

    res.json({ message: 'Application approved successfully' });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Renew application (clone)
router.post('/:id/renew', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  try {
    const applicationId = req.params.id;

    // Get original application
    const [apps] = await pool.execute(
      'SELECT * FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const originalApp = apps[0];

    // Check if user can renew (must be creator or admin)
    if (originalApp.creator_id !== req.user.user_id && 
        !['SuperAdmin', 'Admin'].includes(req.user.role_name)) {
      return res.status(403).json({ error: 'You can only renew your own applications' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate unique application number for renewal using the same connection
      const applicationNumber = await generateApplicationNumber(connection);

      // Create new application
      const new_application_id = generateId(ID_PREFIXES.APPLICATION);

      const [result] = await connection.execute(
        'INSERT INTO Applications (application_id, application_number, entity_id, creator_id, permit_type, permit_type_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [new_application_id, applicationNumber, originalApp.entity_id, req.user.user_id, originalApp.permit_type, originalApp.permit_type_id, 'Pending']
      );

      // Copy parameters
      const [parameters] = await connection.execute(
        'SELECT param_name, param_value FROM Application_Parameters WHERE application_id = ?',
        [applicationId]
      );

      for (const param of parameters) {
        const parameter_id = generateId(ID_PREFIXES.APPLICATION_PARAMETER);
        await connection.execute(
          'INSERT INTO Application_Parameters (parameter_id, application_id, param_name, param_value) VALUES (?, ?, ?, ?)',
          [parameter_id, new_application_id, param.param_name, param.param_value]
        );
      }

      await connection.commit();

      console.log('\n========== RENEW APPLICATION LOGGING ==========');
      console.log('[RenewApp] Step 1 - Input Parameters:');
      console.log('  - oldApplicationId:', applicationId);
      console.log('  - newApplicationId:', new_application_id);
      console.log('  - user_id:', req.user.user_id);

      // Get old and new application numbers for logging
      const [oldAppInfo] = await pool.execute(
        'SELECT application_number FROM Applications WHERE application_id = ?',
        [applicationId]
      );
      const oldAppNumber = oldAppInfo.length > 0 ? oldAppInfo[0].application_number : applicationId;

      console.log('[RenewApp] Step 2 - Old Application Query Result:');
      console.log('  - oldAppInfo query result:', oldAppInfo);
      console.log('  - oldAppNumber:', oldAppNumber);

      const [newAppInfo] = await pool.execute(
        'SELECT application_number FROM Applications WHERE application_id = ?',
        [new_application_id]
      );
      const newAppNumber = newAppInfo.length > 0 ? newAppInfo[0].application_number : new_application_id;

      console.log('[RenewApp] Step 3 - New Application Query Result:');
      console.log('  - newAppInfo query result:', newAppInfo);
      console.log('  - newAppNumber:', newAppNumber);

      const renewLogMessage = `Renewed application #${oldAppNumber} as application #${newAppNumber}`;
      
      console.log('[RenewApp] Step 4 - Final Log Message:');
      console.log('  - message:', renewLogMessage);
      console.log('==============================================\n');

      await logAction(
        req.user.user_id,
        'RENEW_APP',
        renewLogMessage,
        new_application_id
      );

      await notifyRole(
        'Assessor',
        `New application #${new_application_id} requires assessment (renewal)`,
        `/applications/${new_application_id}`
      );

      res.status(201).json({
        application_id: new_application_id,
        message: 'Application renewed successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Renew application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject application
router.put('/:id/reject', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { reason } = req.body;

    // Check application status
    const [apps] = await pool.execute(
      'SELECT status, creator_id FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }

    // Update application
    await pool.execute(
      'UPDATE Applications SET status = ?, approver_id = ? WHERE application_id = ?',
      ['Rejected', req.user.user_id, applicationId]
    );

    console.log('\n========== REJECT APPLICATION LOGGING ==========');
    console.log('[RejectApp] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - reason:', reason);
    console.log('  - user_id:', req.user.user_id);

    // Get application number for logging
    const [rejectAppInfo] = await pool.execute(
      'SELECT application_number FROM Applications WHERE application_id = ?',
      [applicationId]
    );
    const rejectAppNumber = rejectAppInfo.length > 0 ? rejectAppInfo[0].application_number : applicationId;

    console.log('[RejectApp] Step 2 - Application Query Result:');
    console.log('  - rejectAppInfo query result:', rejectAppInfo);
    console.log('  - rejectAppNumber:', rejectAppNumber);

    const rejectLogMessage = `Rejected application #${rejectAppNumber}${reason ? ': ' + reason : ''}`;
    
    console.log('[RejectApp] Step 3 - Final Log Message:');
    console.log('  - message:', rejectLogMessage);
    console.log('=================================================\n');

    await logAction(
      req.user.user_id,
      'REJECT_APP',
      rejectLogMessage,
      applicationId
    );

    // Notify creator
    await createNotification(
      apps[0].creator_id,
      `Application #${applicationId} has been rejected${reason ? ': ' + reason : ''}`,
      `/applications/${applicationId}`
    );

    res.json({ message: 'Application rejected successfully' });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment for an application
router.post('/:id/payment', async (req, res) => {
  try {
    console.log('[Payment] Recording payment for application:', req.params.id);
    console.log('[Payment] User:', req.user);
    console.log('[Payment] Body:', req.body);
    
    const applicationId = req.params.id;
    const { official_receipt_no, payment_date, address, amount } = req.body;

    // Validate required fields
    if (!official_receipt_no || !payment_date || !amount) {
      console.log('[Payment] Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: official_receipt_no, payment_date, amount' 
      });
    }

    // Check if application exists
    const [apps] = await pool.execute(
      'SELECT * FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      console.log('[Payment] Application not found:', applicationId);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if application is approved
    if (apps[0].status !== 'Approved') {
      console.log('[Payment] Application not approved:', apps[0].status);
      return res.status(400).json({ 
        error: 'Payment can only be recorded for approved applications' 
      });
    }

    // Insert payment record
    console.log('[Payment] Inserting payment record...');
    const payment_id = generateId(ID_PREFIXES.PAYMENT);
    const [result] = await pool.execute(
      `INSERT INTO Payments 
       (payment_id, application_id, official_receipt_no, payment_date, address, amount, recorded_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [payment_id, applicationId, official_receipt_no, payment_date, address || null, amount, req.user.user_id]
    );

    console.log('[Payment] Payment recorded successfully with ID:', payment_id);

    // Check total payments vs total amount due
    const [assessmentRecord] = await pool.execute(
      'SELECT total_amount_due FROM Assessment_Records WHERE application_id = ?',
      [applicationId]
    );

    if (assessmentRecord.length > 0) {
      const totalAmountDue = parseFloat(assessmentRecord[0].total_amount_due) || 0;
      
      // Get total payments
      const [payments] = await pool.execute(
        'SELECT SUM(amount) as total_paid FROM Payments WHERE application_id = ?',
        [applicationId]
      );

      const totalPaid = parseFloat(payments[0]?.total_paid) || 0;

      console.log(`[Payment] Total amount due: ₱${totalAmountDue}, Total paid: ₱${totalPaid}`);

      // If fully paid, update application status to "Paid"
      if (totalPaid >= totalAmountDue && totalAmountDue > 0) {
        console.log(`[Payment] Application ${applicationId} is fully paid. Updating status to "Paid"`);
        await pool.execute(
          'UPDATE Applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?',
          ['Paid', applicationId]
        );
      }
    }

    // Log action with error handling
    try {
      await logAction(
        req.user.user_id,
        'RECORD_PAYMENT',
        `Recorded payment for application #${applicationId}: Receipt #${official_receipt_no}, Amount: ₱${amount}`,
        applicationId
      );
    } catch (logError) {
      console.warn('[Payment] Warning: Could not log action:', logError);
      // Don't fail the payment if logging fails
    }

    res.json({ 
      message: 'Payment recorded successfully',
      payment_id: result.insertId 
    });
  } catch (error) {
    console.error('[Payment] Record payment error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('[Payment] Duplicate entry error for receipt number');
      return res.status(400).json({ 
        error: 'This official receipt number has already been recorded for this application' 
      });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get payment information for an application
router.get('/:id/payment', async (req, res) => {
  try {
    console.log('[Payment] Fetching payments for application:', req.params.id);
    const applicationId = req.params.id;

    const [payments] = await pool.execute(
      `SELECT 
        p.*,
        u.full_name as recorded_by_name
       FROM Payments p
       LEFT JOIN Users u ON p.recorded_by_user_id = u.user_id
       WHERE p.application_id = ?
       ORDER BY p.created_at DESC`,
      [applicationId]
    );

    console.log('[Payment] Found payments:', payments.length);
    res.json(payments);
  } catch (error) {
    console.error('[Payment] Get payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Issue permit - changes status from Paid to Issued
router.put('/:id/issue', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const applicationId = req.params.id;

    // Check current status and get permit type info for validity
    const [apps] = await pool.execute(
      `SELECT a.status, a.application_number, a.permit_type_id, a.permit_type,
              pt.validity_date as permit_type_validity_date,
              pt.validity_type as permit_type_validity_type
       FROM Applications a
       LEFT JOIN Permit_Types pt ON a.permit_type_id = pt.permit_type_id
       WHERE a.application_id = ?`,
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Paid') {
      return res.status(400).json({ error: 'Permit can only be issued for paid applications' });
    }

    // Determine validity date based on validity_type
    let validityDate = null;
    let validityMsg = 'No validity date set';
    
    if (apps[0].permit_type_validity_type === 'custom') {
      // For custom validity, look for "Date" parameter in application_parameters
      const [dateParams] = await pool.execute(
        `SELECT param_value FROM application_parameters 
         WHERE application_id = ? AND param_name = 'Date'
         LIMIT 1`,
        [applicationId]
      );
      
      if (dateParams.length > 0 && dateParams[0].param_value) {
        // Store the custom date string as-is (e.g., "December 3 to 8, 2025")
        validityDate = dateParams[0].param_value;
        validityMsg = `Custom validity: ${validityDate}`;
      } else {
        validityMsg = 'Custom validity (no Date parameter found)';
      }
    } else {
      // For fixed validity, use the permit_type_validity_date
      validityDate = apps[0].permit_type_validity_date || null;
      if (validityDate) {
        validityDate = new Date(validityDate).toISOString().split('T')[0];
        validityMsg = `Valid until ${validityDate}`;
      }
    }
    
    // Update status to Issued with validity_date
    // Note: For custom validity, we store the text as-is; for fixed, it's a date
    await pool.execute(
      `UPDATE Applications 
       SET status = ?, 
           issued_by_user_id = ?, 
           issued_at = CURRENT_TIMESTAMP, 
           validity_date = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE application_id = ?`,
      ['Issued', req.user.user_id, validityDate, applicationId]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'ISSUE_PERMIT',
      `Issued permit for application ${apps[0].application_number || applicationId} (${validityMsg})`,
      applicationId
    );

    res.json({ message: 'Permit issued successfully', validity_date: validityDate, validity_type: apps[0].permit_type_validity_type || 'fixed' });
  } catch (error) {
    console.error('Issue permit error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Release permit - changes status from Issued to Released
router.put('/:id/release', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { released_by, received_by } = req.body;

    if (!released_by || !received_by) {
      return res.status(400).json({ error: 'Released by and Received by are required' });
    }

    // Check current status
    const [apps] = await pool.execute(
      'SELECT status, application_number FROM Applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Issued') {
      return res.status(400).json({ error: 'Permit can only be released for issued applications' });
    }

    // Update status to Released
    await pool.execute(
      'UPDATE Applications SET status = ?, released_by = ?, received_by = ?, released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?',
      ['Released', released_by, received_by, applicationId]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'RELEASE_PERMIT',
      `Released permit for application ${apps[0].application_number || applicationId}. Released by: ${released_by}, Received by: ${received_by}`,
      applicationId
    );

    res.json({ message: 'Permit released successfully' });
  } catch (error) {
    console.error('Release permit error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

