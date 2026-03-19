/**
 * Migration Script: Populate Initial HTML Report Templates
 *
 * This script creates default templates for assessment, permit, and endorsement reports.
 * Run this after running the database migration:
 *
 * node backend/migrations/populate-html-templates.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const DEFAULT_ASSESSMENT_TEMPLATE = `<div id="page-container">
  <div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.1;">
    <h2 style="text-align: center; margin-bottom: 30px;">ASSESSMENT RECORD</h2>

    <div style="margin-bottom: 20px;">
      <table style="width: 100%; margin-bottom: 10px;">
        <tr>
          <td style="width: 50%;">
            <div><strong>Trade Name:</strong> \${business_name}</div>
            <div><strong>Address:</strong> \${address}</div>
            <div><strong>Proprietor:</strong> \${owner_name}</div>
          </td>
          <td style="width: 50%; padding-left: 20px;">
            <div><strong>Application No:</strong> \${application_number}</div>
            <div><strong>Date:</strong> \${app_date}</div>
            <div><strong>Type:</strong> \${app_type}</div>
          </td>
        </tr>
      </table>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #333;">
          <th style="padding: 10px; text-align: left;">Tax/Fee</th>
          <th style="padding: 10px; text-align: right;">Amount</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px;">Assessment Fees</td>
          <td style="padding: 10px; text-align: right;">\${total_amount_due}</td>
          <td style="padding: 10px; text-align: right;">\${total_amount_due}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 40px;">
      <p><strong>Total Amount Due:</strong> \${total_amount_due}</p>
      <p><strong>Valid Until:</strong> \${validity_date}</p>
    </div>

    <div style="margin-top: 60px; text-align: center;">
      <div style="height: 40px;"></div>
      <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;">Assessed by \${prepared_by_name}</div>
    </div>
  </div>
</div>`;

const DEFAULT_PERMIT_TEMPLATE = `<div style="padding: 40px; font-family: Arial, sans-serif; text-align: center;">
  <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px;">
    \${permit_type}
  </h1>

  <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase;">
    IS HEREBY GRANTED TO
  </h2>

  <div style="margin-bottom: 20px;">
    <div style="font-size: 28px; font-weight: bold; text-decoration: underline; margin-bottom: 15px;">
      \${business_name}
    </div>
    <div style="font-size: 16px;">
      <strong>Address:</strong> \${address}
    </div>
    <div style="font-size: 16px;">
      \${barangay}, \${municipality}, \${province}
    </div>
  </div>

  <div style="text-align: justify; margin: 40px; line-height: 1.6; margin-top: 50px;">
    <p>To conduct/engage in operating <strong>\${permit_activities}</strong> on <strong>\${permit_validity_date}</strong> only.</p>

    <p style="margin-top: 30px;">
      This <strong>PERMIT</strong> is valid on the dates specified above and is subject to all existing laws, rules and ordinances of the municipal government.
    </p>

    <p style="margin-top: 30px;">
      Further, this office reserves the right to revoke this permit anytime should public safety and interest so warrant.
    </p>
  </div>

  <div style="margin-top: 60px; text-align: center;">
    <div style="height: 50px;"></div>
    <div style="border-top: 1px solid #333; width: 250px; margin: 0 auto; font-weight: bold;">
      \${municipality_name} Municipal Government
    </div>
  </div>

  <div style="position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #666;">
    Generated: \${issued_date}
  </div>
</div>`;

const DEFAULT_ENDORSEMENT_TEMPLATE = `<div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
      \${municipality_name}
    </h1>
    <p>ENDORSEMENT LETTER</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>TO ALL CONCERNED:</strong></p>
  </div>

  <div style="text-align: justify; margin: 20px 0; line-height: 1.8;">
    <p>
      This is to certify that <strong>\${business_name}</strong>, represented by
      <strong>\${owner_name}</strong>, located at <strong>\${address}</strong>,
      <strong>\${barangay}, \${municipality}, \${province}</strong>, has complied with all the
      requirements of this office.
    </p>

    <p style="margin-top: 15px;">
      This endorsement is issued upon the request of the above-named business for the purpose of
      \${permit_activities}.
    </p>

    <p style="margin-top: 15px;">
      This letter is valid until <strong>\${permit_validity_date}</strong>.
    </p>
  </div>

  <div style="margin-top: 60px;">
    <div style="height: 50px;"></div>
    <div style="text-align: center; border-top: 1px solid #333; width: 250px; margin: 0 auto;">
      <strong>\${municipality_name} Government<br/>
      Municipal Treasurer's Office</strong>
    </div>
  </div>

  <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
    Issued: \${issued_date}
  </div>
</div>`;

async function populateTemplates() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✓ Connected to database');

    // Get a system admin user ID for created_by (or use a default)
    const [admins] = await connection.execute(
      `SELECT user_id FROM users WHERE role_id IN (
        SELECT role_id FROM roles WHERE role_name IN ('Admin', 'SuperAdmin')
      ) LIMIT 1`
    );

    if (admins.length === 0) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    const adminUserId = admins[0].user_id;

    // Create templates
    const templates = [
      {
        reportType: 'assessment',
        name: 'Default Assessment Template',
        description: 'Default template for assessment reports',
        html: DEFAULT_ASSESSMENT_TEMPLATE
      },
      {
        reportType: 'permit',
        name: 'Default Permit Template',
        description: 'Default template for municipal permits',
        html: DEFAULT_PERMIT_TEMPLATE
      },
      {
        reportType: 'endorsement',
        name: 'Default Endorsement Letter',
        description: 'Default template for endorsement letters',
        html: DEFAULT_ENDORSEMENT_TEMPLATE
      }
    ];

    for (const template of templates) {
      const templateId = generateId(ID_PREFIXES.TEMPLATE);

      await connection.execute(
        `INSERT INTO html_report_templates
         (template_id, report_type, template_html, description, version, is_default, is_active, created_by)
         VALUES (?, ?, ?, ?, 1, TRUE, TRUE, ?)`,
        [templateId, template.reportType, template.html, template.description, adminUserId]
      );

      console.log(`✓ Created ${template.reportType} template: ${template.name}`);
    }

    console.log('\n✅ All templates created successfully!');
    console.log('\nYou can now:');
    console.log('1. Navigate to http://localhost:3000/admin/report-templates');
    console.log('2. Select each report type to view and edit the templates');
    console.log('3. Use the preview feature to see changes with real application data');
    console.log('4. Reports will now load templates from the database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  populateTemplates();
}

module.exports = { populateTemplates };
