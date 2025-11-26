const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

/**
 * Generate PDF permit for an application
 * @param {number} applicationId - Application ID
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePermitPDF = async (applicationId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get application details
      const [applications] = await pool.execute(
        `SELECT 
          a.*,
          e.entity_name,
          e.contact_person,
          e.email,
          e.phone,
          u1.full_name as creator_name
         FROM Applications a
         INNER JOIN Entities e ON a.entity_id = e.entity_id
         INNER JOIN Users u1 ON a.creator_id = u1.user_id
         WHERE a.application_id = ? AND a.status = 'Approved'`,
        [applicationId]
      );

      if (applications.length === 0) {
        return reject(new Error('Application not found or not approved'));
      }

      const app = applications[0];

      // Get parameters
      const [parameters] = await pool.execute(
        'SELECT * FROM Application_Parameters WHERE application_id = ?',
        [applicationId]
      );

      // Get assessed fees
      const [assessedFees] = await pool.execute(
        `SELECT 
          fc.fee_name,
          fcat.category_name,
          af.assessed_amount
         FROM Assessed_Fees af
         INNER JOIN Fees_Charges fc ON af.fee_id = fc.fee_id
         INNER JOIN Fees_Categories fcat ON fc.category_id = fcat.category_id
         WHERE af.application_id = ?
         ORDER BY fcat.category_name, fc.fee_name`,
        [applicationId]
      );

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with logo
      const logoPath = path.join(__dirname, '..', 'assets', 'dalaguete-logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, doc.page.width / 2 - 40, 50, { width: 80, height: 80, align: 'center' });
          doc.y = 140;
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }
      
      doc.fontSize(20).text('PERMIT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(
        app.application_number || `Application #${app.application_id}`, 
        { align: 'center' }
      );
      doc.moveDown(2);

      // Permit Details
      doc.fontSize(14).text('Permit Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`Permit Type: ${app.permit_type}`);
      doc.text(`Status: ${app.status}`);
      doc.text(`Issue Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Entity Information
      doc.fontSize(14).text('Applicant Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`Entity Name: ${app.entity_name}`);
      if (app.contact_person) doc.text(`Contact Person: ${app.contact_person}`);
      if (app.email) doc.text(`Email: ${app.email}`);
      if (app.phone) doc.text(`Phone: ${app.phone}`);
      doc.moveDown();

      // Parameters
      if (parameters.length > 0) {
        doc.fontSize(14).text('Application Parameters', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        parameters.forEach((param) => {
          doc.text(`${param.param_name}: ${param.param_value || 'N/A'}`);
        });
        doc.moveDown();
      }

      // Fees
      if (assessedFees.length > 0) {
        doc.fontSize(14).text('Assessed Fees', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);

        let total = 0;
        assessedFees.forEach((fee) => {
          const amount = parseFloat(fee.assessed_amount);
          total += amount;
          doc.text(`${fee.fee_name} (${fee.category_name}): $${amount.toFixed(2)}`);
        });
        doc.moveDown(0.5);
        doc.fontSize(14).text(`Total Amount: $${total.toFixed(2)}`, { align: 'right' });
        doc.moveDown();
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).text(
        `This permit was generated on ${new Date().toLocaleString()}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Assessment Record PDF for an application
 * @param {number} applicationId - Application ID
 * @param {string} printedBy - Name of user printing the document
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateAssessmentReportPDF = async (applicationId, printedBy = 'System') => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`[PDF Generator] Starting PDF generation for application ${applicationId}`);
      
      // Get assessment record from database
      const [assessmentRecords] = await pool.execute(
        `SELECT 
          ar.*,
          u1.full_name as prepared_by_name,
          u2.full_name as approved_by_name
         FROM Assessment_Records ar
         LEFT JOIN Users u1 ON ar.prepared_by_user_id = u1.user_id
         LEFT JOIN Users u2 ON ar.approved_by_user_id = u2.user_id
         WHERE ar.application_id = ?`,
        [applicationId]
      );

      if (assessmentRecords.length === 0) {
        console.error(`[PDF Generator] Assessment record not found for application ${applicationId}`);
        return reject(new Error('Assessment record not found. Please submit the assessment first.'));
      }

      const assessment = assessmentRecords[0];
      console.log(`[PDF Generator] Found assessment record: ${assessment.assessment_id}`);

      // Get application parameters for additional info
      const [parameters] = await pool.execute(
        'SELECT * FROM Application_Parameters WHERE application_id = ?',
        [applicationId]
      );

      const paramsObj = {};
      parameters.forEach(p => {
        const key = p.param_name.toLowerCase().replace(/\s+/g, '_');
        paramsObj[key] = p.param_value;
      });

      // Get assessment record fees with categories
      const [assessmentFees] = await pool.execute(
        `SELECT 
          arf.fee_name,
          arf.amount,
          arf.quantity,
          arf.balance_due,
          arf.surcharge,
          arf.interest,
          arf.total,
          fc.category_id,
          fcat.category_name
         FROM Assessment_Record_Fees arf
         INNER JOIN Fees_Charges fc ON arf.fee_id = fc.fee_id
         INNER JOIN Fees_Categories fcat ON fc.category_id = fcat.category_id
         WHERE arf.assessment_id = ?
         ORDER BY fcat.category_name, arf.fee_name`,
        [assessment.assessment_id]
      );

      if (assessmentFees.length === 0) {
        return reject(new Error('No fees found in assessment record'));
      }

      // Group fees by category
      const feesByCategory = {};
      assessmentFees.forEach(fee => {
        const category = fee.category_name || 'Other Charge';
        if (!feesByCategory[category]) {
          feesByCategory[category] = [];
        }
        feesByCategory[category].push(fee);
      });

      // Get system settings
      const [settings] = await pool.execute(
        'SELECT setting_key, setting_value FROM System_Settings WHERE setting_key IN (?, ?, ?)',
        ['default_municipality', 'default_province', 'default_country']
      );

      const settingsObj = {};
      settings.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      const municipality = settingsObj.default_municipality || 'Dalaguete';
      const province = settingsObj.default_province || 'Cebu';

      // Extract data
      const bin = paramsObj.bin || paramsObj.business_identification_number || assessment.app_number || '';
      const tradeName = assessment.business_name || '';
      const businessAddress = assessment.address || '';
      const proprietorName = assessment.owner_name || assessment.business_name || '';
      const proprietorId = paramsObj.proprietor_id || paramsObj.owner_id || '';
      const proprietorDisplay = proprietorId ? `${proprietorName} (${proprietorId})` : proprietorName;
      const ownerAddress = paramsObj.owner_address || paramsObj.proprietor_address || businessAddress || '';
      
      // Barcode format: prefix:application_number (e.g., "51005:B0432120210600014-5R")
      const barcodePrefix = paramsObj.barcode_prefix || '51005';
      const barcodeId = assessment.app_number ? `${barcodePrefix}:${assessment.app_number}` : `${barcodePrefix}:${applicationId}`;
      
      const appDate = new Date(assessment.app_date);
      const assessmentDate = new Date(assessment.created_at);
      const year = appDate.getFullYear();
      const appType = assessment.app_type || 'NEW';
      
      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).replace(',', '');
      };

      const formatShortDate = (date) => {
        // Format: "Nov 20 2025" (no comma)
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${month} ${day} ${year}`;
      };

      const formatMonthYear = (date) => {
        // Format: "Nov 2025"
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${month} ${year}`;
      };

      const formatFullDate = (date) => {
        // Format: "November 30, 2025"
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      };

      const formatPrintDate = (date) => {
        // Format: "Thursday, November 20, 2025 at 11:58"
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const day = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${weekday}, ${month} ${day}, ${year} at ${hours}:${minutes}`;
      };

      // Get the last weekday (Mon-Fri) of the current month based on application date
      const getLastWeekdayOfMonth = (baseDate) => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        // Get last day of the month
        const lastDay = new Date(year, month + 1, 0);
        // If it's Saturday (6), go back 1 day; if Sunday (0), go back 2 days
        const dayOfWeek = lastDay.getDay();
        if (dayOfWeek === 6) {
          lastDay.setDate(lastDay.getDate() - 1); // Saturday -> Friday
        } else if (dayOfWeek === 0) {
          lastDay.setDate(lastDay.getDate() - 2); // Sunday -> Friday
        }
        return lastDay;
      };

      // Bill validity is the last weekday of the application's current month
      const validityDate = getLastWeekdayOfMonth(appDate);
      const validityFormatted = formatFullDate(validityDate);
      const assessmentDateFormatted = formatShortDate(assessmentDate);
      
      // Print date format: "Thursday, November 20, 2025 at 11:58"
      const now = new Date();
      const printDateTime = formatPrintDate(now);
      
      // Reference number (numeric part of application number)
      const referenceNumber = assessment.app_number ? assessment.app_number.replace(/[^0-9]/g, '') : applicationId.toString();

      // Get quarterly amounts from database
      const q1 = parseFloat(assessment.q1_amount || 0);
      const q2 = parseFloat(assessment.q2_amount || 0);
      const q3 = parseFloat(assessment.q3_amount || 0);
      const q4 = parseFloat(assessment.q4_amount || 0);

      // Calculate totals by category using amount (assessed amount) not balance_due
      let totalTaxBase = 0;
      let totalRegFees = 0;
      let totalOtherCharges = 0;

      Object.keys(feesByCategory).forEach(category => {
        const categoryTotal = feesByCategory[category].reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
        if (category.toLowerCase().includes('tax') || category.toLowerCase().includes('business')) {
          totalTaxBase += categoryTotal;
        } else if (category.toLowerCase().includes('regulatory') || category.toLowerCase().includes('reg')) {
          totalRegFees += categoryTotal;
        } else {
          totalOtherCharges += categoryTotal;
        }
      });

      // Calculate totals for surcharge, interest, and discount
      let totalSurcharge = 0;
      let totalInterest = 0;
      let totalDiscount = 0;
      let totalAmount = 0;
      let totalBalanceDue = 0;

      assessmentFees.forEach(fee => {
        totalSurcharge += parseFloat(fee.surcharge || 0);
        totalInterest += parseFloat(fee.interest || 0);
        totalDiscount += 0; // Discount not currently tracked
        totalAmount += parseFloat(fee.amount || 0);
        totalBalanceDue += parseFloat(fee.balance_due || fee.amount || 0);
      });

      const totalAmountDue = q1 + q2 + q3 + q4;

      console.log(`[PDF Generator] Creating PDF document`);

      const doc = new PDFDocument({
        margin: 36, // Match template margin
        size: 'A4'
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        console.log(`[PDF Generator] PDF generation completed, buffer size: ${chunks.length} chunks`);
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (error) => {
        console.error('[PDF Generator] PDF document error:', error);
        reject(error);
      });

      const currency = (value) =>
        `₱${Number(value || 0).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;

      // Background image (if available)
      const bgImagePath = path.join(__dirname, '..', 'assets', 'assessment_template', 'bg1.png');
      if (fs.existsSync(bgImagePath)) {
        try {
          doc.image(bgImagePath, 36, 0, { width: 540, height: 792 });
        } catch (error) {
          console.error('Error loading background image:', error);
        }
      }

      // Logo (if available) - positioned on top left
      const logoPath = path.join(__dirname, '..', 'assets', 'dalaguete-logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 36, 20, { width: 60, height: 60 });
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }

      // Start positioning from top
      let yPos = 50;

      // Header Section - Matching template order: Republic, Province, Municipality
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('REPUBLIC OF THE PHILIPPINES', 36, yPos, { width: doc.page.width - 72, align: 'center' });
      yPos += 12;
      doc.text(`PROVINCE OF ${province.toUpperCase()}`, 36, yPos, { width: doc.page.width - 72, align: 'center' });
      yPos += 12;
      doc.text(`MUNICIPALITY OF ${municipality.toUpperCase()}`, 36, yPos, { width: doc.page.width - 72, align: 'center' });
      yPos += 12;
      
      // Municipal Treasurer's Office
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text("MUNICIPAL TREASURER'S OFFICE", 36, yPos, { width: doc.page.width - 72, align: 'center' });
      yPos += 12;

      // Right side - Application No, Type, and Date
      const rightX = 468;
      doc.font('Helvetica').fontSize(8);
      doc.text('Application No :', 412, 50);
      doc.text(assessment.app_number || `#${applicationId}`, rightX, 50);
      doc.text('Type :', 446, 62);
      doc.text(`${appType}  (${year})`, rightX, 62);
      doc.text('Date :', 446, 74);
      doc.text(assessmentDateFormatted, rightX, 74);

      // Assessment Record Title
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('ASSESSMENT RECORD', 36, yPos, { width: doc.page.width - 72, align: 'center' });
      yPos += 20;

      // Business Information Section
      yPos = 120;
      doc.font('Helvetica').fontSize(8);
      doc.text('Trade Name', 38, yPos);
      doc.text(':', 88, yPos);
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(tradeName || 'N/A', 95, yPos);
      
      yPos += 12;
      doc.font('Helvetica').fontSize(8);
      doc.text('Address', 38, yPos);
      doc.text(':', 88, yPos);
      doc.text(businessAddress || 'N/A', 95, yPos);
      
      yPos += 12;
      doc.text('Proprietor', 38, yPos);
      doc.text(':', 88, yPos);
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(proprietorDisplay || 'N/A', 95, yPos);
      
      yPos += 12;
      doc.font('Helvetica').fontSize(8);
      doc.text('Address', 38, yPos);
      doc.text(':', 88, yPos);
      doc.text(ownerAddress || 'N/A', 95, yPos);

      // Table Headers
      yPos = 200;
      doc.font('Helvetica-Bold').fontSize(8);
      // Top row headers
      doc.text('Tax/Fee', 38, yPos);
      doc.text('Amount', 129, yPos);
      doc.text('Discount', 324, yPos);
      doc.text('Surcharge', 433, yPos);
      doc.text('Total', 519, yPos);
      
      // Second row headers
      doc.text('Status', 211, yPos + 12);
      doc.text('Interest', 432, yPos + 12);
      doc.text('Balance Due', 342, yPos + 12);

      // Assessment Information and Billing Information headers
      doc.text('Assessment Information', 129, yPos + 12);
      doc.text('Billing Information', 324, yPos + 12);

      yPos += 30;

      // Process fees grouped by their actual category names
      let currentY = yPos;
      const lineHeight = 11;
      
      // Get all category names and sort them to maintain consistent order
      const categoryNames = Object.keys(feesByCategory).sort();
      
      categoryNames.forEach((categoryName, categoryIndex) => {
        const categoryFees = feesByCategory[categoryName];
        
        if (categoryFees.length > 0) {
          // Category header
          if (categoryIndex > 0) {
            currentY += 5; // Space between categories
          }
          doc.font('Helvetica-Bold').fontSize(8);
          doc.text(categoryName, 38, currentY);
          currentY += 12;
          
          // List fees in this category
          categoryFees.forEach(fee => {
            doc.font('Helvetica').fontSize(7);
            doc.text(fee.fee_name.toUpperCase(), 38, currentY);
            doc.text(currency(fee.amount || 0), 129, currentY);
            doc.text(currency(0), 324, currentY); // Discount
            doc.text(currency(fee.surcharge || 0), 433, currentY);
            doc.text(currency(fee.interest || 0), 432, currentY);
            doc.text(currency(fee.total || fee.amount || 0), 519, currentY);
            doc.text(appType, 211, currentY);
            doc.text(currency(fee.balance_due || fee.amount || 0), 342, currentY);
            currentY += lineHeight;
          });
        }
      });

      // Totals Section
      const totalsY = 583;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('TOTALS', 42, totalsY);
      
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(currency(totalSurcharge), 468, totalsY);
      doc.text(currency(totalInterest), 468, totalsY - 12);
      doc.text(currency(0), 468, totalsY - 24); // Discount
      doc.text(currency(totalBalanceDue), 342, totalsY);
      
      // Category Totals - Calculate totals by actual category names
      const categoryTotalsY = 574;
      let categoryTotalY = categoryTotalsY;
      
      // Calculate totals for each category
      categoryNames.forEach(categoryName => {
        const categoryTotal = feesByCategory[categoryName].reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
        if (categoryTotal > 0) {
          doc.font('Helvetica').fontSize(9);
          doc.text(`${categoryName}:`, 129, categoryTotalY);
          doc.font('Helvetica-Bold');
          doc.text(currency(categoryTotal), 209, categoryTotalY);
          categoryTotalY += 12;
        }
      });

      // Total Amount Due and Bill Validity
      // Calculate total amount due from all fees (amount + surcharge + interest)
      const calculatedTotalAmountDue = assessmentFees.reduce((sum, fee) => {
        return sum + parseFloat(fee.amount || 0) + parseFloat(fee.surcharge || 0) + parseFloat(fee.interest || 0);
      }, 0);
      
      const totalDueY = 526;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('TOTAL AMOUNT DUE', 342, totalDueY);
      doc.text(':', 413, totalDueY);
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(currency(calculatedTotalAmountDue), 504, totalDueY);
      
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('BILL IS VALID UNTIL', 342, totalDueY + 12);
      doc.text(':', 413, totalDueY + 12);
      doc.font('Helvetica-Bold').fontSize(9);
      const validityDateFormatted = formatFullDate(validityDate);
      doc.text(validityDateFormatted, 420, totalDueY + 12);

      // Signatures Section
      const sigY = 344;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(assessment.approved_by_name || '__________________', 0, sigY);
      doc.font('Helvetica').fontSize(8);
      doc.text('ACTING MUNICIPAL TREASURER', 383, sigY + 12);

      // Certification Text
      const certY = 476;
      doc.font('Helvetica').fontSize(8);
      doc.text('         This is to certify that the above information supplied by me is true and correct to the best of my knowledge and belief.', 38, certY, { width: 540 });
      doc.font('Times-Italic').fontSize(8);
      doc.text('(Owner/Proprietor/Administrator)', 389, certY + 12);

      // Notarization Text
      const notarY = 415;
      doc.font('Helvetica').fontSize(8);
      const notarText = `                   SUBSCRIBED AND SWORN TO before me this  ${appDate.getDate()}  day of  ${appDate.toLocaleDateString('en-US', { month: 'long' })} ,${year} , affiant exhibited his/her Residence`;
      doc.text(notarText, 61, notarY, { width: 500 });
      doc.text('Certificate No.              issued on            at DALAGUETE, Philippines.', 61, notarY + 10, { width: 500 });
      
      doc.font('Times-Italic').fontSize(8);
      doc.text('* Subject however to existing rules, relative regulations,', 61, notarY + 22);
      doc.text('local ordinances of the foregoing', 61, notarY + 34);

      // Footer
      const footerY = 50;
      doc.font('Helvetica').fontSize(7);
      doc.text('GENERATED BY : ETRACS System 2.5   Form Version 1.0', 44, footerY);
      doc.text(`ASSESSED BY: ${assessment.prepared_by_name || 'N/A'}`, 287, footerY);
      doc.text(`PRINTED BY : ${printedBy}  PRINT DATE : ${now.toISOString().replace('T', ' ').substring(0, 19)}`, 44, footerY + 10);
      doc.text('Page 1 of 1', 531, footerY + 10);

      console.log(`[PDF Generator] Finalizing PDF document`);
      doc.end();
    } catch (error) {
      console.error('[PDF Generator] Error in PDF generation:', error);
      console.error('[PDF Generator] Error stack:', error.stack);
      reject(error);
    }
  });
};

/**
 * Get assessment data for HTML/PDF generation
 * @param {number} applicationId - Application ID
 * @returns {Promise<Object>} Assessment data object
 */
const getAssessmentData = async (applicationId) => {
  // Get assessment record from database with entity info
  const [assessmentRecords] = await pool.execute(
    `SELECT 
      ar.*,
      a.entity_id,
      e.address as entity_address,
      u1.full_name as prepared_by_name,
      u2.full_name as approved_by_name
     FROM Assessment_Records ar
     INNER JOIN Applications a ON ar.application_id = a.application_id
     INNER JOIN Entities e ON a.entity_id = e.entity_id
     LEFT JOIN Users u1 ON ar.prepared_by_user_id = u1.user_id
     LEFT JOIN Users u2 ON ar.approved_by_user_id = u2.user_id
     WHERE ar.application_id = ?`,
    [applicationId]
  );

  if (assessmentRecords.length === 0) {
    throw new Error('Assessment record not found. Please submit the assessment first.');
  }

  const assessment = assessmentRecords[0];

  // Get application parameters for additional info
  const [parameters] = await pool.execute(
    'SELECT * FROM Application_Parameters WHERE application_id = ?',
    [applicationId]
  );

  const paramsObj = {};
  parameters.forEach(p => {
    const key = p.param_name.toLowerCase().replace(/\s+/g, '_');
    paramsObj[key] = p.param_value;
  });

  // Get assessment record fees with categories
  const [assessmentFees] = await pool.execute(
    `SELECT 
      arf.fee_name,
      arf.amount,
      arf.quantity,
      arf.balance_due,
      arf.surcharge,
      arf.interest,
      arf.total,
      fc.category_id,
      fcat.category_name
     FROM Assessment_Record_Fees arf
     INNER JOIN Fees_Charges fc ON arf.fee_id = fc.fee_id
     INNER JOIN Fees_Categories fcat ON fc.category_id = fcat.category_id
     WHERE arf.assessment_id = ?
     ORDER BY fcat.category_name, arf.fee_name`,
    [assessment.assessment_id]
  );

  if (assessmentFees.length === 0) {
    throw new Error('No fees found in assessment record');
  }

  // Group fees by category
  const feesByCategory = {};
  assessmentFees.forEach(fee => {
    const category = fee.category_name || 'Other Charge';
    if (!feesByCategory[category]) {
      feesByCategory[category] = [];
    }
    feesByCategory[category].push(fee);
  });

  // Get system settings
  const [settings] = await pool.execute(
    'SELECT setting_key, setting_value FROM System_Settings WHERE setting_key IN (?, ?, ?)',
    ['default_municipality', 'default_province', 'default_country']
  );

  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.setting_key] = s.setting_value;
  });

  const municipality = settingsObj.default_municipality || 'Dalaguete';
  const province = settingsObj.default_province || 'Cebu';

  // Extract data
  const bin = paramsObj.bin || paramsObj.business_identification_number || assessment.app_number || '';
  const tradeName = assessment.business_name || '';
  const businessAddress = assessment.entity_address || assessment.address || '';
  const proprietorName = assessment.owner_name || assessment.business_name || '';
  const proprietorId = paramsObj.proprietor_id || paramsObj.owner_id || '';
  const proprietorDisplay = proprietorId ? `${proprietorName} (${proprietorId})` : proprietorName;
  const ownerAddress = assessment.entity_address || assessment.address || paramsObj.owner_address || paramsObj.proprietor_address || '';
  
  // Barcode format: prefix:application_number
  const barcodePrefix = paramsObj.barcode_prefix || '51005';
  const barcodeId = assessment.app_number ? `${barcodePrefix}:${assessment.app_number}` : `${barcodePrefix}:${applicationId}`;
  
  const appDate = new Date(assessment.app_date);
  const assessmentDate = new Date(assessment.created_at);
  const year = appDate.getFullYear();
  const appType = assessment.app_type || 'NEW';
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).replace(',', '');
  };

  const formatShortDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
  };

  const formatMonthYear = (date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const formatFullDate = (date) => {
    // Format: "November 30, 2025"
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Get the last weekday (Mon-Fri) of the current month based on application date
  const getLastWeekdayOfMonth = (baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // If it's Saturday (6), go back 1 day; if Sunday (0), go back 2 days
    const dayOfWeek = lastDay.getDay();
    if (dayOfWeek === 6) {
      lastDay.setDate(lastDay.getDate() - 1); // Saturday -> Friday
    } else if (dayOfWeek === 0) {
      lastDay.setDate(lastDay.getDate() - 2); // Sunday -> Friday
    }
    return lastDay;
  };

  // Bill validity is the last weekday of the application's current month
  const validityDate = getLastWeekdayOfMonth(appDate);
  const validityFormatted = formatFullDate(validityDate);
  const assessmentDateFormatted = formatShortDate(assessmentDate);
  
  const now = new Date();
  const referenceNumber = assessment.app_number ? assessment.app_number.replace(/[^0-9]/g, '') : applicationId.toString();

  // Get quarterly amounts
  const q1 = parseFloat(assessment.q1_amount || 0);
  const q2 = parseFloat(assessment.q2_amount || 0);
  const q3 = parseFloat(assessment.q3_amount || 0);
  const q4 = parseFloat(assessment.q4_amount || 0);

  // Calculate totals
  let totalTaxBase = 0;
  let totalRegFees = 0;
  let totalOtherCharges = 0;
  let totalSurcharge = 0;
  let totalInterest = 0;
  let totalBalanceDue = 0;

  Object.keys(feesByCategory).forEach(category => {
    const categoryTotal = feesByCategory[category].reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
    if (category.toLowerCase().includes('tax') || category.toLowerCase().includes('business')) {
      totalTaxBase += categoryTotal;
    } else if (category.toLowerCase().includes('regulatory') || category.toLowerCase().includes('reg')) {
      totalRegFees += categoryTotal;
    } else {
      totalOtherCharges += categoryTotal;
    }
  });

  assessmentFees.forEach(fee => {
    totalSurcharge += parseFloat(fee.surcharge || 0);
    totalInterest += parseFloat(fee.interest || 0);
    totalBalanceDue += parseFloat(fee.balance_due || fee.amount || 0);
  });

  const totalAmountDue = q1 + q2 + q3 + q4;

  const currency = (value) =>
    `₱${Number(value || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  return {
    assessment,
    feesByCategory,
    assessmentFees,
    municipality,
    province,
    bin,
    tradeName,
    businessAddress,
    proprietorDisplay,
    ownerAddress,
    barcodeId,
    appDate,
    assessmentDate,
    year,
    appType,
    assessmentDateFormatted,
    validityFormatted,
    validityDate,
    referenceNumber,
    q1,
    q2,
    q3,
    q4,
    totalTaxBase,
    totalRegFees,
    totalOtherCharges,
    totalSurcharge,
    totalInterest,
    totalBalanceDue,
    totalAmountDue,
    currency,
    applicationId
  };
};

/**
 * Generate Assessment Report HTML
 * @param {number} applicationId - Application ID
 * @param {string} printedBy - Name of user printing the document
 * @param {string} token - Authentication token for PDF download
 * @returns {Promise<string>} HTML string
 */
const generateAssessmentReportHTML = async (applicationId, printedBy = 'System', token = '') => {
  try {
    const data = await getAssessmentData(applicationId);
    const apiBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL?.replace(':3000', ':5000') || 'http://localhost:5000';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Assessment Report - ${data.assessment.app_number || `#${applicationId}`}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .header h2 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
        }
        .info-value {
            flex: 1;
        }
        .fees-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .fees-table th,
        .fees-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .fees-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .totals {
            margin-top: 20px;
            text-align: right;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading" id="loading">
            Generating PDF... Please wait.
        </div>
        <div id="content" style="display: none;">
            <div class="header">
                <h1>REPUBLIC OF THE PHILIPPINES</h1>
                <h2>MUNICIPALITY OF ${data.municipality.toUpperCase()}</h2>
                <h2>PROVINCE OF ${data.province.toUpperCase()}</h2>
                <h2 style="margin-top: 20px;">ASSESSMENT RECORD</h2>
            </div>
            
            <div class="info-section">
                <div class="info-row">
                    <span class="info-label">Application No:</span>
                    <span class="info-value">${data.assessment.app_number || `#${applicationId}`}</span>
                    <span class="info-label" style="margin-left: 40px;">Type:</span>
                    <span class="info-value">${data.appType} (${data.year})</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${data.assessmentDateFormatted}</span>
                </div>
            </div>

            <div class="info-section">
                <h3>Business Information</h3>
                <div class="info-row">
                    <span class="info-label">Trade Name:</span>
                    <span class="info-value">${data.tradeName || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${data.businessAddress || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Proprietor:</span>
                    <span class="info-value">${data.proprietorDisplay || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Owner Address:</span>
                    <span class="info-value">${data.ownerAddress || 'N/A'}</span>
                </div>
            </div>

            <table class="fees-table">
                <thead>
                    <tr>
                        <th>Tax/Fee</th>
                        <th>Amount</th>
                        <th>Discount</th>
                        <th>Surcharge</th>
                        <th>Interest</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Balance Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(data.feesByCategory).sort().map(category => {
                      const fees = data.feesByCategory[category];
                      const categoryTotal = fees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
                      return `
                        <tr style="background-color: #f9f9f9;">
                            <td colspan="8" style="font-weight: bold; padding: 8px;">${category}</td>
                        </tr>
                        ${fees.map(fee => `
                        <tr>
                            <td>${fee.fee_name.toUpperCase()}</td>
                            <td>${data.currency(fee.amount || 0)}</td>
                            <td>${data.currency(0)}</td>
                            <td>${data.currency(fee.surcharge || 0)}</td>
                            <td>${data.currency(fee.interest || 0)}</td>
                            <td>${data.currency(fee.total || fee.amount || 0)}</td>
                            <td>${data.appType}</td>
                            <td>${data.currency(fee.balance_due || fee.amount || 0)}</td>
                        </tr>
                      `).join('')}
                      `;
                    }).join('')}
                </tbody>
            </table>

            <div class="totals">
                ${Object.keys(data.feesByCategory).sort().map(category => {
                  const categoryTotal = data.feesByCategory[category].reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
                  if (categoryTotal > 0) {
                    return `
                    <div class="totals-row">
                        <span><strong>${category}:</strong></span>
                        <span>${data.currency(categoryTotal)}</span>
                    </div>
                    `;
                  }
                  return '';
                }).join('')}
                <div class="totals-row">
                    <span><strong>Total Surcharge:</strong></span>
                    <span>${data.currency(data.totalSurcharge)}</span>
                </div>
                <div class="totals-row">
                    <span><strong>Total Interest:</strong></span>
                    <span>${data.currency(data.totalInterest)}</span>
                </div>
                <div class="totals-row">
                    <span><strong>Total Balance Due:</strong></span>
                    <span>${data.currency(data.totalBalanceDue)}</span>
                </div>
                <div class="totals-row" style="margin-top: 20px; font-size: 18px;">
                    <span><strong>TOTAL AMOUNT DUE:</strong></span>
                    <span><strong>${data.currency(data.totalAmountDue)}</strong></span>
                </div>
                <div class="totals-row">
                    <span><strong>BILL IS VALID UNTIL:</strong></span>
                    <span><strong>${data.validityFormatted}</strong></span>
                </div>
            </div>

            <div style="margin-top: 40px; text-align: center;">
                <p><strong>${data.assessment.approved_by_name || '__________________'}</strong></p>
                <p>ACTING MUNICIPAL TREASURER</p>
            </div>

            <div style="margin-top: 40px; font-size: 12px;">
                <p>GENERATED BY: ETRACS System 2.5   Form Version 1.0</p>
                <p>ASSESSED BY: ${data.assessment.prepared_by_name || 'N/A'}</p>
                <p>PRINTED BY: ${printedBy}   PRINT DATE: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}</p>
            </div>
        </div>
    </div>

    <script>
        // Auto-download PDF when page loads
        window.addEventListener('load', function() {
            const applicationId = ${applicationId};
            const pdfUrl = '${backendUrl}/api/applications/' + applicationId + '/assessment';
            
            // Get token from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            let authToken = urlParams.get('token') || '';
            
            // Try localStorage as fallback (if same origin)
            if (!authToken) {
                try {
                    authToken = localStorage.getItem('token') || '';
                } catch(e) {
                    // Cross-origin or localStorage not available
                }
            }
            
            // Fetch PDF with authentication
            const headers = {};
            if (authToken) {
                headers['Authorization'] = 'Bearer ' + authToken;
            }
            
            fetch(pdfUrl, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to download PDF: ' + response.status);
                }
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'assessment-' + applicationId + '.pdf';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                // Show content after download starts
                setTimeout(function() {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('content').style.display = 'block';
                }, 1000);
            })
            .catch(error => {
                console.error('Error downloading PDF:', error);
                document.getElementById('loading').innerHTML = 
                    '<p style="color: red;">Error downloading PDF: ' + error.message + '</p>' +
                    '<p><a href="' + pdfUrl + '" target="_blank">Click here to download manually</a></p>';
            });
        });
    </script>
</body>
</html>`;

    return html;
  } catch (error) {
    throw error;
  }
};

module.exports = { generatePermitPDF, generateAssessmentReportPDF, generateAssessmentReportHTML, getAssessmentData };

