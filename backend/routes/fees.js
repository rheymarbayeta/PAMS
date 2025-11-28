const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========== FEE CATEGORIES ==========

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM fees_categories ORDER BY category_name'
    );
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (Admin only)
router.post('/categories', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_name } = req.body;

    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category_id = generateId(ID_PREFIXES.CATEGORY);

    const [result] = await pool.execute(
      'INSERT INTO fees_categories (category_id, category_name) VALUES (?, ?)',
      [category_id, category_name]
    );

    await logAction(req.user.user_id, 'CREATE_FEE_CATEGORY', `Created category '${category_name}'`);

    res.status(201).json({
      category_id,
      category_name
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category (Admin only)
router.put('/categories/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_name } = req.body;
    const categoryId = req.params.id;

    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [result] = await pool.execute(
      'UPDATE fees_categories SET category_name = ? WHERE category_id = ?',
      [category_name, categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await logAction(req.user.user_id, 'UPDATE_FEE_CATEGORY', `Updated category ID ${categoryId}`);

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category (Admin only)
router.delete('/categories/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category has fees
    const [fees] = await pool.execute(
      'SELECT fee_id FROM fees_charges WHERE category_id = ?',
      [categoryId]
    );

    if (fees.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing fees' });
    }

    const [result] = await pool.execute(
      'DELETE FROM fees_categories WHERE category_id = ?',
      [categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await logAction(req.user.user_id, 'DELETE_FEE_CATEGORY', `Deleted category ID ${categoryId}`);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== FEES/CHARGES ==========

// Get all fees
router.get('/charges', async (req, res) => {
  try {
    const [fees] = await pool.execute(
      `SELECT f.fee_id, f.category_id, f.fee_name, f.default_amount, c.category_name
       FROM fees_charges f
       INNER JOIN fees_categories c ON f.category_id = c.category_id
       ORDER BY c.category_name, f.fee_name`
    );
    // Convert default_amount to number (MySQL DECIMAL can return as string)
    const feesWithNumbers = fees.map(fee => ({
      ...fee,
      default_amount: typeof fee.default_amount === 'string' 
        ? parseFloat(fee.default_amount) 
        : fee.default_amount
    }));
    res.json(feesWithNumbers);
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fees by category
router.get('/charges/category/:categoryId', async (req, res) => {
  try {
    const [fees] = await pool.execute(
      'SELECT * FROM fees_charges WHERE category_id = ? ORDER BY fee_name',
      [req.params.categoryId]
    );
    // Convert default_amount to number
    const feesWithNumbers = fees.map(fee => ({
      ...fee,
      default_amount: typeof fee.default_amount === 'string' 
        ? parseFloat(fee.default_amount) 
        : fee.default_amount
    }));
    res.json(feesWithNumbers);
  } catch (error) {
    console.error('Get fees by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create fee (Admin only)
router.post('/charges', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_id, fee_name, default_amount } = req.body;

    if (!category_id || !fee_name || default_amount === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const fee_id = generateId(ID_PREFIXES.FEE);

    const [result] = await pool.execute(
      'INSERT INTO fees_charges (fee_id, category_id, fee_name, default_amount) VALUES (?, ?, ?, ?)',
      [fee_id, category_id, fee_name, parseFloat(default_amount)]
    );

    await logAction(req.user.user_id, 'CREATE_FEE', `Created fee '${fee_name}'`);

    res.status(201).json({
      fee_id,
      category_id,
      fee_name,
      default_amount: parseFloat(default_amount)
    });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fee (Admin only)
router.put('/charges/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_id, fee_name, default_amount } = req.body;
    const feeId = req.params.id;

    if (!category_id || !fee_name || default_amount === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.execute(
      'UPDATE fees_charges SET category_id = ?, fee_name = ?, default_amount = ? WHERE fee_id = ?',
      [category_id, fee_name, parseFloat(default_amount), feeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    await logAction(req.user.user_id, 'UPDATE_FEE', `Updated fee ID ${feeId}`);

    res.json({ message: 'Fee updated successfully' });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete fee (Admin only)
router.delete('/charges/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const feeId = req.params.id;

    // Check if fee is used in assessed fees
    const [assessed] = await pool.execute(
      'SELECT assessed_fee_id FROM assessed_fees WHERE fee_id = ?',
      [feeId]
    );

    if (assessed.length > 0) {
      return res.status(400).json({ error: 'Cannot delete fee that is already assessed' });
    }

    const [result] = await pool.execute(
      'DELETE FROM fees_charges WHERE fee_id = ?',
      [feeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    await logAction(req.user.user_id, 'DELETE_FEE', `Deleted fee ID ${feeId}`);

    res.json({ message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

