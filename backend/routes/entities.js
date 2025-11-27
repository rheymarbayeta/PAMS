const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

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

// Get single entity with applications history
router.get('/:id', async (req, res) => {
  try {
    const [entities] = await pool.execute(
      'SELECT * FROM Entities WHERE entity_id = ?',
      [req.params.id]
    );

    if (entities.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Get applications/permits for this entity
    const [applications] = await pool.execute(
      `SELECT 
        a.application_id,
        a.application_number,
        a.permit_type,
        a.status,
        a.validity_date,
        a.issued_at,
        a.created_at,
        a.updated_at,
        pt.permit_type_name
       FROM Applications a
       LEFT JOIN Permit_Types pt ON a.permit_type_id = pt.permit_type_id
       WHERE a.entity_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    // Determine permit status for each application
    const applicationsWithStatus = applications.map(app => {
      let permit_status = 'Pending';
      
      if (app.status === 'Issued' || app.status === 'Released') {
        if (app.validity_date) {
          const validityDate = new Date(app.validity_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (validityDate < today) {
            permit_status = 'Expired';
          } else {
            permit_status = 'Active';
          }
        } else {
          permit_status = 'Active';
        }
      } else if (['Draft', 'Submitted', 'Pending', 'Assessed', 'Approved', 'Paid'].includes(app.status)) {
        permit_status = 'Pending Application';
      } else if (app.status === 'Rejected' || app.status === 'Cancelled') {
        permit_status = app.status;
      }
      
      return {
        ...app,
        permit_status
      };
    });

    res.json({
      ...entities[0],
      applications: applicationsWithStatus
    });
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create entity (all roles except Viewer)
router.post('/', authorize('SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator'), async (req, res) => {
  try {
    const { entity_name, contact_person, email, phone, address } = req.body;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const entity_id = generateId(ID_PREFIXES.ENTITY);

    const [result] = await pool.execute(
      'INSERT INTO Entities (entity_id, entity_name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [entity_id, entity_name, contact_person || null, email || null, phone || null, address || null]
    );

    await logAction(req.user.user_id, 'CREATE_ENTITY', `Created entity '${entity_name}'`);

    res.status(201).json({
      entity_id,
      entity_name,
      contact_person,
      email,
      phone,
      address
    });
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update entity (all roles except Viewer)
router.put('/:id', authorize('SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator'), async (req, res) => {
  try {
    const { entity_name, contact_person, email, phone, address } = req.body;
    const entityId = req.params.id;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const [result] = await pool.execute(
      'UPDATE Entities SET entity_name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE entity_id = ?',
      [entity_name, contact_person || null, email || null, phone || null, address || null, entityId]
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

// Delete entity (all roles except Viewer)
router.delete('/:id', authorize('SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator'), async (req, res) => {
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

