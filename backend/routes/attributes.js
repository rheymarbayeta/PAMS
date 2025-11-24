const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();

// Test route (before auth to verify route is registered)
router.get('/test', (req, res) => {
  console.log('[Attributes] Test route hit');
  res.json({ message: 'Attributes route is working', path: req.path });
});

// All routes require authentication
router.use((req, res, next) => {
  console.log(`[Attributes] ${req.method} ${req.path} - Authenticating...`);
  authenticate(req, res, next);
});

// Get all attributes
router.get('/', async (req, res) => {
  console.log('[Attributes] GET / - Fetching all attributes');
  try {
    const [attributes] = await pool.execute(
      'SELECT * FROM Attributes ORDER BY attribute_name'
    );
    console.log('[Attributes] Found', attributes.length, 'attributes');
    res.json(attributes);
  } catch (error) {
    console.error('[Attributes] Get attributes error:', error);
    console.error('[Attributes] Error code:', error.code);
    console.error('[Attributes] Error message:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active attributes only
router.get('/active', async (req, res) => {
  console.log('[Attributes] GET /active - Fetching active attributes');
  try {
    const [attributes] = await pool.execute(
      'SELECT * FROM Attributes WHERE is_active = TRUE ORDER BY attribute_name'
    );
    console.log('[Attributes] Found', attributes.length, 'active attributes');
    res.json(attributes);
  } catch (error) {
    console.error('[Attributes] Get active attributes error:', error);
    console.error('[Attributes] Error code:', error.code);
    console.error('[Attributes] Error message:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single attribute
router.get('/:id', async (req, res) => {
  try {
    const [attributes] = await pool.execute(
      'SELECT * FROM Attributes WHERE attribute_id = ?',
      [req.params.id]
    );

    if (attributes.length === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    res.json(attributes[0]);
  } catch (error) {
    console.error('Get attribute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create attribute (Admin only)
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  console.log('[Attributes] POST / - Creating attribute');
  console.log('[Attributes] Request body:', req.body);
  console.log('[Attributes] User:', req.user);
  
  try {
    const { attribute_name, description, is_active } = req.body;

    if (!attribute_name) {
      console.log('[Attributes] Validation failed: attribute_name is required');
      return res.status(400).json({ error: 'Attribute name is required' });
    }

    console.log('[Attributes] Inserting attribute into database...');
    const [result] = await pool.execute(
      'INSERT INTO Attributes (attribute_name, description, is_active) VALUES (?, ?, ?)',
      [attribute_name, description || null, is_active !== undefined ? is_active : true]
    );

    console.log('[Attributes] Attribute inserted with ID:', result.insertId);

    await logAction(req.user.user_id, 'CREATE_ATTRIBUTE', `Created attribute '${attribute_name}'`);

    const response = {
      attribute_id: result.insertId,
      attribute_name,
      description,
      is_active: is_active !== undefined ? is_active : true
    };
    
    console.log('[Attributes] Attribute created successfully:', response);
    res.status(201).json(response);
  } catch (error) {
    console.error('[Attributes] Create attribute error:', error);
    console.error('[Attributes] Error code:', error.code);
    console.error('[Attributes] Error message:', error.message);
    console.error('[Attributes] Error stack:', error.stack);
    
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('[Attributes] Duplicate entry error');
      return res.status(400).json({ error: 'Attribute name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update attribute (Admin only)
router.put('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { attribute_name, description, is_active } = req.body;
    const attributeId = req.params.id;

    if (!attribute_name) {
      return res.status(400).json({ error: 'Attribute name is required' });
    }

    const [result] = await pool.execute(
      'UPDATE Attributes SET attribute_name = ?, description = ?, is_active = ? WHERE attribute_id = ?',
      [attribute_name, description || null, is_active !== undefined ? is_active : true, attributeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    await logAction(req.user.user_id, 'UPDATE_ATTRIBUTE', `Updated attribute ID ${attributeId}`);

    res.json({ message: 'Attribute updated successfully' });
  } catch (error) {
    console.error('Update attribute error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Attribute name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete attribute (Admin only)
router.delete('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const attributeId = req.params.id;

    // Check if attribute is used in permit types
    const [permitTypes] = await pool.execute(
      'SELECT permit_type_id FROM Permit_Types WHERE attribute_id = ?',
      [attributeId]
    );

    if (permitTypes.length > 0) {
      return res.status(400).json({ error: 'Cannot delete attribute that is used in permit types' });
    }

    // Check if attribute is used in assessment rules
    const [rules] = await pool.execute(
      'SELECT rule_id FROM Assessment_Rules WHERE attribute_id = ?',
      [attributeId]
    );

    if (rules.length > 0) {
      return res.status(400).json({ error: 'Cannot delete attribute that is used in assessment rules' });
    }

    const [result] = await pool.execute(
      'DELETE FROM Attributes WHERE attribute_id = ?',
      [attributeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    await logAction(req.user.user_id, 'DELETE_ATTRIBUTE', `Deleted attribute ID ${attributeId}`);

    res.json({ message: 'Attribute deleted successfully' });
  } catch (error) {
    console.error('Delete attribute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

