const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

// Apply authentication middleware to all routes in this router
router.use(authenticate);

/**
 * GET /api/assessment-rules/:ruleId/quantity-fee
 * Get quantity-based fee configuration for a rule (with fee details)
 */
router.get('/assessment-rules/:ruleId/quantity-fee', authorize('SuperAdmin', 'Admin', 'Assessor'), async (req, res) => {
  try {
    const { ruleId } = req.params;

    const [result] = await pool.execute(
      `SELECT aqf.*, arf.fee_name, arf.amount as selected_fee_amount
       FROM assessment_rule_quantity_fees aqf
       LEFT JOIN assessment_rule_fees arf ON aqf.selected_fee_id = arf.fee_id AND arf.rule_id = ?
       WHERE aqf.rule_id = ? LIMIT 1`,
      [ruleId, ruleId]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: 'No quantity fee configuration found for this rule' });
    }

    // Parse JSON fields
    const config = result[0];
    if (config.additional_charges && typeof config.additional_charges === 'string') {
      try {
        config.additional_charges = JSON.parse(config.additional_charges);
      } catch (e) {
        config.additional_charges = [];
      }
    }
    if (config.fee_name && !config.selected_fee_name) {
      config.selected_fee_name = config.fee_name;
    }
    if (!config.calculation_mode) {
      config.calculation_mode = 'quantity';
    }

    res.json(config);
  } catch (error) {
    // Missing table / schema drift → treat as "no quantity config" so Assess can continue
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: 'No quantity fee configuration found for this rule' });
    }
    console.error('Get quantity fee config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/quantity-fees
 * Create quantity-based fee configuration for a rule
 */
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const {
      rule_id,
      selected_fee_id,
      calculation_mode,
      percent_rate,
      is_enabled,
      quantity_label,
      quantity_description,
      additional_charges,
      min_quantity,
      max_quantity
    } = req.body;

    const mode = String(calculation_mode || 'quantity').toLowerCase() === 'percent'
      ? 'percent'
      : 'quantity';

    const label = (quantity_label && String(quantity_label).trim())
      || (mode === 'percent' ? 'Percent' : '');

    if (!rule_id || !selected_fee_id || !label) {
      return res.status(400).json({ 
        error: mode === 'percent'
          ? 'rule_id, selected_fee_id, and percent_rate are required'
          : 'rule_id, quantity_label, and selected_fee_id are required'
      });
    }

    const percentRate = mode === 'percent' ? parseFloat(percent_rate) : null;
    if (mode === 'percent' && (Number.isNaN(percentRate) || percentRate == null || percentRate < 0)) {
      return res.status(400).json({ error: 'A valid percent rate is required' });
    }

    // Check if rule exists
    const [ruleExists] = await pool.execute(
      'SELECT rule_id FROM assessment_rules WHERE rule_id = ? LIMIT 1',
      [rule_id]
    );

    if (ruleExists.length === 0) {
      return res.status(404).json({ error: 'Assessment rule not found' });
    }

    // Check if selected fee exists and belongs to this rule
    const [feeExists] = await pool.execute(
      `SELECT fee_id FROM assessment_rule_fees
       WHERE fee_id = ? AND rule_id = ? LIMIT 1`,
      [selected_fee_id, rule_id]
    );

    if (feeExists.length === 0) {
      return res.status(404).json({ error: 'Selected fee does not belong to this rule' });
    }

    // Check if config already exists
    const [existing] = await pool.execute(
      'SELECT quantity_fee_id FROM assessment_rule_quantity_fees WHERE rule_id = ? LIMIT 1',
      [rule_id]
    );

    const quantity_fee_id = generateId(ID_PREFIXES.QUANTITY_FEE);
    const additionalChargesJson = additional_charges ? JSON.stringify(additional_charges) : null;

    if (existing.length > 0) {
      // Update existing
      await pool.execute(
        `UPDATE assessment_rule_quantity_fees 
         SET is_enabled = ?, quantity_label = ?, quantity_description = ?, 
             selected_fee_id = ?, calculation_mode = ?, percent_rate = ?, base_rate = ?, additional_charges = ?, 
             min_quantity = ?, max_quantity = ?, updated_at = CURRENT_TIMESTAMP
         WHERE rule_id = ?`,
        [
          is_enabled ?? 1,
          label,
          quantity_description,
          selected_fee_id,
          mode,
          percentRate,
          0,
          additionalChargesJson,
          min_quantity ?? 1,
          max_quantity ?? 999,
          rule_id
        ]
      );

      return res.json({ 
        message: 'Quantity fee configuration updated successfully',
        rule_id 
      });
    } else {
      // Create new
      await pool.execute(
        `INSERT INTO assessment_rule_quantity_fees 
         (quantity_fee_id, rule_id, is_enabled, quantity_label, quantity_description, 
          selected_fee_id, calculation_mode, percent_rate, base_rate, additional_charges, min_quantity, max_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quantity_fee_id,
          rule_id,
          is_enabled ?? 1,
          label,
          quantity_description,
          selected_fee_id,
          mode,
          percentRate,
          0,
          additionalChargesJson,
          min_quantity ?? 1,
          max_quantity ?? 999
        ]
      );

      res.status(201).json({ 
        message: 'Quantity fee configuration created successfully',
        quantity_fee_id,
        rule_id 
      });
    }
  } catch (error) {
    console.error('Create quantity fee config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/quantity-fees/:ruleId
 * Delete quantity-based fee configuration
 */
router.delete('/:ruleId', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { ruleId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM assessment_rule_quantity_fees WHERE rule_id = ?',
      [ruleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Quantity fee configuration not found' });
    }

    res.json({ message: 'Quantity fee configuration deleted successfully' });
  } catch (error) {
    console.error('Delete quantity fee config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
