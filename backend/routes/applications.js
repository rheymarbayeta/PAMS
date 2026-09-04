const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { createNotification, notifyRole } = require('../utils/notificationService');
const { generatePermitPDF, generateAssessmentReportPDF, generateAssessmentReportHTML, getAssessmentData } = require('../utils/pdfGenerator');
const { generateApplicationNumber } = require('../utils/applicationNumberGenerator');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { generatePermitNumber, generatePermitNumberForRenewal } = require('../utils/permitNumberGenerator');
const applicationsService = require('../modules/permits/applicationsService');
const { paginated, fail } = require('../utils/apiResponse');
const { requirePermission } = require('../middleware/auth');
const { assertPermitTransition } = require('../utils/stateMachines');
const { startApprovalChain, approveCurrentStep, rejectCurrentStep } = require('../utils/approvalEngine');
const { countDaysFromParameters } = require('../utils/permittedDatesQuantity');

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

// Get all applications (filtered by role, paginated) — permits service/repository pilot
router.get('/', requirePermission('applications', 'create_applications', 'assess_fees', 'approve_applications'), async (req, res) => {
  try {
    const result = await applicationsService.listForUser(req.user, req.query);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    console.error('Get applications error:', error);
    return fail(res, 500, 'Internal server error');
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

    // Get application with assessment rule and attribute details
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
        u3.full_name as approver_name,
        ar.rule_id,
        ar.attribute_id,
        att.attribute_name
       FROM applications a
       INNER JOIN entities e ON a.entity_id = e.entity_id
       INNER JOIN users u1 ON a.creator_id = u1.user_id
       LEFT JOIN users u2 ON a.assessor_id = u2.user_id
       LEFT JOIN users u3 ON a.approver_id = u3.user_id
       LEFT JOIN assessment_rules ar ON a.rule_id = ar.rule_id
       LEFT JOIN attributes att ON ar.attribute_id = att.attribute_id
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
    console.log('  - rule_id:', application.rule_id);
    console.log('  - attribute_id:', application.attribute_id);
    console.log('  - attribute_name:', application.attribute_name);
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
        af.unit_amount,
        af.quantity,
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

    // Get audit trail — check both application_id (FK column) and resource_id
    // (used when application_id FK check was bypassed for non-app IDs)
    const [auditTrail] = await pool.execute(
      `SELECT 
        at.*,
        u.full_name as user_name
       FROM audit_trail at
       INNER JOIN users u ON at.user_id = u.user_id
       WHERE at.application_id = ? OR at.resource_id = ?
       ORDER BY at.timestamp DESC`,
      [applicationId, applicationId]
    );

    console.log('[Applications] ✅ Sending response with:');
    console.log('  - application_id:', application.application_id);
    console.log('  - permit_type:', application.permit_type);
    console.log('  - permit_type_id:', application.permit_type_id);
    console.log('  - rule_id:', application.rule_id);
    console.log('  - attribute_name:', application.attribute_name);
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
// - SuperAdmin: Can delete applications with any status
// - Admin, Application Creator: Can only delete applications with status 'Pending'
// - Viewer: Cannot delete
router.delete('/:id', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const applicationId = req.params.id;
    const userRoles = req.user.roles || [];
    const isSuperAdmin = userRoles.includes('SuperAdmin');

    // Get application details
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applications[0];

    // SuperAdmin can delete any application regardless of status
    // Non-SuperAdmin users can only delete Pending applications
    if (!isSuperAdmin && application.status !== 'Pending') {
      await connection.rollback();
      return res.status(403).json({ error: 'You can only delete applications with Pending status. SuperAdmin can delete applications in any status.' });
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

      // Parse and validate validity_date from "Valid Until" parameter
      let validity_date = null;
      if (parameters && Array.isArray(parameters)) {
        const validUntilParam = parameters.find(p => p.param_name === 'Valid Until' && p.param_value);
        if (validUntilParam && validUntilParam.param_value) {
          const dateValue = validUntilParam.param_value.trim();
          // Try to parse the date in MM-DD-YYYY format
          const dateMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (dateMatch) {
            // Convert to YYYY-MM-DD format for MySQL
            validity_date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
          } else {
            // Try to parse as a general date string
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              const year = parsedDate.getFullYear();
              const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const day = String(parsedDate.getDate()).padStart(2, '0');
              validity_date = `${year}-${month}-${day}`;
            }
          }
        }
      }

      const [result] = await connection.execute(
        'INSERT INTO applications (application_id, application_number, entity_id, creator_id, permit_type, permit_type_id, rule_id, status, validity_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [application_id, applicationNumber, entity_id, req.user.user_id, permit_type, permit_type_id, rule_id || null, 'Pending', validity_date]
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
      console.log('  - rule_id:', rule_id);
      console.log('  - creator_id:', req.user.user_id);

      // Get entity name for logging
      const [entityInfo] = await connection.execute(
        'SELECT entity_name FROM entities WHERE entity_id = ?',
        [entity_id]
      );
      const entityName = entityInfo.length > 0 ? entityInfo[0].entity_name : 'Unknown';

      // Log and notify
      const createLogMessage = `Created application #${applicationNumber} (${entityName}) for permit type: ${permit_type}`;
      
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
        `New application #${applicationNumber} (${entityName}) requires assessment`,
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

/** Parse "Valid Until" (MM-DD-YYYY or Date-parseable) → YYYY-MM-DD for MySQL. */
function parseValidityDateFromParameters(parameters) {
  if (!Array.isArray(parameters)) return null;
  const validUntilParam = parameters.find((p) => p.param_name === 'Valid Until' && p.param_value);
  if (!validUntilParam?.param_value) return null;
  const dateValue = String(validUntilParam.param_value).trim();
  const dateMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dateMatch) {
    return `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
  }
  const parsedDate = new Date(dateValue);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Update application parameters (Edit Parameters on details page)
router.put('/:id', authorize('SuperAdmin', 'Admin', 'Application Creator', 'Assessor', 'Approver'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const applicationId = req.params.id;
    const { parameters } = req.body;

    if (!parameters || !Array.isArray(parameters)) {
      await connection.rollback();
      return res.status(400).json({ error: 'parameters array is required' });
    }

    const [apps] = await connection.execute(
      'SELECT application_id, application_number, status FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }

    // Replace all parameters
    await connection.execute(
      'DELETE FROM application_parameters WHERE application_id = ?',
      [applicationId]
    );

    for (const param of parameters) {
      if (param.param_name && param.param_value !== undefined && param.param_value !== null) {
        const param_id = generateId(ID_PREFIXES.PARAMETER);
        await connection.execute(
          'INSERT INTO application_parameters (parameter_id, application_id, param_name, param_value) VALUES (?, ?, ?, ?)',
          [param_id, applicationId, param.param_name, String(param.param_value)]
        );
      }
    }

    // Keep applications.validity_date in sync when Valid Until is present
    const validity_date = parseValidityDateFromParameters(parameters);
    if (validity_date) {
      await connection.execute(
        'UPDATE applications SET validity_date = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?',
        [validity_date, applicationId]
      );
    }

    await connection.commit();

    await logAction(
      req.user.user_id,
      'UPDATE_APP_PARAMETERS',
      `Updated parameters for application #${apps[0].application_number || applicationId}`,
      applicationId
    );

    res.json({ message: 'Parameters updated successfully', validity_date });
  } catch (error) {
    await connection.rollback();
    console.error('Update application parameters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
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
      'SELECT * FROM applications WHERE application_id = ?',
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
      'SELECT * FROM applications WHERE application_id = ?',
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
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending' && apps[0].status !== 'Assessed') {
      return res.status(400).json({ error: 'Cannot remove fees from application in current status' });
    }

    await pool.execute(
      'DELETE FROM assessed_fees WHERE assessed_fee_id = ? AND application_id = ?',
      [feeId, applicationId]
    );

    console.log('\n========== REMOVE FEE LOGGING ==========');
    console.log('[RemoveFee] Step 1 - Input Parameters:');
    console.log('  - feeId:', feeId);
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get fee name for logging
    const [removeFeeInfo] = await pool.execute(
      'SELECT fc.fee_name FROM assessed_fees af INNER JOIN fees_charges fc ON af.fee_id = fc.fee_id WHERE af.assessed_fee_id = ?',
      [feeId]
    );
    const removedFeeName = removeFeeInfo.length > 0 ? removeFeeInfo[0].fee_name : 'Unknown Fee';
    
    console.log('[RemoveFee] Step 2 - Fee Query Result:');
    console.log('  - removeFeeInfo query result:', removeFeeInfo);
    console.log('  - removedFeeName:', removedFeeName);

    // Get application number for logging
    const [removeAppInfo] = await pool.execute(
      'SELECT * FROM applications WHERE application_id = ?',
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
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { assessed_amount } = req.body;
    const applicationId = req.params.id;
    const feeId = req.params.feeId;

    if (assessed_amount === undefined) {
      await connection.rollback();
      return res.status(400).json({ error: 'Assessed amount is required' });
    }

    // Get old amount for audit
    const [oldFee] = await connection.execute(
      'SELECT assessed_amount FROM assessed_fees WHERE assessed_fee_id = ?',
      [feeId]
    );

    if (oldFee.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Assessed fee not found' });
    }

    const oldAmount = oldFee[0].assessed_amount;

    // Update the assessed fee
    await connection.execute(
      'UPDATE assessed_fees SET assessed_amount = ?, assessed_by_user_id = ? WHERE assessed_fee_id = ?',
      [parseFloat(assessed_amount), req.user.user_id, feeId]
    );

    // Recalculate all fees for this application
    const [allFees] = await connection.execute(
      `SELECT assessed_amount FROM assessed_fees WHERE application_id = ?`,
      [applicationId]
    );

    let totalAmountDue = 0;
    allFees.forEach(fee => {
      totalAmountDue += parseFloat(fee.assessed_amount) || 0;
    });

    // Update assessment record with new total
    const [assessmentRecords] = await connection.execute(
      'SELECT assessment_id FROM assessment_records WHERE application_id = ?',
      [applicationId]
    );

    if (assessmentRecords.length > 0) {
      // Calculate quarterly amounts based on new total
      const q1Amount = 0;
      const q2Amount = totalAmountDue * 0.38;
      const q3Amount = totalAmountDue * 0.36;
      const q4Amount = totalAmountDue * 0.26;

      await connection.execute(
        `UPDATE assessment_records SET 
          total_balance_due = ?, 
          total_amount_due = ?,
          q1_amount = ?,
          q2_amount = ?,
          q3_amount = ?,
          q4_amount = ?
         WHERE application_id = ?`,
        [totalAmountDue, totalAmountDue, q1Amount, q2Amount, q3Amount, q4Amount, applicationId]
      );
    }

    await connection.commit();

    await logAction(
      req.user.user_id,
      'REASSESS_FEE',
      `Re-assessed fee ID ${feeId} from ${oldAmount} to ${assessed_amount} for application #${applicationId}`,
      applicationId
    );

    res.json({ message: 'Fee updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Submit assessment
router.put('/:id/assess', authorize('SuperAdmin', 'Admin', 'Assessor'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const applicationId = req.params.id;
    let quantity_entered = req.body.quantity_entered != null
      ? parseFloat(req.body.quantity_entered)
      : null;

    // Check application status and get full details
    const [apps] = await connection.execute(
      `SELECT 
        a.*,
        a.application_number,
        a.rule_id,
        e.entity_name,
        e.contact_person,
        e.email,
        e.phone
       FROM applications a
       INNER JOIN entities e ON a.entity_id = e.entity_id
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

    // Prefer day count from permitted_dates when quantity was not supplied (quantity mode only)
    const [parametersForQty] = await connection.execute(
      'SELECT param_name, param_value FROM application_parameters WHERE application_id = ?',
      [applicationId]
    );

    // Load quantity/percent fee config early so we know the calculation mode
    let quantityFeeConfig = null;
    let feesCalculatedFromQuantity = false;

    if (app.rule_id) {
      const [quantityConfigs] = await connection.execute(
        'SELECT * FROM assessment_rule_quantity_fees WHERE rule_id = ? AND is_enabled = 1 LIMIT 1',
        [app.rule_id]
      );

      if (quantityConfigs.length > 0) {
        quantityFeeConfig = quantityConfigs[0];
        if (quantityFeeConfig.additional_charges && typeof quantityFeeConfig.additional_charges === 'string') {
          quantityFeeConfig.additional_charges = JSON.parse(quantityFeeConfig.additional_charges);
        }
      }
    }

    const calcModeEarly = String(quantityFeeConfig?.calculation_mode || 'quantity').toLowerCase();
    const daysFromDates = countDaysFromParameters(parametersForQty);
    if (
      calcModeEarly !== 'percent' &&
      (quantity_entered == null || Number.isNaN(quantity_entered) || quantity_entered <= 0) &&
      daysFromDates != null &&
      daysFromDates > 0
    ) {
      quantity_entered = daysFromDates;
    }

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
       FROM assessed_fees af
       INNER JOIN fees_charges fc ON af.fee_id = fc.fee_id
       INNER JOIN fees_categories fcat ON fc.category_id = fcat.category_id
       WHERE af.application_id = ?
       ORDER BY fc.fee_name`,
      [applicationId]
    );

    // If quantity/percent fees are configured, recalculate fees
    // Percent mode: assessor-entered base amount × fixed percent_rate
    if (quantityFeeConfig && quantity_entered) {
      const calcMode = String(quantityFeeConfig.calculation_mode || 'quantity').toLowerCase();

      if (calcMode !== 'percent') {
        const minQty = quantityFeeConfig.min_quantity || 1;
        const maxQty = quantityFeeConfig.max_quantity || 999;
        if (quantity_entered < minQty || quantity_entered > maxQty) {
          await connection.rollback();
          return res.status(400).json({
            error: `Quantity must be between ${minQty} and ${maxQty}`
          });
        }
      } else if (quantity_entered <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Base amount must be greater than zero' });
      }

      try {
        // Get the selected fee row (used as the assessed fee line item)
        const [selectedFee] = await connection.execute(
          'SELECT fee_id, amount FROM assessment_rule_fees WHERE fee_id = ? AND rule_id = ? LIMIT 1',
          [quantityFeeConfig.selected_fee_id, app.rule_id]
        );

        if (selectedFee.length === 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Selected fee not found' });
        }

        const feeAmount = parseFloat(selectedFee[0].amount) || 0;
        const percentRate = parseFloat(quantityFeeConfig.percent_rate) || 0;
        // quantity: schedule fee × qty | percent: assessor base amount × (percent_rate / 100)
        const baseFeeAmount = calcMode === 'percent'
          ? quantity_entered * (percentRate / 100)
          : feeAmount * quantity_entered;
        const unitAmount = calcMode === 'percent' ? quantity_entered : feeAmount;
        const storedQuantity = calcMode === 'percent' ? 1 : quantity_entered;
        
        // Delete existing assessed fees for this application (they'll be recalculated)
        await connection.execute(
          'DELETE FROM assessed_fees WHERE application_id = ?',
          [applicationId]
        );

        // Create assessed fee for the quantity/percent-based fee
        const baseFeeInsertId = generateId(ID_PREFIXES.ASSESSED_FEE);
        await connection.execute(
          `INSERT INTO assessed_fees (
            assessed_fee_id, application_id, fee_id, assessed_amount, unit_amount, quantity, assessed_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            baseFeeInsertId,
            applicationId,
            quantityFeeConfig.selected_fee_id,
            baseFeeAmount.toFixed(2),
            unitAmount,
            storedQuantity,
            req.user.user_id
          ]
        );

        // Add additional charge fees if configured
        if (quantityFeeConfig.additional_charges && Array.isArray(quantityFeeConfig.additional_charges)) {
          for (const charge of quantityFeeConfig.additional_charges) {
            if (charge.fee_id) {
              const additionalFeeId = generateId(ID_PREFIXES.ASSESSED_FEE);
              await connection.execute(
                `INSERT INTO assessed_fees (
                  assessed_fee_id, application_id, fee_id, assessed_amount, unit_amount, quantity, assessed_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  additionalFeeId,
                  applicationId,
                  charge.fee_id,
                  charge.amount || 0,
                  charge.amount || 0,
                  1,
                  req.user.user_id
                ]
              );
            }
          }
        }

        feesCalculatedFromQuantity = true;

        // Re fetch assessed fees after recalculation
        const [recalculatedFees] = await connection.execute(
          `SELECT 
            af.assessed_fee_id,
            af.fee_id,
            af.assessed_amount,
            af.unit_amount,
            af.quantity,
            fc.fee_name,
            fcat.category_name
           FROM assessed_fees af
           INNER JOIN fees_charges fc ON af.fee_id = fc.fee_id
           INNER JOIN fees_categories fcat ON fc.category_id = fcat.category_id
           WHERE af.application_id = ?
           ORDER BY fc.fee_name`,
          [applicationId]
        );
        
        // Update assessedFees array with recalculated values
        assessedFees.length = 0;
        recalculatedFees.forEach(fee => assessedFees.push(fee));
      } catch (error) {
        console.error('Quantity-based fee calculation error:', error);
        await connection.rollback();
        return res.status(400).json({ error: `Fee calculation failed: ${error.message}` });
      }
    }

    if (assessedFees.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No fees assessed for this application' });
    }

    // Get address from application address Information parameters
    const [parameters] = await connection.execute(
      'SELECT * FROM application_parameters WHERE application_id = ?',
      [applicationId]
    );
    const paramMap = {};
    parameters.forEach((p) => {
      if (!p?.param_name) return;
      paramMap[String(p.param_name).trim().toLowerCase()] = p.param_value != null ? String(p.param_value).trim() : '';
    });
    const getParam = (...names) => {
      for (const name of names) {
        const value = paramMap[name.toLowerCase()];
        if (value) return value;
      }
      return '';
    };
    let address = getParam('location');
    if (!address) {
      address = [
        getParam('street/sitio', 'street', 'sitio'),
        getParam('barangay'),
        getParam('municipality', 'city'),
        getParam('province'),
        getParam('country')
      ].filter(Boolean).join(', ');
    }
    if (!address) {
      address = getParam('address', 'business address', 'business_address');
    }

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
      'SELECT assessment_id FROM assessment_records WHERE application_id = ?',
      [applicationId]
    );

    let assessmentId;
    if (existingRecords.length > 0) {
      assessmentId = existingRecords[0].assessment_id;
      // Update existing record
      await connection.execute(
        `UPDATE assessment_records SET
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
          quantity_entered = ?,
          quantity_unit = ?,
          fees_calculated_from_quantity = ?,
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
          quantity_entered || null,
          quantityFeeConfig ? quantityFeeConfig.quantity_label : null,
          feesCalculatedFromQuantity ? 1 : 0,
          req.user.user_id,
          assessmentId
        ]
      );
      // Delete existing fees
      await connection.execute(
        'DELETE FROM assessment_record_fees WHERE assessment_id = ?',
        [assessmentId]
      );
    } else {
      // Create new record
      const assessment_id = generateId(ID_PREFIXES.ASSESSMENT_RECORD);

      const [result] = await connection.execute(
        `INSERT INTO assessment_records (
          assessment_id, application_id, business_name, owner_name, address, app_number, app_type, app_date,
          validity_date, total_balance_due, total_surcharge, total_interest, total_amount_due,
          q1_amount, q2_amount, q3_amount, q4_amount, quantity_entered, quantity_unit, 
          fees_calculated_from_quantity, prepared_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          quantity_entered || null,
          quantityFeeConfig ? quantityFeeConfig.quantity_label : null,
          feesCalculatedFromQuantity ? 1 : 0,
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
        `INSERT INTO assessment_record_fees (
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
      'UPDATE applications SET status = ?, assessor_id = ? WHERE application_id = ?',
      ['Pending Approval', req.user.user_id, applicationId]
    );

    await connection.commit();

    try {
      await startApprovalChain(applicationId, app.permit_type_id || null);
    } catch (_) { /* optional */ }

    console.log('\n========== SUBMIT ASSESSMENT LOGGING ==========');
    console.log('[SubmitAssessment] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get application number and entity name for logging
    const [assessAppInfo] = await pool.execute(
      `SELECT a.application_number, e.entity_name 
       FROM applications a 
       LEFT JOIN entities e ON a.entity_id = e.entity_id 
       WHERE a.application_id = ?`,
      [applicationId]
    );
    const assessAppNumber = assessAppInfo.length > 0 ? assessAppInfo[0].application_number : applicationId;
    const assessEntityName = assessAppInfo.length > 0 ? assessAppInfo[0].entity_name : 'Unknown';

    console.log('[SubmitAssessment] Step 2 - Application Query Result:');
    console.log('  - assessAppInfo query result:', assessAppInfo);
    console.log('  - assessAppNumber:', assessAppNumber);
    console.log('  - assessEntityName:', assessEntityName);

    const assessLogMessage = `Submitted assessment for application #${assessAppNumber} (${assessEntityName})`;
    
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
      `Application #${assessAppNumber} (${assessEntityName}) is pending approval`,
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
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }

    const stepResult = await approveCurrentStep(applicationId, req.user.user_id);
    if (stepResult.usedChain && !stepResult.done) {
      await pool.execute(
        'UPDATE applications SET approver_id = ? WHERE application_id = ?',
        [req.user.user_id, applicationId]
      );
      return res.json({
        message: 'Approval step recorded; awaiting next approver',
        chain_complete: false,
        step: stepResult.step?.role_name,
      });
    }

    assertPermitTransition(apps[0].status, 'Approved');

    // Update application
    await pool.execute(
      'UPDATE applications SET status = ?, approver_id = ? WHERE application_id = ?',
      ['Approved', req.user.user_id, applicationId]
    );

    // Update assessment record with approver
    await pool.execute(
      'UPDATE assessment_records SET approved_by_user_id = ? WHERE application_id = ?',
      [req.user.user_id, applicationId]
    );

    console.log('\n========== APPROVE APPLICATION LOGGING ==========');
    console.log('[ApproveApp] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - user_id:', req.user.user_id);

    // Get application number and entity name for logging
    const [approveAppInfo] = await pool.execute(
      `SELECT a.application_number, e.entity_name 
       FROM applications a 
       LEFT JOIN entities e ON a.entity_id = e.entity_id 
       WHERE a.application_id = ?`,
      [applicationId]
    );
    
    console.log('[ApproveApp] Step 2 - Application Query Result:');
    console.log('  - approveAppInfo query result:', JSON.stringify(approveAppInfo));
    console.log('  - approveAppInfo.length:', approveAppInfo.length);
    if (approveAppInfo.length > 0) {
      console.log('  - approveAppInfo[0]:', JSON.stringify(approveAppInfo[0]));
      console.log('  - application_number value:', approveAppInfo[0].application_number);
      console.log('  - application_number type:', typeof approveAppInfo[0].application_number);
    }
    
    const approveAppNumber = approveAppInfo.length > 0 && approveAppInfo[0].application_number 
      ? approveAppInfo[0].application_number 
      : applicationId;
    const approveEntityName = approveAppInfo.length > 0 ? approveAppInfo[0].entity_name : 'Unknown';

    console.log('  - approveAppNumber (final):', approveAppNumber);
    console.log('  - approveEntityName:', approveEntityName);

    const approveLogMessage = `Approved application #${approveAppNumber} (${approveEntityName})`;
    
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
      `Application #${approveAppNumber} (${approveEntityName}) has been approved`,
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
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const originalApp = apps[0];

    // Application Creator, Admin, and SuperAdmin can all renew any application
    // (The authorize middleware already verified they have one of these roles)

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Determine parent_application_id for renewal tracking:
      // If original is already a renewal, use its parent; otherwise use the original app itself
      const parentApplicationId = originalApp.parent_application_id || originalApp.application_id;
      
      // Calculate renewal count: count how many renewals exist for this parent, then add 1
      const [renewalCountResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM applications WHERE parent_application_id = ? AND application_type = "RENEWAL"',
        [parentApplicationId]
      );
      const renewalCount = renewalCountResult[0].count + 1;

      // Generate unique application number for renewal using the same connection
      const applicationNumber = await generateApplicationNumber(connection);

      // Create new application with renewal tracking
      const new_application_id = generateId(ID_PREFIXES.APPLICATION);

      const [result] = await connection.execute(
        `INSERT INTO applications 
         (application_id, application_number, entity_id, creator_id, permit_type, permit_type_id, rule_id, status, application_type, parent_application_id, renewal_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [new_application_id, applicationNumber, originalApp.entity_id, req.user.user_id, originalApp.permit_type, originalApp.permit_type_id, originalApp.rule_id, 'Pending', 'RENEWAL', parentApplicationId, renewalCount]
      );

      // Copy parameters
      const [parameters] = await connection.execute(
        'SELECT param_name, param_value FROM application_parameters WHERE application_id = ?',
        [applicationId]
      );

      for (const param of parameters) {
        const parameter_id = generateId(ID_PREFIXES.APPLICATION_PARAMETER);
        await connection.execute(
          'INSERT INTO application_parameters (parameter_id, application_id, param_name, param_value) VALUES (?, ?, ?, ?)',
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
        'SELECT * FROM applications WHERE application_id = ?',
        [applicationId]
      );
      const oldAppNumber = oldAppInfo.length > 0 ? oldAppInfo[0].application_number : applicationId;

      console.log('[RenewApp] Step 2 - Old Application Query Result:');
      console.log('  - oldAppInfo query result:', oldAppInfo);
      console.log('  - oldAppNumber:', oldAppNumber);

      const [newAppInfo] = await pool.execute(
        'SELECT * FROM applications WHERE application_id = ?',
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

      // Get application number and entity name for renewal notification
      const [renewAppInfo] = await pool.execute(
        `SELECT a.application_number, e.entity_name 
         FROM applications a 
         LEFT JOIN entities e ON a.entity_id = e.entity_id 
         WHERE a.application_id = ?`,
        [new_application_id]
      );
      const renewAppNumber = renewAppInfo.length > 0 ? renewAppInfo[0].application_number : new_application_id;
      const renewEntityName = renewAppInfo.length > 0 ? renewAppInfo[0].entity_name : 'Unknown';

      await notifyRole(
        'Assessor',
        `New application #${renewAppNumber} (${renewEntityName}) requires assessment (renewal)`,
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
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }

    await rejectCurrentStep(applicationId, req.user.user_id, reason || null);

    // Update application
    await pool.execute(
      'UPDATE applications SET status = ?, approver_id = ? WHERE application_id = ?',
      ['Rejected', req.user.user_id, applicationId]
    );

    console.log('\n========== REJECT APPLICATION LOGGING ==========');
    console.log('[RejectApp] Step 1 - Input Parameters:');
    console.log('  - applicationId:', applicationId);
    console.log('  - reason:', reason);
    console.log('  - user_id:', req.user.user_id);

    // Get application number and entity name for logging
    const [rejectAppInfo] = await pool.execute(
      `SELECT a.application_number, e.entity_name 
       FROM applications a 
       LEFT JOIN entities e ON a.entity_id = e.entity_id 
       WHERE a.application_id = ?`,
      [applicationId]
    );
    
    console.log('[RejectApp] Step 2 - Application Query Result:');
    console.log('  - rejectAppInfo query result:', JSON.stringify(rejectAppInfo));
    console.log('  - rejectAppInfo.length:', rejectAppInfo.length);
    if (rejectAppInfo.length > 0) {
      console.log('  - rejectAppInfo[0]:', JSON.stringify(rejectAppInfo[0]));
      console.log('  - application_number value:', rejectAppInfo[0].application_number);
      console.log('  - application_number type:', typeof rejectAppInfo[0].application_number);
    }
    
    const rejectAppNumber = rejectAppInfo.length > 0 && rejectAppInfo[0].application_number 
      ? rejectAppInfo[0].application_number 
      : applicationId;
    const rejectEntityName = rejectAppInfo.length > 0 ? rejectAppInfo[0].entity_name : 'Unknown';

    console.log('  - rejectAppNumber (final):', rejectAppNumber);
    console.log('  - rejectEntityName:', rejectEntityName);

    const rejectLogMessage = `Rejected application #${rejectAppNumber} (${rejectEntityName})${reason ? ': ' + reason : ''}`;
    
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
      `Application #${rejectAppNumber} (${rejectEntityName}) has been rejected${reason ? ': ' + reason : ''}`,
      `/applications/${applicationId}`
    );

    res.json({ message: 'Application rejected successfully' });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment for an application
// Restricted to SuperAdmin, Admin, and Application Creator roles
router.post('/:id/payment', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  try {
    const created = await applicationsService.recordPayment(
      req.params.id,
      req.body,
      req.user.user_id
    );

    try {
      await logAction(
        req.user.user_id,
        'RECORD_PAYMENT',
        `Recorded payment for application #${created.application_number} (${created.entity_name}): Receipt #${created.official_receipt_no}, Amount: ₱${created.amount}`,
        created.application_id
      );
    } catch (logError) {
      console.warn('[Payment] Warning: Could not log action:', logError);
    }

    res.json({
      message: 'Payment recorded successfully',
      payment_id: created.payment_id,
      marked_paid: created.marked_paid,
    });
  } catch (error) {
    console.error('[Payment] Record payment error:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
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
       FROM payments p
       LEFT JOIN users u ON p.recorded_by_user_id = u.user_id
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

    // Check current status and get permit type info for validity, also get renewal info
    const [apps] = await pool.execute(
      `SELECT a.status, a.application_number, a.permit_type_id, a.permit_type,
              a.application_type, a.parent_application_id, a.renewal_count, a.validity_date,
              pt.validity_date as permit_type_validity_date,
              pt.validity_type as permit_type_validity_type,
              pt.permit_type_name
       FROM applications a
       LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
       WHERE a.application_id = ?`,
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Paid') {
      return res.status(400).json({ error: 'Permit can only be issued for paid applications' });
    }

    assertPermitTransition(apps[0].status, 'Issued');

    // Determine validity date based on validity_type
    let validityDate = apps[0].validity_date || null; // Preserve existing validity_date from creation (convert undefined to null)
    let validityMsg = 'No validity date set';
    
    if (apps[0].permit_type_validity_type === 'custom') {
      // For custom validity, preserve the validity_date from application creation
      // The custom date text is stored in application_parameters with param_name='Date'
      
      const [dateParams] = await pool.execute(
        `SELECT param_value FROM application_parameters 
         WHERE application_id = ? AND param_name = 'Date'
         LIMIT 1`,
        [applicationId]
      );
      
      if (dateParams.length > 0 && dateParams[0].param_value) {
        validityMsg = `Custom validity: ${dateParams[0].param_value}`;
      } else {
        validityMsg = 'Custom validity (no Date parameter found)';
      }
    } else {
      // For fixed validity, use the permit_type_validity_date if available
      if (apps[0].permit_type_validity_date) {
        validityDate = apps[0].permit_type_validity_date;
      }
      if (validityDate) {
        validityDate = new Date(validityDate).toISOString().split('T')[0];
        validityMsg = `Valid until ${validityDate}`;
      }
    }
    
    // Generate permit number based on application type
    let permitNumber = null;

    if (apps[0].application_type === 'RENEWAL' && apps[0].parent_application_id) {
      // For renewal: get the parent application's permit number
      const [parentApps] = await pool.execute(
        'SELECT permit_number FROM applications WHERE application_id = ?',
        [apps[0].parent_application_id]
      );
      
      if (parentApps.length > 0 && parentApps[0].permit_number) {
        // Generate renewal permit number: <PARENT_PERMIT>-<RENEWAL_COUNT>R
        permitNumber = await generatePermitNumberForRenewal(
          parentApps[0].permit_number,
          apps[0].renewal_count || 1
        );
      } else {
        // Fallback: generate normal permit number if parent doesn't have one yet
        permitNumber = await generatePermitNumber(apps[0].permit_type_name || apps[0].permit_type);
      }
    } else {
      // For new applications: generate normal permit number
      permitNumber = await generatePermitNumber(apps[0].permit_type_name || apps[0].permit_type);
    }

    // Update status to Issued with validity_date and permit_number
    // Note: For custom validity, we store the text as-is; for fixed, it's a date
    await pool.execute(
      `UPDATE applications 
       SET status = ?, 
           issued_by_user_id = ?, 
           issued_at = CURRENT_TIMESTAMP, 
           validity_date = ?,
           permit_number = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE application_id = ?`,
      ['Issued', req.user.user_id, validityDate, permitNumber, applicationId]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'ISSUE_PERMIT',
      `Issued permit ${permitNumber} for application ${apps[0].application_number || applicationId} (${validityMsg})`,
      applicationId
    );

    res.json({ message: 'Permit issued successfully', permit_number: permitNumber, validity_date: validityDate, validity_type: apps[0].permit_type_validity_type || 'fixed' });
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
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Issued') {
      return res.status(400).json({ error: 'Permit can only be released for issued applications' });
    }

    assertPermitTransition(apps[0].status, 'Released');

    // Update status to Released
    await pool.execute(
      'UPDATE applications SET status = ?, released_by = ?, received_by = ?, released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?',
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

// Re-assess application - changes status from Approved back to Assessed
router.put('/:id/reassess', authorize('SuperAdmin', 'Admin', 'Approver'), async (req, res) => {
  try {
    const applicationId = req.params.id;

    // Check current status
    const [apps] = await pool.execute(
      'SELECT * FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (apps[0].status !== 'Approved') {
      return res.status(400).json({ error: 'Application can only be re-assessed if it is in Approved status' });
    }

    // Update status back to Assessed
    await pool.execute(
      'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?',
      ['Assessed', applicationId]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'REASSESS_APPLICATION',
      `Re-assessed application ${apps[0].application_number || applicationId}. Status changed from Approved to Assessed.`,
      applicationId
    );

    res.json({ message: 'Application re-assessed successfully. Status changed to Assessed.' });
  } catch (error) {
    console.error('Re-assess application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Helper function to check if user can edit reports
async function canEditReport(user, applicationId) {
  const allowedRoles = ['Admin', 'SuperAdmin', 'Approver', 'Assessor'];

  if (!allowedRoles.includes(user.role_name)) {
    return false;
  }

  // For non-admin roles, check if user is involved in the application
  if (!['Admin', 'SuperAdmin'].includes(user.role_name)) {
    const [apps] = await pool.execute(
      'SELECT creator_id, assessor_id, approver_id FROM applications WHERE application_id = ?',
      [applicationId]
    );

    if (apps.length === 0) {
      return false;
    }

    const app = apps[0];
    const userId = user.user_id;

    if (user.role_name === 'Assessor' && app.assessor_id !== userId) {
      return false;
    }
    if (user.role_name === 'Approver' && app.approver_id !== userId) {
      return false;
    }
  }

  return true;
}

// Get report customization - retrieve saved customizations or original content
router.get('/:id/report-customization/:reportType', authenticate, async (req, res) => {
  try {
    const { id: applicationId, reportType } = req.params;

    // Validate reportType
    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Check edit permission
    const canEdit = await canEditReport(req.user, applicationId);
    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this report' });
    }

    // Try to fetch existing customization
    const [customizations] = await pool.execute(
      'SELECT * FROM report_customizations WHERE application_id = ? AND report_type = ?',
      [applicationId, reportType]
    );

    if (customizations.length > 0) {
      const customization = customizations[0];
      return res.json({
        success: true,
        customization: {
          customizationId: customization.customization_id,
          customContent: JSON.parse(customization.custom_content),
          originalContent: JSON.parse(customization.original_content),
          editedAt: customization.edited_at,
          editedBy: customization.edited_by_user_id,
          isSaved: customization.is_saved
        },
        isEdited: true
      });
    }

    // No customization exists, return empty state
    res.json({
      success: true,
      customization: null,
      isEdited: false
    });
  } catch (error) {
    console.error('Get report customization error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Save/update report customization
router.put('/:id/report-customization/:reportType', authenticate, async (req, res) => {
  try {
    const { id: applicationId, reportType } = req.params;
    const { customContent, originalContent, isSaved } = req.body;

    // Validate reportType
    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Check edit permission
    const canEdit = await canEditReport(req.user, applicationId);
    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this report' });
    }

    // Validate required fields
    if (!customContent) {
      return res.status(400).json({ error: 'customContent is required' });
    }

    // Try to update existing customization
    const [existing] = await pool.execute(
      'SELECT customization_id FROM report_customizations WHERE application_id = ? AND report_type = ?',
      [applicationId, reportType]
    );

    if (existing.length > 0) {
      // Update existing record
      await pool.execute(
        `UPDATE report_customizations
         SET custom_content = ?, original_content = ?, edited_by_user_id = ?, is_saved = ?, edited_at = CURRENT_TIMESTAMP
         WHERE application_id = ? AND report_type = ?`,
        [
          JSON.stringify(customContent),
          originalContent ? JSON.stringify(originalContent) : null,
          req.user.user_id,
          isSaved ? 1 : 0,
          applicationId,
          reportType
        ]
      );

      return res.json({
        success: true,
        customizationId: existing[0].customization_id,
        message: isSaved ? 'Report customization saved successfully' : 'Report customization updated (temporary)'
      });
    }

    // Create new customization record
    const customizationId = generateId(ID_PREFIXES.CUSTOMIZATION);
    await pool.execute(
      `INSERT INTO report_customizations
       (customization_id, application_id, report_type, custom_content, original_content, edited_by_user_id, is_saved)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customizationId,
        applicationId,
        reportType,
        JSON.stringify(customContent),
        originalContent ? JSON.stringify(originalContent) : JSON.stringify({}),
        req.user.user_id,
        isSaved ? 1 : 0
      ]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'CUSTOMIZE_REPORT',
      `Customized ${reportType} report for application ${applicationId}. ${isSaved ? 'Changes saved.' : 'Temporary edits.'}`,
      applicationId
    );

    res.json({
      success: true,
      customizationId,
      message: isSaved ? 'Report customization saved successfully' : 'Report customization updated (temporary)'
    });
  } catch (error) {
    console.error('Save report customization error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete/revert report customization - remove edits and restore original
router.delete('/:id/report-customization/:reportType', authenticate, async (req, res) => {
  try {
    const { id: applicationId, reportType } = req.params;

    // Validate reportType
    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Check edit permission
    const canEdit = await canEditReport(req.user, applicationId);
    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this report' });
    }

    // Delete customization record
    const [result] = await pool.execute(
      'DELETE FROM report_customizations WHERE application_id = ? AND report_type = ?',
      [applicationId, reportType]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No customization found to delete' });
    }

    // Log action
    await logAction(
      req.user.user_id,
      'REVERT_REPORT_CUSTOMIZATION',
      `Reverted ${reportType} report customization for application ${applicationId}. Restored to original content.`,
      applicationId
    );

    res.json({
      success: true,
      message: 'Report customization reverted to original content'
    });
  } catch (error) {
    console.error('Delete report customization error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

