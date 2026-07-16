const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { getVariablesForReportType } = require('../utils/templateVariables');

const router = express.Router();

/**
 * GET /api/report-templates
 * List all templates with optional filtering
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { reportType, active_only } = req.query;

    let query = 'SELECT * FROM html_report_templates WHERE 1=1';
    const params = [];

    if (reportType) {
      query += ' AND report_type = ?';
      params.push(reportType);
    }

    if (active_only === 'true') {
      query += ' AND is_active = TRUE';
    }

    query += ' ORDER BY is_default DESC, created_at DESC';

    const [templates] = await pool.execute(query, params);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/report-templates/:reportType
 * Get the active/default template for a specific report type
 */
router.get('/:reportType', authenticate, async (req, res) => {
  try {
    const { reportType } = req.params;

    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Try to get default template first
    const [templates] = await pool.execute(
      'SELECT * FROM html_report_templates WHERE report_type = ? AND is_default = TRUE AND is_active = TRUE LIMIT 1',
      [reportType]
    );

    if (templates.length > 0) {
      return res.json({
        success: true,
        template: templates[0],
        isFromDatabase: true
      });
    }

    // No template found in database - response indicates fallback to hardcoded
    res.json({
      success: true,
      template: null,
      isFromDatabase: false,
      message: 'No template found in database, using hardcoded default'
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/report-templates/:reportType/variables
 * Get available variables for a report type
 */
router.get('/:reportType/variables', authenticate, async (req, res) => {
  try {
    const { reportType } = req.params;

    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const variables = getVariablesForReportType(reportType);

    res.json({
      success: true,
      reportType,
      variables
    });
  } catch (error) {
    console.error('Get variables error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/report-templates
 * Create a new template
 */
router.post('/', authenticate, authorize('Admin', 'SuperAdmin'), async (req, res) => {
  try {
    const { reportType, templateHtml, description } = req.body;

    if (!reportType || !templateHtml) {
      return res.status(400).json({ error: 'reportType and templateHtml are required' });
    }

    const validTypes = ['assessment', 'permit', 'endorsement'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const templateId = generateId(ID_PREFIXES.TEMPLATE);

    await pool.execute(
      `INSERT INTO html_report_templates (template_id, report_type, template_html, description, created_by, is_default)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [templateId, reportType, templateHtml, description || null, req.user.user_id]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'CREATE_REPORT_TEMPLATE',
      `Created ${reportType} report template: "${description || templateId}"`,
      null
    );

    res.json({
      success: true,
      templateId,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/report-templates/:id
 * Update an existing template
 */
router.put('/:id', authenticate, authorize('Admin', 'SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { templateHtml, description } = req.body;

    if (!templateHtml) {
      return res.status(400).json({ error: 'templateHtml is required' });
    }

    const [existingTemplate] = await pool.execute(
      'SELECT * FROM html_report_templates WHERE template_id = ?',
      [id]
    );

    if (existingTemplate.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = existingTemplate[0];

    await pool.execute(
      `UPDATE html_report_templates
       SET template_html = ?, description = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE template_id = ?`,
      [templateHtml, description || template.description, id]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'UPDATE_REPORT_TEMPLATE',
      `Updated ${template.report_type} report template: "${description || template.description}"`,
      null
    );

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/report-templates/:id/set-default
 * Set template as default for its report type
 */
router.post('/:id/set-default', authenticate, authorize('Admin', 'SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existingTemplate] = await pool.execute(
      'SELECT * FROM html_report_templates WHERE template_id = ?',
      [id]
    );

    if (existingTemplate.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = existingTemplate[0];

    // Start transaction
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Unset all other defaults for this report type
      await connection.execute(
        'UPDATE html_report_templates SET is_default = FALSE WHERE report_type = ? AND template_id != ?',
        [template.report_type, id]
      );

      // Set this one as default
      await connection.execute(
        'UPDATE html_report_templates SET is_default = TRUE WHERE template_id = ?',
        [id]
      );

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    // Log action
    await logAction(
      req.user.user_id,
      'SET_DEFAULT_TEMPLATE',
      `Set "${template.description || template.template_id}" as default ${template.report_type} template`,
      null
    );

    res.json({
      success: true,
      message: 'Template set as default successfully'
    });
  } catch (error) {
    console.error('Set default template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/report-templates/:id/preview
 * Generate preview of template with actual application data
 */
router.post('/:id/preview', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    const [templates] = await pool.execute(
      'SELECT * FROM html_report_templates WHERE template_id = ?',
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Fetch application data for substitution
    const [applications] = await pool.execute(
      `SELECT a.*, e.entity_name, e.contact_person, e.email, e.phone
       FROM applications a
       INNER JOIN entities e ON a.entity_id = e.entity_id
       WHERE a.application_id = ?`,
      [applicationId]
    );

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appData = applications[0];

    // Fetch assessment record if it exists
    const [assessments] = await pool.execute(
      'SELECT * FROM assessment_records WHERE application_id = ?',
      [applicationId]
    );

    const assessmentData = assessments.length > 0 ? assessments[0] : {};

    // Fetch settings
    const [settings] = await pool.execute(
      'SELECT setting_name, setting_value FROM system_settings'
    );

    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_name] = s.setting_value;
    });

    // Build data object for substitution
    const data = {
      application_number: appData.application_number,
      application_id: appData.application_id,
      business_name: assessmentData.business_name || appData.entity_name,
      owner_name: assessmentData.owner_name || appData.contact_person,
      address: assessmentData.address || appData.parameters?.[0]?.param_value || 'N/A',
      contact_person: appData.contact_person,
      email: appData.email,
      phone: appData.phone,
      app_type: appData.permit_type,
      app_date: appData.created_at,
      permit_type: appData.permit_type,
      issued_date: appData.created_at,
      total_amount_due: assessmentData.total_amount_due || 0,
      total_balance_due: assessmentData.total_balance_due || 0,
      total_surcharge: assessmentData.total_surcharge || 0,
      total_interest: assessmentData.total_interest || 0,
      prepared_by_name: appData.contact_person,
      validity_date: assessmentData.validity_date || 'N/A',
      municipality_name: settingsMap.municipality_name || 'Dalaguete',
      municipal_treasurer_name: settingsMap.municipal_treasurer_name || 'N/A',
      permit_signatory_name: settingsMap.permit_signatory_name || 'N/A'
    };

    // Substitute variables in template
    let renderedHtml = template.template_html;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      renderedHtml = renderedHtml.replace(regex, data[key] || 'N/A');
    });

    res.json({
      success: true,
      html: renderedHtml,
      data
    });
  } catch (error) {
    console.error('Preview template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/report-templates/:id
 * Delete a template
 */
router.delete('/:id', authenticate, authorize('Admin', 'SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [templates] = await pool.execute(
      'SELECT * FROM html_report_templates WHERE template_id = ?',
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Prevent deleting the only default template
    if (template.is_default) {
      const [defaultCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM html_report_templates WHERE report_type = ? AND is_default = TRUE',
        [template.report_type]
      );

      if (defaultCount[0].count <= 1) {
        return res.status(400).json({
          error: 'Cannot delete the only default template. Set another as default first.'
        });
      }
    }

    await pool.execute(
      'DELETE FROM html_report_templates WHERE template_id = ?',
      [id]
    );

    // Log action
    await logAction(
      req.user.user_id,
      'DELETE_REPORT_TEMPLATE',
      `Deleted ${template.report_type} report template: "${template.description || template.template_id}"`,
      null
    );

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
