/**
 * Document Generator Service
 * Generates DOCX documents from templates using docxtemplater
 */

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Format currency amount
 */
const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Format date to readable format
 */
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * Format date for short display
 */
const formatDateShort = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Get ordinal suffix for day
 */
const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
};

/**
 * Format date with ordinal (e.g., "26th day of November, 2025")
 */
const formatDateOrdinal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${day}${getOrdinalSuffix(day)} day of ${month}, ${year}`;
};

/**
 * Fetch complete application data for document generation
 */
const fetchApplicationData = async (applicationId) => {
    // Fetch main application with entity and permit type
    const [applications] = await db.query(`
        SELECT 
            a.application_id,
            a.application_number,
            a.status,
            a.created_at as application_date,
            a.updated_at,
            
            -- Entity (Business) Information
            e.entity_id,
            e.entity_name as business_name,
            e.contact_person,
            e.email,
            e.phone,
            e.address as business_address,
            
            -- Permit Type Information
            pt.permit_type_id,
            pt.permit_type_name as permit_type,
            pt.description as permit_description,
            
            -- Attribute (Category) Information
            attr.attribute_id,
            attr.attribute_name,
            attr.description as attribute_description
            
        FROM applications a
        JOIN entities e ON a.entity_id = e.entity_id
        JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
        LEFT JOIN attributes attr ON pt.attribute_id = attr.attribute_id
        WHERE a.application_id = ?
    `, [applicationId]);

    if (applications.length === 0) {
        throw new Error('Application not found');
    }

    const app = applications[0];

    // Fetch application parameters
    const [parameters] = await db.query(`
        SELECT 
            ap.param_name,
            ap.param_value
        FROM application_parameters ap
        WHERE ap.application_id = ?
    `, [applicationId]);

    // Fetch assessed fees
    const [assessedFees] = await db.query(`
        SELECT 
            af.assessed_fee_id,
            af.assessed_amount,
            fc.fee_name,
            fc.default_amount
        FROM assessed_fees af
        JOIN fees_charges fc ON af.fee_id = fc.fee_id
        WHERE af.application_id = ?
        ORDER BY fc.fee_name
    `, [applicationId]);

    // Fetch assessment record
    const [assessmentRecords] = await db.query(`
        SELECT 
            ar.assessment_id,
            ar.total_amount_due as total_annual_fee,
            ar.q1_amount as first_quarter,
            ar.q2_amount as second_quarter,
            ar.q3_amount as third_quarter,
            ar.q4_amount as fourth_quarter,
            ar.created_at as assessment_date,
            u.full_name as assessed_by
        FROM assessment_records ar
        LEFT JOIN users u ON ar.prepared_by_user_id = u.user_id
        WHERE ar.application_id = ?
        ORDER BY ar.created_at DESC
        LIMIT 1
    `, [applicationId]);

    // Fetch assessment record fees
    const [assessmentRecordFees] = await db.query(`
        SELECT 
            arf.quantity,
            arf.amount as unit_price,
            arf.total as total_price,
            arf.fee_name
        FROM assessment_record_fees arf
        JOIN assessment_records ar ON arf.assessment_id = ar.assessment_id
        WHERE ar.application_id = ?
        ORDER BY arf.fee_name
    `, [applicationId]);

    // Fetch payments
    const [payments] = await db.query(`
        SELECT 
            p.payment_id,
            p.official_receipt_no,
            p.payment_date,
            p.amount,
            p.address as payment_address,
            u.full_name as recorded_by
        FROM payments p
        LEFT JOIN users u ON p.recorded_by_user_id = u.user_id
        WHERE p.application_id = ?
        ORDER BY p.payment_date DESC
    `, [applicationId]);

    // Fetch system settings for signatory info
    const [settings] = await db.query(`
        SELECT setting_key, setting_value
        FROM system_settings
        WHERE setting_key IN (
            'signatory_name',
            'signatory_title',
            'signatory_department',
            'municipality_name',
            'municipality_address',
            'municipality_province',
            'municipality_logo_url'
        )
    `);

    // Convert settings to object
    const settingsObj = {};
    settings.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
    });

    // Calculate totals
    const totalAssessedAmount = assessedFees.reduce((sum, fee) => sum + parseFloat(fee.assessed_amount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const assessmentRecord = assessmentRecords[0] || null;

    // Process parameters into named variables
    const params = {};
    parameters.forEach(p => {
        // Convert param_name to a valid template variable name
        const varName = p.param_name.toLowerCase().replace(/\s+/g, '_');
        params[varName] = p.param_value;
    });

    // Format fees for table display
    const fees = assessedFees.map((fee, index) => ({
        row_number: index + 1,
        fee_name: fee.fee_name,
        fee_type: fee.fee_type,
        quantity: fee.quantity || 1,
        unit_amount: formatCurrency(fee.unit_amount || fee.assessed_amount),
        amount: formatCurrency(fee.assessed_amount),
        amount_raw: parseFloat(fee.assessed_amount || 0)
    }));

    // Format assessment record fees for table display
    const permitActivities = assessmentRecordFees.map((fee, index) => ({
        row_number: index + 1,
        activity: fee.fee_name,
        quantity: fee.quantity || 1,
        unit_price: formatCurrency(fee.unit_price),
        total_price: formatCurrency(fee.total_price),
        total_price_raw: parseFloat(fee.total_price || 0)
    }));

    // Build template data object
    const templateData = {
        // Application Information
        application_number: app.application_number || '',
        application_date: formatDate(app.application_date),
        application_date_short: formatDateShort(app.application_date),
        status: app.status || '',
        
        // Permit Information (use application_number as permit_number if not available)
        permit_number: app.application_number || '',
        permit_type: app.permit_type || '',
        permit_description: app.permit_description || '',
        permit_valid_from: formatDate(app.application_date),
        permit_valid_until: '',
        issued_date: formatDate(app.updated_at),
        issued_date_ordinal: formatDateOrdinal(app.updated_at),
        
        // Business/Entity Information
        business_name: app.business_name || '',
        entity_name: app.business_name || '',
        entity_type: '',
        registration_number: '',
        contact_person: app.contact_person || '',
        email: app.email || '',
        phone: app.phone || '',
        business_address: app.business_address || '',
        
        // Attribute/Category
        attribute_name: app.attribute_name || '',
        attribute_description: app.attribute_description || '',
        category: app.attribute_name || '',
        
        // Dynamic Parameters (from Application_Parameters)
        ...params,
        
        // Fees Table
        fees: fees,
        fee_count: fees.length,
        
        // Permit Activities Table (from Assessment_Record_Fees)
        permit_activities: permitActivities,
        activities: permitActivities,
        activity_count: permitActivities.length,
        
        // Assessment Information
        total_assessed: formatCurrency(totalAssessedAmount),
        total_assessed_raw: totalAssessedAmount,
        total_annual_fee: assessmentRecord ? formatCurrency(assessmentRecord.total_annual_fee) : formatCurrency(0),
        total_annual_fee_raw: assessmentRecord ? parseFloat(assessmentRecord.total_annual_fee || 0) : 0,
        first_quarter: assessmentRecord ? formatCurrency(assessmentRecord.first_quarter) : formatCurrency(0),
        second_quarter: assessmentRecord ? formatCurrency(assessmentRecord.second_quarter) : formatCurrency(0),
        third_quarter: assessmentRecord ? formatCurrency(assessmentRecord.third_quarter) : formatCurrency(0),
        fourth_quarter: assessmentRecord ? formatCurrency(assessmentRecord.fourth_quarter) : formatCurrency(0),
        assessed_by: assessmentRecord?.assessed_by || '',
        assessment_date: assessmentRecord ? formatDate(assessmentRecord.assessment_date) : '',
        
        // Payment Information
        total_paid: formatCurrency(totalPayments),
        total_paid_raw: totalPayments,
        balance_due: formatCurrency(totalAssessedAmount - totalPayments),
        is_fully_paid: totalPayments >= totalAssessedAmount,
        payments: payments.map((p, index) => ({
            row_number: index + 1,
            receipt_number: p.official_receipt_no,
            payment_date: formatDateShort(p.payment_date),
            amount: formatCurrency(p.amount),
            received_by: p.received_by || ''
        })),
        
        // Latest payment info
        latest_receipt_number: payments[0]?.official_receipt_no || '',
        latest_payment_date: payments[0] ? formatDate(payments[0].payment_date) : '',
        latest_payment_amount: payments[0] ? formatCurrency(payments[0].amount) : '',
        
        // System Settings / Signatory
        signatory_name: settingsObj.signatory_name || '',
        signatory_title: settingsObj.signatory_title || '',
        signatory_department: settingsObj.signatory_department || '',
        municipality_name: settingsObj.municipality_name || '',
        municipality_address: settingsObj.municipality_address || '',
        municipality_province: settingsObj.municipality_province || '',
        
        // Current date placeholders
        current_date: formatDate(new Date()),
        current_date_short: formatDateShort(new Date()),
        current_date_ordinal: formatDateOrdinal(new Date()),
        current_year: new Date().getFullYear().toString()
    };

    return templateData;
};

/**
 * Generate document from template
 */
const generateDocument = async (templatePath, applicationId) => {
    // Read template file
    if (!fs.existsSync(templatePath)) {
        throw new Error('Template file not found');
    }

    const content = fs.readFileSync(templatePath, 'binary');

    // Create ZIP from template
    const zip = new PizZip(content);

    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // Custom parser for handling undefined values
        nullGetter: function(part) {
            if (!part.module) {
                return '';
            }
            if (part.module === 'rawxml') {
                return '';
            }
            return '';
        }
    });

    // Fetch application data
    const templateData = await fetchApplicationData(applicationId);

    // Render document with data
    doc.render(templateData);

    // Generate output buffer
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9
        }
    });

    return {
        buffer: buf,
        data: templateData
    };
};

/**
 * Get available template for an application
 */
const getTemplateForApplication = async (applicationId) => {
    // Get application's permit type
    const [applications] = await db.query(
        'SELECT permit_type_id FROM applications WHERE application_id = ?',
        [applicationId]
    );

    if (applications.length === 0) {
        throw new Error('Application not found');
    }

    const permitTypeId = applications[0].permit_type_id;

    // Try to find a default template for this permit type
    let [templates] = await db.query(`
        SELECT template_id, template_name, file_path, file_name
        FROM report_templates
        WHERE permit_type_id = ? AND is_default = TRUE AND is_active = TRUE
        LIMIT 1
    `, [permitTypeId]);

    // If no specific default, try general default
    if (templates.length === 0) {
        [templates] = await db.query(`
            SELECT template_id, template_name, file_path, file_name
            FROM report_templates
            WHERE permit_type_id IS NULL AND is_default = TRUE AND is_active = TRUE
            LIMIT 1
        `);
    }

    // If still no default, get any active template
    if (templates.length === 0) {
        [templates] = await db.query(`
            SELECT template_id, template_name, file_path, file_name
            FROM report_templates
            WHERE (permit_type_id = ? OR permit_type_id IS NULL) AND is_active = TRUE
            ORDER BY permit_type_id DESC, created_at DESC
            LIMIT 1
        `, [permitTypeId]);
    }

    if (templates.length === 0) {
        return null;
    }

    return templates[0];
};

/**
 * List available template variables for documentation
 */
const getTemplateVariables = () => {
    return {
        application: [
            { name: '{application_number}', description: 'Application number (e.g., 2025-11-001)' },
            { name: '{application_date}', description: 'Application submission date' },
            { name: '{status}', description: 'Current application status' }
        ],
        permit: [
            { name: '{permit_number}', description: 'Issued permit number' },
            { name: '{permit_type}', description: 'Type of permit' },
            { name: '{permit_description}', description: 'Permit type description' },
            { name: '{permit_valid_from}', description: 'Permit validity start date' },
            { name: '{permit_valid_until}', description: 'Permit validity end date' },
            { name: '{issued_date}', description: 'Date permit was issued' },
            { name: '{issued_date_ordinal}', description: 'Issued date with ordinal (26th day of November, 2025)' }
        ],
        business: [
            { name: '{business_name}', description: 'Name of the business/entity' },
            { name: '{entity_type}', description: 'Type of entity' },
            { name: '{registration_number}', description: 'Business registration number' },
            { name: '{contact_person}', description: 'Contact person name' },
            { name: '{email}', description: 'Business email' },
            { name: '{phone}', description: 'Business phone number' },
            { name: '{business_address}', description: 'Business address' }
        ],
        category: [
            { name: '{attribute_name}', description: 'Attribute/category name' },
            { name: '{category}', description: 'Same as attribute_name' }
        ],
        fees: [
            { name: '{#fees}...{/fees}', description: 'Loop through assessed fees' },
            { name: '{fees.row_number}', description: 'Row number in fees loop' },
            { name: '{fees.fee_name}', description: 'Name of the fee' },
            { name: '{fees.quantity}', description: 'Quantity assessed' },
            { name: '{fees.unit_amount}', description: 'Amount per unit' },
            { name: '{fees.amount}', description: 'Total amount (quantity × unit)' },
            { name: '{total_assessed}', description: 'Total assessed amount' }
        ],
        activities: [
            { name: '{#permit_activities}...{/permit_activities}', description: 'Loop through permit activities' },
            { name: '{permit_activities.activity}', description: 'Activity/fee name' },
            { name: '{permit_activities.quantity}', description: 'Quantity' },
            { name: '{permit_activities.unit_price}', description: 'Unit price' },
            { name: '{permit_activities.total_price}', description: 'Total price' }
        ],
        assessment: [
            { name: '{total_annual_fee}', description: 'Total annual fee' },
            { name: '{first_quarter}', description: 'First quarter amount' },
            { name: '{second_quarter}', description: 'Second quarter amount' },
            { name: '{third_quarter}', description: 'Third quarter amount' },
            { name: '{fourth_quarter}', description: 'Fourth quarter amount' },
            { name: '{assessed_by}', description: 'Name of assessor' },
            { name: '{assessment_date}', description: 'Date of assessment' }
        ],
        payment: [
            { name: '{total_paid}', description: 'Total amount paid' },
            { name: '{balance_due}', description: 'Remaining balance' },
            { name: '{latest_receipt_number}', description: 'Most recent receipt number' },
            { name: '{latest_payment_date}', description: 'Most recent payment date' },
            { name: '{#payments}...{/payments}', description: 'Loop through payments' }
        ],
        signatory: [
            { name: '{signatory_name}', description: 'Signatory name from settings' },
            { name: '{signatory_title}', description: 'Signatory title' },
            { name: '{signatory_department}', description: 'Signatory department' },
            { name: '{municipality_name}', description: 'Municipality name' },
            { name: '{municipality_address}', description: 'Municipality address' }
        ],
        dates: [
            { name: '{current_date}', description: 'Current date (Month Day, Year)' },
            { name: '{current_date_ordinal}', description: 'Current date with ordinal' },
            { name: '{current_year}', description: 'Current year' }
        ]
    };
};

module.exports = {
    generateDocument,
    fetchApplicationData,
    getTemplateForApplication,
    getTemplateVariables,
    formatCurrency,
    formatDate,
    formatDateOrdinal
};
