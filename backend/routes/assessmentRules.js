const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all assessment rules
router.get('/', async (req, res) => {
  try {
    const [rules] = await pool.execute(
      `SELECT ar.rule_id, ar.permit_type_id, ar.attribute_id, ar.rule_name, ar.description, ar.is_active,
              pt.permit_type_name, pt.validity_type, a.attribute_name
       FROM assessment_rules ar
       INNER JOIN permit_types pt ON ar.permit_type_id = pt.permit_type_id
       LEFT JOIN attributes a ON ar.attribute_id = a.attribute_id
       ORDER BY pt.permit_type_name, a.attribute_name, ar.rule_name`
    );
    res.json(rules);
  } catch (error) {
    console.error('Get assessment rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single assessment rule with fees
router.get('/:id', async (req, res) => {
  try {
    const ruleId = req.params.id;
    
    // Get rule
    const [rules] = await pool.execute(
      `SELECT ar.*, pt.permit_type_name, a.attribute_name
       FROM assessment_rules ar
       INNER JOIN permit_types pt ON ar.permit_type_id = pt.permit_type_id
       LEFT JOIN attributes a ON ar.attribute_id = a.attribute_id
       WHERE ar.rule_id = ?`,
      [ruleId]
    );

    if (rules.length === 0) {
      return res.status(404).json({ error: 'Assessment rule not found' });
    }

    // Get associated fees with fee details
    const [fees] = await pool.execute(
      `SELECT arf.rule_fee_id, arf.fee_id, arf.fee_name, arf.amount, arf.is_required, arf.fee_order,
              fc.fee_name as default_fee_name, fc.default_amount, cat.category_name
       FROM assessment_rule_fees arf
       LEFT JOIN fees_charges fc ON arf.fee_id = fc.fee_id
       LEFT JOIN fees_categories cat ON fc.category_id = cat.category_id
       WHERE arf.rule_id = ?
       ORDER BY arf.fee_order, arf.fee_name`,
      [ruleId]
    );

    // Convert amounts to numbers
    const feesWithNumbers = fees.map(fee => ({
      rule_fee_id: fee.rule_fee_id,
      fee_id: fee.fee_id,
      fee_name: fee.fee_name,
      amount: typeof fee.amount === 'string' 
        ? parseFloat(fee.amount) 
        : fee.amount,
      default_amount: typeof fee.default_amount === 'string'
        ? parseFloat(fee.default_amount)
        : fee.default_amount,
      is_required: fee.is_required,
      fee_order: fee.fee_order,
      category_name: fee.category_name
    }));

    res.json({
      ...rules[0],
      fees: feesWithNumbers
    });
  } catch (error) {
    console.error('Get assessment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rules by permit type and attribute
router.get('/lookup/:permitTypeId/:attributeId', async (req, res) => {
  try {
    const { permitTypeId, attributeId } = req.params;
    
    const [rules] = await pool.execute(
      `SELECT ar.*, pt.permit_type_name, a.attribute_name
       FROM assessment_rules ar
       INNER JOIN permit_types pt ON ar.permit_type_id = pt.permit_type_id
       LEFT JOIN attributes a ON ar.attribute_id = a.attribute_id
       WHERE ar.permit_type_id = ? AND ar.attribute_id = ? AND ar.is_active = TRUE`,
      [permitTypeId, attributeId]
    );

    if (rules.length === 0) {
      return res.status(404).json({ error: 'No active rule found for this permit type and attribute' });
    }

    const ruleId = rules[0].rule_id;

    // Get associated fees with fee details
    const [fees] = await pool.execute(
      `SELECT arf.rule_fee_id, arf.fee_id, arf.fee_name, arf.amount, arf.is_required, arf.fee_order,
              fc.fee_name as default_fee_name, fc.default_amount, cat.category_name
       FROM assessment_rule_fees arf
       LEFT JOIN fees_charges fc ON arf.fee_id = fc.fee_id
       LEFT JOIN fees_categories cat ON fc.category_id = cat.category_id
       WHERE arf.rule_id = ?
       ORDER BY arf.fee_order, arf.fee_name`,
      [ruleId]
    );

    // Convert amounts to numbers
    const feesWithNumbers = fees.map(fee => ({
      rule_fee_id: fee.rule_fee_id,
      fee_id: fee.fee_id,
      fee_name: fee.fee_name,
      amount: typeof fee.amount === 'string' 
        ? parseFloat(fee.amount) 
        : fee.amount,
      default_amount: typeof fee.default_amount === 'string'
        ? parseFloat(fee.default_amount)
        : fee.default_amount,
      is_required: fee.is_required,
      fee_order: fee.fee_order,
      category_name: fee.category_name
    }));

    res.json({
      ...rules[0],
      fees: feesWithNumbers
    });
  } catch (error) {
    console.error('Lookup assessment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

let attributeColumnAvailable = true;

// Create assessment rule (Admin only)
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  console.log('[AssessmentRules] POST / - Creating assessment rule');
  console.log('[AssessmentRules] Request body:', JSON.stringify(req.body, null, 2));
  console.log('[AssessmentRules] User:', req.user);
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { permit_type_id, attribute_id, rule_name, description, is_active, fees } = req.body;

    console.log('[AssessmentRules] Validating input...');
    if (!permit_type_id || !attribute_id || !rule_name) {
      console.log('[AssessmentRules] Validation failed - missing required fields');
      console.log('[AssessmentRules] permit_type_id:', permit_type_id);
      console.log('[AssessmentRules] attribute_id:', attribute_id);
      console.log('[AssessmentRules] rule_name:', rule_name);
      await connection.rollback();
      return res.status(400).json({ error: 'Permit type, attribute, and rule name are required' });
    }

    console.log('[AssessmentRules] Inserting rule into database...');
    
    // Get attribute name for the old 'attribute' column (temporary workaround until migration is run)
    let attributeName = null;
    if (attribute_id) {
      try {
        const [attrData] = await connection.execute(
          'SELECT attribute_name FROM attributes WHERE attribute_id = ?',
          [attribute_id]
        );
        if (attrData.length > 0) {
          attributeName = attrData[0].attribute_name;
          console.log('[AssessmentRules] Found attribute name:', attributeName);
        }
      } catch (err) {
        console.log('[AssessmentRules] Could not fetch attribute name, will try without it:', err.message);
      }
    }
    
    // Generate rule ID
    const rule_id = generateId(ID_PREFIXES.ASSESSMENT_RULE);

    // Insert rule - handle legacy 'attribute' column if it still exists
    let result;
    try {
      if (attributeColumnAvailable && attributeName) {
        // Include attribute column (legacy schema)
        [result] = await connection.execute(
          'INSERT INTO assessment_rules (rule_id, permit_type_id, attribute_id, attribute, rule_name, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            rule_id,
            permit_type_id,
            attribute_id,
            attributeName,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true
          ]
        );
      } else {
        // Use new schema (without legacy column)
        [result] = await connection.execute(
          'INSERT INTO assessment_rules (rule_id, permit_type_id, attribute_id, rule_name, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [
            rule_id,
            permit_type_id,
            attribute_id,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true
          ]
        );
      }
    } catch (insertError) {
      if (insertError.code === 'ER_BAD_FIELD_ERROR' && insertError.sqlMessage?.includes("Unknown column 'attribute'")) {
        console.log('[AssessmentRules] Attribute column no longer exists. Switching to new schema.');
        attributeColumnAvailable = false;
        // Retry without attribute column
        [result] = await connection.execute(
          'INSERT INTO assessment_rules (rule_id, permit_type_id, attribute_id, rule_name, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [
            rule_id,
            permit_type_id,
            attribute_id,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true
          ]
        );
      } else if ((insertError.code === 'ER_BAD_NULL_ERROR' || insertError.code === 'ER_NO_DEFAULT_FOR_FIELD') && attributeName) {
        console.log('[AssessmentRules] Attribute column requires value. Retrying with attribute name.');
        attributeColumnAvailable = true;
        [result] = await connection.execute(
          'INSERT INTO assessment_rules (rule_id, permit_type_id, attribute_id, attribute, rule_name, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            rule_id,
            permit_type_id,
            attribute_id,
            attributeName,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true
          ]
        );
      } else {
        throw insertError;
      }
    }

    // Use the generated rule_id instead of result.insertId
    console.log('[AssessmentRules] Rule inserted with ID:', rule_id);

    // Insert associated fees if provided
    if (fees && Array.isArray(fees)) {
      console.log('[AssessmentRules] Processing', fees.length, 'fees...');
      for (let i = 0; i < fees.length; i++) {
        const fee = fees[i];
        console.log(`[AssessmentRules] Processing fee ${i + 1}:`, fee);
        
        if (fee.fee_id && fee.amount !== undefined) {
          // Get fee name from Fees_Charges if not provided
          let feeName = fee.fee_name;
          if (!feeName && fee.fee_id) {
            console.log('[AssessmentRules] Fetching fee name for fee_id:', fee.fee_id);
            const [feeData] = await connection.execute(
              'SELECT fee_name FROM fees_charges WHERE fee_id = ?',
              [fee.fee_id]
            );
            if (feeData.length > 0) {
              feeName = feeData[0].fee_name;
              console.log('[AssessmentRules] Found fee name:', feeName);
            } else {
              console.log('[AssessmentRules] Warning: Fee not found for fee_id:', fee.fee_id);
            }
          }
          
          console.log('[AssessmentRules] Inserting fee:', {
            rule_id: rule_id,
            fee_id: fee.fee_id,
            fee_name: feeName || 'Unknown Fee',
            amount: parseFloat(fee.amount),
            is_required: fee.is_required !== undefined ? fee.is_required : true,
            fee_order: fee.fee_order !== undefined ? fee.fee_order : i
          });
          
          const rule_fee_id = generateId(ID_PREFIXES.ASSESSMENT_RULE_FEE);

          await connection.execute(
            'INSERT INTO assessment_rule_fees (rule_fee_id, rule_id, fee_id, fee_name, amount, is_required, fee_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              rule_fee_id,
              rule_id,
              fee.fee_id,
              feeName || 'Unknown Fee',
              parseFloat(fee.amount),
              fee.is_required !== undefined ? fee.is_required : true,
              fee.fee_order !== undefined ? fee.fee_order : i
            ]
          );
          console.log('[AssessmentRules] Fee inserted successfully');
        } else {
          console.log('[AssessmentRules] Skipping fee - missing fee_id or amount:', fee);
        }
      }
    } else {
      console.log('[AssessmentRules] No fees provided or fees is not an array');
    }

    await connection.commit();
    console.log('[AssessmentRules] Transaction committed successfully');
    
    await logAction(req.user.user_id, 'CREATE_ASSESSMENT_RULE', `Created assessment rule '${rule_name}'`);
    console.log('[AssessmentRules] Audit log created');

    const response = {
      rule_id: rule_id,
      permit_type_id,
      attribute_id,
      rule_name,
      description,
      is_active: is_active !== undefined ? is_active : true
    };
    
    console.log('[AssessmentRules] Rule created successfully:', response);
    res.status(201).json(response);
  } catch (error) {
    await connection.rollback();
    console.error('[AssessmentRules] Create assessment rule error:', error);
    console.error('[AssessmentRules] Error code:', error.code);
    console.error('[AssessmentRules] Error message:', error.message);
    console.error('[AssessmentRules] Error stack:', error.stack);
    console.error('[AssessmentRules] Error SQL state:', error.sqlState);
    console.error('[AssessmentRules] Error SQL message:', error.sqlMessage);
    
    // Check for duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('[AssessmentRules] Duplicate entry error');
      return res.status(400).json({ error: 'A rule already exists for this permit type and attribute combination' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
    console.log('[AssessmentRules] Database connection released');
  }
});

// Update assessment rule (Admin only)
router.put('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { permit_type_id, attribute_id, rule_name, description, is_active, fees } = req.body;
    const ruleId = req.params.id;

    if (!permit_type_id || !attribute_id || !rule_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Permit type, attribute, and rule name are required' });
    }

    // Get attribute name for the old 'attribute' column (temporary workaround)
    let attributeName = null;
    if (attribute_id) {
      try {
        const [attrData] = await connection.execute(
          'SELECT attribute_name FROM attributes WHERE attribute_id = ?',
          [attribute_id]
        );
        if (attrData.length > 0) {
          attributeName = attrData[0].attribute_name;
        }
      } catch (err) {
        console.log('[AssessmentRules] Could not fetch attribute name for update:', err.message);
      }
    }
    
    // Update rule - include old 'attribute' column if it exists
    let result;
    try {
      if (attributeColumnAvailable && attributeName) {
        [result] = await connection.execute(
          'UPDATE assessment_rules SET permit_type_id = ?, attribute_id = ?, attribute = ?, rule_name = ?, description = ?, is_active = ? WHERE rule_id = ?',
          [
            permit_type_id,
            attribute_id,
            attributeName,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true,
            ruleId
          ]
        );
      } else {
        // Try without attribute column
        [result] = await connection.execute(
          'UPDATE assessment_rules SET permit_type_id = ?, attribute_id = ?, rule_name = ?, description = ?, is_active = ? WHERE rule_id = ?',
          [
            permit_type_id,
            attribute_id,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true,
            ruleId
          ]
        );
      }
    } catch (updateError) {
      if (updateError.code === 'ER_BAD_FIELD_ERROR' && updateError.sqlMessage?.includes("Unknown column 'attribute'")) {
        console.log('[AssessmentRules] Attribute column dropped, retrying update without it.');
        attributeColumnAvailable = false;
        [result] = await connection.execute(
          'UPDATE assessment_rules SET permit_type_id = ?, attribute_id = ?, rule_name = ?, description = ?, is_active = ? WHERE rule_id = ?',
          [
            permit_type_id,
            attribute_id,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true,
            ruleId
          ]
        );
      } else if (updateError.code === 'ER_BAD_NULL_ERROR' && attributeName) {
        [result] = await connection.execute(
          'UPDATE assessment_rules SET permit_type_id = ?, attribute_id = ?, attribute = ?, rule_name = ?, description = ?, is_active = ? WHERE rule_id = ?',
          [
            permit_type_id,
            attribute_id,
            attributeName,
            rule_name,
            description || null,
            is_active !== undefined ? is_active : true,
            ruleId
          ]
        );
      } else {
        throw updateError;
      }
    }

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Assessment rule not found' });
    }

    // Update fees if provided
    if (fees && Array.isArray(fees)) {
      // Delete existing fees
      await connection.execute(
        'DELETE FROM assessment_rule_fees WHERE rule_id = ?',
        [ruleId]
      );

      // Insert new fees
      for (let i = 0; i < fees.length; i++) {
        const fee = fees[i];
        if (fee.fee_id && fee.amount !== undefined) {
          // Get fee name from Fees_Charges if not provided
          let feeName = fee.fee_name;
          if (!feeName && fee.fee_id) {
            const [feeData] = await connection.execute(
              'SELECT fee_name FROM fees_charges WHERE fee_id = ?',
              [fee.fee_id]
            );
            if (feeData.length > 0) {
              feeName = feeData[0].fee_name;
            }
          }
          
          await connection.execute(
            'INSERT INTO assessment_rule_fees (rule_id, fee_id, fee_name, amount, is_required, fee_order) VALUES (?, ?, ?, ?, ?, ?)',
            [
              ruleId,
              fee.fee_id,
              feeName || 'Unknown Fee',
              parseFloat(fee.amount),
              fee.is_required !== undefined ? fee.is_required : true,
              fee.fee_order !== undefined ? fee.fee_order : i
            ]
          );
        }
      }
    }

    await connection.commit();
    await logAction(req.user.user_id, 'UPDATE_ASSESSMENT_RULE', `Updated assessment rule ID ${ruleId}`);

    res.json({ message: 'Assessment rule updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update assessment rule error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A rule already exists for this permit type and attribute combination' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Delete assessment rule (Admin only)
router.delete('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const ruleId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM assessment_rules WHERE rule_id = ?',
      [ruleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assessment rule not found' });
    }

    await logAction(req.user.user_id, 'DELETE_ASSESSMENT_RULE', `Deleted assessment rule ID ${ruleId}`);

    res.json({ message: 'Assessment rule deleted successfully' });
  } catch (error) {
    console.error('Delete assessment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

