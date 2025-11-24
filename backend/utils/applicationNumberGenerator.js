const pool = require('../config/database');

/**
 * Generate a unique application number in format: YYYY-MM-NNN
 * This function is thread-safe and handles concurrent requests properly.
 * 
 * @param {Object} connection - Optional database connection to use (for transaction control)
 * @returns {Promise<string>} Application number (e.g., "2024-01-001")
 */
const generateApplicationNumber = async (connection = null) => {
  const useExternalConnection = connection !== null;
  const dbConnection = connection || await pool.getConnection();
  
  try {
    if (!useExternalConnection) {
      await dbConnection.beginTransaction();
    }

    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;

    // Use FOR UPDATE to lock the row for this transaction
    // This ensures only one transaction can read and update at a time
    // Try 'period' column first (new migration), fallback to 'year_month' (old migration)
    let sequences;
    try {
      [sequences] = await dbConnection.execute(
        'SELECT sequence_number FROM Application_Sequence WHERE period = ? FOR UPDATE',
        [yearMonth]
      );
    } catch (e) {
      // Fallback to year_month if period doesn't exist
      [sequences] = await dbConnection.execute(
        'SELECT sequence_number FROM Application_Sequence WHERE year_month = ? FOR UPDATE',
        [yearMonth]
      );
    }

    let sequenceNumber;
    if (sequences.length === 0) {
      // First application of the month - need to insert
      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle race condition
      sequenceNumber = 1;
      try {
        await dbConnection.execute(
          'INSERT INTO Application_Sequence (period, sequence_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE sequence_number = sequence_number',
          [yearMonth, sequenceNumber]
        );
        // Check if insert succeeded or if another transaction created it
        [sequences] = await dbConnection.execute(
          'SELECT sequence_number FROM Application_Sequence WHERE period = ? FOR UPDATE',
          [yearMonth]
        );
        if (sequences.length > 0 && sequences[0].sequence_number > 0) {
          sequenceNumber = sequences[0].sequence_number + 1;
        }
      } catch (e) {
        // Fallback to year_month column
        await dbConnection.execute(
          'INSERT INTO Application_Sequence (year_month, sequence_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE sequence_number = sequence_number',
          [yearMonth, sequenceNumber]
        );
        [sequences] = await dbConnection.execute(
          'SELECT sequence_number FROM Application_Sequence WHERE year_month = ? FOR UPDATE',
          [yearMonth]
        );
        if (sequences.length > 0 && sequences[0].sequence_number > 0) {
          sequenceNumber = sequences[0].sequence_number + 1;
        }
      }
    } else {
      // Increment sequence - the FOR UPDATE lock ensures no other transaction can read this
      sequenceNumber = sequences[0].sequence_number + 1;
    }

    // Update the sequence number atomically
    try {
      await dbConnection.execute(
        'UPDATE Application_Sequence SET sequence_number = ? WHERE period = ?',
        [sequenceNumber, yearMonth]
      );
    } catch (e) {
      // Fallback to year_month column
      await dbConnection.execute(
        'UPDATE Application_Sequence SET sequence_number = ? WHERE year_month = ?',
        [sequenceNumber, yearMonth]
      );
    }

    if (!useExternalConnection) {
      await dbConnection.commit();
    }

    // Format: YYYY-MM-NNN (3-digit sequence with leading zeros)
    const formattedSequence = String(sequenceNumber).padStart(3, '0');
    return `${yearMonth}-${formattedSequence}`;
  } catch (error) {
    if (!useExternalConnection) {
      await dbConnection.rollback();
    }
    throw error;
  } finally {
    if (!useExternalConnection) {
      dbConnection.release();
    }
  }
};

module.exports = { generateApplicationNumber };

