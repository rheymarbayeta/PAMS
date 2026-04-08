/**
 * Permit Number Generator
 * Format: <PREFIX>-MM-YY-NNNN
 *   PREFIX = abbreviation derived from permit type name (e.g. "Special Mayor's Permit" → "SMP")
 *   MM     = 2-digit month of issuance
 *   YY     = 2-digit year of issuance
 *   NNNN   = zero-padded 4-digit global sequence (continuous, never resets)
 *
 * The sequence is stored in `permit_number_sequences` keyed by the prefix only,
 * so numbering is continuous per permit type prefix regardless of month/year.
 */

const pool = require('../config/database');

/**
 * Derive a short prefix from a permit type name.
 * Takes the first letter of each significant word (uppercase).
 * e.g. "Special Mayor's Permit" → "SMP"
 *      "Business Permit"        → "BP"
 *      "Amusement Permit"       → "AP"
 */
function derivePrefix(permitTypeName) {
  if (!permitTypeName) return 'PRM';

  // Remove apostrophes and split on whitespace / non-alpha
  const words = permitTypeName
    .replace(/['']/g, '')
    .split(/[\s\-_]+/)
    .filter(Boolean);

  const initials = words
    .map(w => w[0].toUpperCase())
    .join('');

  return initials || 'PRM';
}

/**
 * Generate the next permit number for a given permit type name.
 * Uses a database-level atomic increment to avoid race conditions.
 *
 * @param {string} permitTypeName  e.g. "Special Mayor's Permit"
 * @param {Date}   [issuedAt]      optional date (defaults to now)
 * @returns {Promise<string>}      e.g. "SMP-04-26-0001"
 */
async function generatePermitNumber(permitTypeName, issuedAt = new Date()) {
  const prefix = derivePrefix(permitTypeName);
  const mm = String(issuedAt.getMonth() + 1).padStart(2, '0');
  const yy = String(issuedAt.getFullYear()).slice(-2);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Upsert the sequence row and atomically increment
    await connection.execute(
      `INSERT INTO permit_number_sequences (seq_key, last_seq)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`,
      [prefix]
    );

    const [[row]] = await connection.execute(
      'SELECT last_seq FROM permit_number_sequences WHERE seq_key = ?',
      [prefix]
    );

    await connection.commit();

    const seq = String(row.last_seq).padStart(4, '0');
    return `${prefix}-${mm}-${yy}-${seq}`;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Generate permit number for a renewal application.
 * Format: <PARENT_PERMIT_NUMBER>-<RENEWAL_COUNT>R
 *   <PARENT_PERMIT_NUMBER> = original permit number (e.g. "SMP-04-26-0001")
 *   <RENEWAL_COUNT>        = number of renewals (1, 2, 3, etc. for 1st, 2nd, 3rd renewal)
 *   R                      = renewal indicator
 * Example: "SMP-04-26-0001-1R" for first renewal, "SMP-04-26-0001-2R" for second renewal
 *
 * @param {string} parentPermitNumber  e.g. "SMP-04-26-0001"
 * @param {number} renewalCount         e.g. 1 for first renewal
 * @returns {Promise<string>}           e.g. "SMP-04-26-0001-1R"
 */
async function generatePermitNumberForRenewal(parentPermitNumber, renewalCount) {
  if (!parentPermitNumber || renewalCount === undefined) {
    throw new Error('Parent permit number and renewal count are required for renewal permits');
  }
  
  // Ensure renewalCount is a valid positive integer
  const count = Math.max(1, Math.floor(renewalCount));
  
  return `${parentPermitNumber}-${count}R`;
}

module.exports = { generatePermitNumber, generatePermitNumberForRenewal, derivePrefix };
