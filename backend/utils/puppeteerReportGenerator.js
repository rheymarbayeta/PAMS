'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'reports');

// Singleton browser instance shared across requests
let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) {
    return _browser;
  }
  _browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
    ],
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

/**
 * Render an HTML string to a PDF Buffer using Puppeteer.
 * @param {string} html    - Full HTML document content
 * @param {Object} options - Optional overrides: { width, height, format, margin }
 * @returns {Promise<Buffer>}
 */
async function generatePDFFromHTML(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfOpts = {
      printBackground: true,
      margin: options.margin || { top: '0', right: '0', bottom: '0', left: '0' },
    };
    if (options.width && options.height) {
      pdfOpts.width = options.width;
      pdfOpts.height = options.height;
    } else {
      pdfOpts.format = options.format || 'A4';
    }
    const pdfBuffer = await page.pdf(pdfOpts);
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

/**
 * Load an HTML template file and substitute {{placeholders}}.
 * @param {string} templateName - e.g. 'applications' or 'permits'
 * @param {Object} vars - key/value pairs to replace in the template
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, vars) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}

/**
 * Escape a value for safe inclusion in CSV.
 */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a number as Philippine Peso currency.
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string to a readable local date.
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Sanitize a string for safe HTML injection (prevent XSS in template data).
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Map a status string to a CSS class.
 */
function statusClass(status) {
  if (!status) return 'status-other';
  const s = status.toLowerCase();
  if (s === 'approved')  return 'status-approved';
  if (s.startsWith('pending')) return 'status-pending';
  if (s === 'rejected' || s === 'denied') return 'status-rejected';
  if (s === 'draft')     return 'status-draft';
  return 'status-other';
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

function buildApplicationsRows(records) {
  return records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.application_number || r.application_id)}</td>
      <td>${escapeHtml(r.business_name)}</td>
      <td>${escapeHtml(r.permit_type_name)}</td>
      <td>${escapeHtml(r.attribute_name)}</td>
      <td><span class="status-badge ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td class="amount">${formatCurrency(r.total_amount_due)}</td>
      <td>${formatDate(r.created_at)}</td>
    </tr>`).join('\n');
}

function buildPermitsRows(records) {
  return records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.application_number || r.application_id)}</td>
      <td>${escapeHtml(r.business_name)}</td>
      <td>${escapeHtml(r.owner_name)}</td>
      <td>${escapeHtml(r.address)}</td>
      <td>${escapeHtml(r.permit_type_name)}</td>
      <td><span class="status-badge ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td class="amount">${formatCurrency(r.total_amount_due)}</td>
      <td class="amount">${formatCurrency(r.total_balance_due)}</td>
      <td>${formatDate(r.created_at)}</td>
    </tr>`).join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a report in the requested format.
 *
 * @param {Object} opts
 * @param {string}   opts.templateName  - 'applications' or 'permits'
 * @param {string}   opts.format        - 'pdf' | 'html' | 'csv' | 'xlsx' | 'xml'
 * @param {Array}    opts.records       - Array of data rows from the database
 * @param {string}   opts.generatedAt   - ISO timestamp string
 * @param {string}   opts.generatedBy   - User display name
 * @param {number}   opts.totalRecords  - Row count
 * @param {number}   opts.totalAmount   - Sum of amounts
 *
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
async function generateReport({ templateName, format, records, generatedAt, generatedBy, totalRecords, totalAmount }) {
  const fmt = (format || 'pdf').toLowerCase();
  const name = (templateName || 'applications').toLowerCase();

  // --- CSV / XLSX -----------------------------------------------------------
  if (fmt === 'csv' || fmt === 'xlsx' || fmt === 'xls') {
    const lines = [];
    if (name === 'permits') {
      lines.push(['#', 'Application No.', 'Business Name', 'Owner', 'Address', 'Permit Type', 'Status', 'Amount Due', 'Balance Due', 'Date Filed'].map(csvEscape).join(','));
      records.forEach((r, i) => {
        lines.push([
          i + 1,
          r.application_number || r.application_id,
          r.business_name,
          r.owner_name,
          r.address,
          r.permit_type_name,
          r.status,
          r.total_amount_due || 0,
          r.total_balance_due || 0,
          formatDate(r.created_at),
        ].map(csvEscape).join(','));
      });
    } else {
      lines.push(['#', 'Application No.', 'Business Name', 'Permit Type', 'Category', 'Status', 'Amount Due', 'Date Filed'].map(csvEscape).join(','));
      records.forEach((r, i) => {
        lines.push([
          i + 1,
          r.application_number || r.application_id,
          r.business_name,
          r.permit_type_name,
          r.attribute_name,
          r.status,
          r.total_amount_due || 0,
          formatDate(r.created_at),
        ].map(csvEscape).join(','));
      });
    }
    lines.push('');
    lines.push(`Total Records,${totalRecords}`);
    lines.push(`Total Amount Due,${totalAmount}`);
    lines.push(`Generated At,${generatedAt}`);
    lines.push(`Prepared By,${generatedBy}`);
    return {
      buffer: Buffer.from(lines.join('\r\n'), 'utf8'),
      mimeType: fmt === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
    };
  }

  // --- XML ------------------------------------------------------------------
  if (fmt === 'xml') {
    const recordsXml = records.map((r, i) => {
      if (name === 'permits') {
        return `  <record index="${i + 1}">
    <application_number>${escapeHtml(r.application_number || r.application_id)}</application_number>
    <business_name>${escapeHtml(r.business_name)}</business_name>
    <owner_name>${escapeHtml(r.owner_name)}</owner_name>
    <address>${escapeHtml(r.address)}</address>
    <permit_type_name>${escapeHtml(r.permit_type_name)}</permit_type_name>
    <status>${escapeHtml(r.status)}</status>
    <total_amount_due>${r.total_amount_due || 0}</total_amount_due>
    <total_balance_due>${r.total_balance_due || 0}</total_balance_due>
    <created_at>${escapeHtml(formatDate(r.created_at))}</created_at>
  </record>`;
      }
      return `  <record index="${i + 1}">
    <application_number>${escapeHtml(r.application_number || r.application_id)}</application_number>
    <business_name>${escapeHtml(r.business_name)}</business_name>
    <permit_type_name>${escapeHtml(r.permit_type_name)}</permit_type_name>
    <attribute_name>${escapeHtml(r.attribute_name)}</attribute_name>
    <status>${escapeHtml(r.status)}</status>
    <total_amount_due>${r.total_amount_due || 0}</total_amount_due>
    <created_at>${escapeHtml(formatDate(r.created_at))}</created_at>
  </record>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<report>
  <metadata>
    <title>${name === 'permits' ? 'Permit Issuance Report' : 'Applications Report'}</title>
    <generatedAt>${escapeHtml(generatedAt)}</generatedAt>
    <generatedBy>${escapeHtml(generatedBy)}</generatedBy>
    <totalRecords>${totalRecords}</totalRecords>
    <totalAmount>${totalAmount}</totalAmount>
  </metadata>
  <records>
${recordsXml}
  </records>
</report>`;
    return { buffer: Buffer.from(xml, 'utf8'), mimeType: 'application/xml' };
  }

  // --- HTML / PDF -----------------------------------------------------------
  const rows = name === 'permits'
    ? buildPermitsRows(records)
    : buildApplicationsRows(records);

  const html = renderTemplate(name, {
    generatedAt: escapeHtml(new Date(generatedAt).toLocaleString('en-PH')),
    generatedBy: escapeHtml(generatedBy),
    totalRecords: String(totalRecords),
    totalAmount: formatCurrency(totalAmount),
    rows,
  });

  if (fmt === 'html') {
    return { buffer: Buffer.from(html, 'utf8'), mimeType: 'text/html' };
  }

  // PDF (default)
  const pdfBuffer = await generatePDFFromHTML(html);
  return { buffer: pdfBuffer, mimeType: 'application/pdf' };
}

/**
 * Gracefully close the shared browser when the process is shutting down.
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

process.on('exit', () => { if (_browser) { _browser.close().catch(() => {}); } });

module.exports = { generateReport, generatePDFFromHTML, closeBrowser };
