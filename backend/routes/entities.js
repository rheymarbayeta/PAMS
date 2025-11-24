const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all entities (with optional search)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = 'SELECT * FROM Entities';
    const params = [];

    if (search) {
      query += ' WHERE entity_name LIKE ? OR contact_person LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY entity_name LIMIT 50';

    const [entities] = await pool.execute(query, params);
    res.json(entities);
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single entity
router.get('/:id', async (req, res) => {
  try {
    const [entities] = await pool.execute(
      'SELECT * FROM Entities WHERE entity_id = ?',
      [req.params.id]
    );

    if (entities.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(entities[0]);
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create entity (Admin only)
router.post('/', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { entity_name, contact_person, email, phone } = req.body;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO Entities (entity_name, contact_person, email, phone) VALUES (?, ?, ?, ?)',
      [entity_name, contact_person || null, email || null, phone || null]
    );

    await logAction(req.user.user_id, 'CREATE_ENTITY', `Created entity '${entity_name}'`);

    res.status(201).json({
      entity_id: result.insertId,
      entity_name,
      contact_person,
      email,
      phone
    });
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update entity (Admin only)
router.put('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { entity_name, contact_person, email, phone } = req.body;
    const entityId = req.params.id;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const [result] = await pool.execute(
      'UPDATE Entities SET entity_name = ?, contact_person = ?, email = ?, phone = ? WHERE entity_id = ?',
      [entity_name, contact_person || null, email || null, phone || null, entityId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    await logAction(req.user.user_id, 'UPDATE_ENTITY', `Updated entity ID ${entityId}`);

    res.json({ message: 'Entity updated successfully' });
  } catch (error) {
    console.error('Update entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete entity (Admin only)
router.delete('/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const entityId = req.params.id;

    // Check if entity has applications
    const [applications] = await pool.execute(
      'SELECT application_id FROM Applications WHERE entity_id = ?',
      [entityId]
    );

    if (applications.length > 0) {
      return res.status(400).json({ error: 'Cannot delete entity with existing applications' });
    }

    const [result] = await pool.execute(
      'DELETE FROM Entities WHERE entity_id = ?',
      [entityId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    await logAction(req.user.user_id, 'DELETE_ENTITY', `Deleted entity ID ${entityId}`);

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    console.error('Delete entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

