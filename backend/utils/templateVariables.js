/**
 * Template Variables for HTML Report Templates
 * Defines available variables that can be used in assessment, permit, and endorsement templates
 * Variables use ${variable_name} syntax for substitution
 */

const ASSESSMENT_REPORT_VARIABLES = {
  'Application Information': [
    '{name: "application_number", description: "Application number"}',
    '{name: "application_id", description: "Unique application ID"}',
    '{name: "app_type", description: "Application/Permit type"}',
    '{name: "app_date", description: "Date when application was created"}',
  ],
  'Business Information': [
    '{name: "business_name", description: "Business/Entity name"}',
    '{name: "owner_name", description: "Owner/Proprietor name"}',
    '{name: "address", description: "Business address"}',
    '{name: "contact_person", description: "Contact person name"}',
    '{name: "email", description: "Business email"}',
    '{name: "phone", description: "Business phone number"}',
  ],
  'Assessment Data': [
    '{name: "total_amount_due", description: "Total amount due from assessment"}',
    '{name: "total_balance_due", description: "Total balance due"}',
    '{name: "total_surcharge", description: "Total surcharge amount"}',
    '{name: "total_interest", description: "Total interest amount"}',
    '{name: "prepared_by_name", description: "Name of assessor who prepared"}',
    '{name: "validity_date", description: "Bill validity date"}',
    '{name: "q1_amount", description: "Quarter 1 payment amount"}',
    '{name: "q2_amount", description: "Quarter 2 payment amount"}',
    '{name: "q3_amount", description: "Quarter 3 payment amount"}',
    '{name: "q4_amount", description: "Quarter 4 payment amount"}',
  ],
};

const PERMIT_REPORT_VARIABLES = {
  'Permit Information': [
    '{name: "permit_number", description: "Official permit number"}',
    '{name: "permit_type", description: "Type of permit issued"}',
    '{name: "issued_date", description: "Date the permit was issued"}',
    '{name: "permit_validity_date", description: "Date until permit is valid"}',
  ],
  'Business Information': [
    '{name: "business_name", description: "Name of business/entity"}',
    '{name: "address", description: "Business address"}',
    '{name: "barangay", description: "Barangay where business is located"}',
    '{name: "municipality", description: "Municipality name"}',
    '{name: "province", description: "Province name"}',
  ],
  'Permit Details': [
    '{name: "permit_activities", description: "Description of permitted activities"}',
    '{name: "contact_person", description: "Business contact person"}',
    '{name: "email", description: "Business email address"}',
    '{name: "phone", description: "Business phone number"}',
  ],
};

const ENDORSEMENT_LETTER_VARIABLES = {
  'Application Information': [
    '{name: "application_number", description: "Application number"}',
    '{name: "application_id", description: "Unique application ID"}',
    '{name: "app_date", description: "Date when application was created"}',
  ],
  'Business Information': [
    '{name: "business_name", description: "Business/Entity name"}',
    '{name: "owner_name", description: "Owner/Proprietor name"}',
    '{name: "address", description: "Business address"}',
    '{name: "barangay", description: "Barangay"}',
    '{name: "municipality", description: "Municipality name"}',
    '{name: "province", description: "Province name"}',
    '{name: "contact_person", description: "Contact person name"}',
  ],
  'Permit Details': [
    '{name: "permit_type", description: "Type of permit"}',
    '{name: "permit_activities", description: "Description of activities"}',
    '{name: "validity_date", description: "Permit validity date"}',
  ],
};

const SETTINGS_VARIABLES = {
  'Municipality Settings': [
    '{name: "municipality_name", description: "Municipality name from system settings"}',
    '{name: "municipality_address", description: "Municipality address"}',
    '{name: "municipality_province", description: "Municipality province"}',
  ],
  'Signatory Information': [
    '{name: "municipal_treasurer_name", description: "Municipal Treasurer name"}',
    '{name: "municipal_treasurer_position", description: "Municipal Treasurer position"}',
    '{name: "permit_signatory_name", description: "Permit signatory name"}',
    '{name: "permit_signatory_title", description: "Permit signatory title"}',
  ],
};

/**
 * Get all available variables for a specific report type
 * @param {string} reportType - 'assessment', 'permit', or 'endorsement'
 * @returns {Object} Variables organized by category
 */
function getVariablesForReportType(reportType) {
  switch(reportType.toLowerCase()) {
    case 'assessment':
      return { ...ASSESSMENT_REPORT_VARIABLES, ...SETTINGS_VARIABLES };
    case 'permit':
      return { ...PERMIT_REPORT_VARIABLES, ...SETTINGS_VARIABLES };
    case 'endorsement':
      return { ...ENDORSEMENT_LETTER_VARIABLES, ...SETTINGS_VARIABLES };
    default:
      return {};
  }
}

/**
 * Get all variables as a flat array
 * @param {string} reportType - 'assessment', 'permit', or 'endorsement'
 * @returns {Array} Array of variable objects {name, description}
 */
function getVariablesAsArray(reportType) {
  const variables = getVariablesForReportType(reportType);
  const result = [];

  Object.values(variables).forEach(categoryVars => {
    categoryVars.forEach(varStr => {
      try {
        const varObj = eval('(' + varStr + ')');
        result.push(varObj);
      } catch(e) {
        console.error('Error parsing variable:', varStr);
      }
    });
  });

  return result;
}

module.exports = {
  ASSESSMENT_REPORT_VARIABLES,
  PERMIT_REPORT_VARIABLES,
  ENDORSEMENT_LETTER_VARIABLES,
  SETTINGS_VARIABLES,
  getVariablesForReportType,
  getVariablesAsArray,
};
