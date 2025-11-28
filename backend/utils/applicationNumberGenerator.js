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
    const [sequences] = await dbConnection.execute(
      'SELECT sequence_number FROM application_sequence WHERE period = ? FOR UPDATE',
      [yearMonth]
    );

    let sequenceNumber;
    if (sequences.length === 0) {
      // First application of the month - need to insert
      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle race condition
      sequenceNumber = 1;
      await dbConnection.execute(
        'INSERT INTO application_sequence (sequence_id, period, sequence_number) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sequence_number = sequence_number + 1',
        [require('../utils/idGenerator').generateId(require('../utils/idGenerator').ID_PREFIXES.APPLICATION_SEQUENCE), yearMonth, sequenceNumber]
      );
      // Check if insert succeeded or if another transaction created it
      const [updatedSequences] = await dbConnection.execute(
        'SELECT sequence_number FROM application_sequence WHERE period = ? FOR UPDATE',
        [yearMonth]
      );
      if (updatedSequences.length > 0) {
        sequenceNumber = updatedSequences[0].sequence_number;
      }
    } else {
      // Increment sequence - the FOR UPDATE lock ensures no other transaction can read this
      sequenceNumber = sequences[0].sequence_number + 1;
    }

    // Update the sequence number atomically
    await dbConnection.execute(
      'UPDATE application_sequence SET sequence_number = ? WHERE period = ?',
      [sequenceNumber, yearMonth]
    );

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

