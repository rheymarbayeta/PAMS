const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all permit types
router.get('/', async (req, res) => {
  try {
    const [permitTypes] = await pool.execute(
      `SELECT pt.*, a.attribute_name, a.attribute_id, a.description AS attribute_description
       FROM Permit_Types pt
       LEFT JOIN Attributes a ON pt.attribute_id = a.attribute_id
       ORDER BY pt.permit_type_name`
    );
    res.json(permitTypes);
  } catch (error) {
    console.error('Get permit types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single permit type with fees
router.get('/:id', async (req, res) => {
  try {
    const permitTypeId = req.params.id;
    
    // Get permit type
    const [permitTypes] = await pool.execute(
      `SELECT pt.*, a.attribute_name, a.attribute_id, a.description AS attribute_description
       FROM Permit_Types pt
       LEFT JOIN Attributes a ON pt.attribute_id = a.attribute_id
       WHERE pt.permit_type_id = ?`,
      [permitTypeId]
    );

    if (permitTypes.length === 0) {
      return res.status(404).json({ error: 'Permit type not found' });
    }

    // Get associated fees
    const [fees] = await pool.execute(
      `SELECT ptf.permit_type_fee_id, ptf.fee_id, ptf.default_amount, ptf.is_required,
              fc.fee_name, fc.category_id, cat.category_name
       FROM Permit_Type_Fees ptf
       INNER JOIN Fees_Charges fc ON ptf.fee_id = fc.fee_id
       INNER JOIN Fees_Categories cat ON fc.category_id = cat.category_id
       WHERE ptf.permit_type_id = ?
       ORDER BY cat.category_name, fc.fee_name`,
      [permitTypeId]
    );

    // Convert amounts to numbers
    const feesWithNumbers = fees.map(fee => ({
      ...fee,
      default_amount: typeof fee.default_amount === 'string' 
        ? parseFloat(fee.default_amount) 
        : fee.default_amount
    }));

    res.json({
      ...permitTypes[0],
      fees: feesWithNumbers
    });
  } catch (error) {
    console.error('Get permit type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create permit type (Admin only)
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { permit_type_name, attribute_id, description, is_active, fees } = req.body;

    console.log('[PermitTypes] POST request received');
    console.log('[PermitTypes] permit_type_name:', permit_type_name);
    console.log('[PermitTypes] attribute_id:', attribute_id);
    console.log('[PermitTypes] attribute_id type:', typeof attribute_id);
    console.log('[PermitTypes] description:', description);
    console.log('[PermitTypes] is_active:', is_active);
    console.log('[PermitTypes] fees:', fees);

    if (!permit_type_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Permit type name is required' });
    }

    // Insert permit type
    const permit_type_id = generateId(ID_PREFIXES.PERMIT_TYPE);
    
    // Validate attribute_id if provided - must be a valid hash ID or null
    let validAttributeId = null;
    if (attribute_id) {
      console.log('[PermitTypes] Validating attribute_id:', attribute_id);
      // Check if attribute exists
      const [attrCheck] = await connection.execute(
        'SELECT attribute_id FROM Attributes WHERE attribute_id = ?',
        [attribute_id]
      );
      if (attrCheck.length > 0) {
        validAttributeId = attribute_id;
        console.log('[PermitTypes] Attribute found, using ID:', validAttributeId);
      } else {
        console.log('[PermitTypes] WARNING: Attribute ID not found:', attribute_id, '- setting to null');
        validAttributeId = null;
      }
    }

    console.log('[PermitTypes] Final validAttributeId:', validAttributeId);

    const [result] = await connection.execute(
      'INSERT INTO Permit_Types (permit_type_id, permit_type_name, attribute_id, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [permit_type_id, permit_type_name, validAttributeId, description || null, is_active !== undefined ? is_active : true]
    );

    // Insert associated fees if provided
    if (fees && Array.isArray(fees)) {
      for (const fee of fees) {
        if (fee.fee_id && fee.default_amount !== undefined) {
          const permit_type_fee_id = generateId(ID_PREFIXES.PERMIT_TYPE_FEE);
          await connection.execute(
            'INSERT INTO Permit_Type_Fees (permit_type_fee_id, permit_type_id, fee_id, default_amount, is_required) VALUES (?, ?, ?, ?, ?)',
            [
              permit_type_fee_id,
              permit_type_id,
              fee.fee_id,
              parseFloat(fee.default_amount),
              fee.is_required !== undefined ? fee.is_required : true
            ]
          );
        }
      }
    }

    await connection.commit();
    await logAction(req.user.user_id, 'CREATE_PERMIT_TYPE', `Created permit type '${permit_type_name}'`);

    res.status(201).json({
      permit_type_id,
      permit_type_name,
      attribute_id: attribute_id || null,
      description,
      is_active: is_active !== undefined ? is_active : true
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create permit type error:', error);
    
    // Check for duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Permit type name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Update permit type (Admin only)
router.put('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { permit_type_name, attribute_id, description, is_active, fees } = req.body;
    const permitTypeId = req.params.id;

    if (!permit_type_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Permit type name is required' });
    }

    // Update permit type
    const [result] = await connection.execute(
      'UPDATE Permit_Types SET permit_type_name = ?, attribute_id = ?, description = ?, is_active = ? WHERE permit_type_id = ?',
      [permit_type_name, attribute_id || null, description || null, is_active !== undefined ? is_active : true, permitTypeId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Permit type not found' });
    }

    // Update fees if provided
    if (fees && Array.isArray(fees)) {
      // Delete existing fees
      await connection.execute(
        'DELETE FROM Permit_Type_Fees WHERE permit_type_id = ?',
        [permitTypeId]
      );

      // Insert new fees
      for (const fee of fees) {
        if (fee.fee_id && fee.default_amount !== undefined) {
          const permit_type_fee_id = generateId(ID_PREFIXES.PERMIT_TYPE_FEE);
          await connection.execute(
            'INSERT INTO Permit_Type_Fees (permit_type_fee_id, permit_type_id, fee_id, default_amount, is_required) VALUES (?, ?, ?, ?, ?)',
            [
              permit_type_fee_id,
              permitTypeId,
              fee.fee_id,
              parseFloat(fee.default_amount),
              fee.is_required !== undefined ? fee.is_required : true
            ]
          );
        }
      }
    }

    await connection.commit();
    await logAction(req.user.user_id, 'UPDATE_PERMIT_TYPE', `Updated permit type ID ${permitTypeId}`);

    res.json({ message: 'Permit type updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update permit type error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Permit type name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Delete permit type (Admin only)
router.delete('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const permitTypeId = req.params.id;

    // Check if permit type has applications
    const [applications] = await pool.execute(
      'SELECT application_id FROM Applications WHERE permit_type = (SELECT permit_type_name FROM Permit_Types WHERE permit_type_id = ?)',
      [permitTypeId]
    );

    if (applications.length > 0) {
      return res.status(400).json({ error: 'Cannot delete permit type with existing applications' });
    }

    const [result] = await pool.execute(
      'DELETE FROM Permit_Types WHERE permit_type_id = ?',
      [permitTypeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Permit type not found' });
    }

    await logAction(req.user.user_id, 'DELETE_PERMIT_TYPE', `Deleted permit type ID ${permitTypeId}`);

    res.json({ message: 'Permit type deleted successfully' });
  } catch (error) {
    console.error('Delete permit type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

