const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========== RIGHTS & RENTALS ==========

// Get all lessees with their lease contract information
router.get('/lessees', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [lessees] = await connection.query(`
        SELECT 
          l.id,
          l.name,
          l.contact_number,
          l.email,
          p.stall_number,
          p.floor_level,
          p.area_sqm,
          lc.contract_effective_date,
          lc.contract_termination_date,
          lc.status
        FROM lessees l
        LEFT JOIN lease_contracts lc ON l.id = lc.lessee_id
        LEFT JOIN properties p ON lc.property_id = p.id
        ORDER BY l.name ASC
      `);
      res.json(lessees);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lessees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single lessee with all details
router.get('/lessees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [lessee] = await connection.query(`
        SELECT 
          l.*,
          lc.id as contract_id,
          lc.contract_effective_date,
          lc.contract_termination_date,
          lc.principal_amount,
          lc.monthly_rights_amount,
          lc.monthly_rental_amount,
          lc.downpayment,
          lc.status as contract_status,
          p.id as property_id,
          p.location,
          p.stall_number,
          p.floor_level,
          p.area_sqm
        FROM lessees l
        LEFT JOIN lease_contracts lc ON l.id = lc.lessee_id
        LEFT JOIN properties p ON lc.property_id = p.id
        WHERE l.id = ?
      `, [id]);
      
      if (lessee.length === 0) {
        return res.status(404).json({ error: 'Lessee not found' });
      }
      
      res.json(lessee[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lessee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new lessee
router.post('/lessees', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { name, contact_number, email } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Lessee name is required' });
      }

      const connection = await pool.getConnection();
      try {
        const [result] = await connection.query(
          'INSERT INTO lessees (name, contact_number, email) VALUES (?, ?, ?)',
          [name, contact_number, email]
        );

        await logAction(req.user.user_id, 'CREATE', 'lessees', result.insertId, `Created lessee: ${name}`);
        res.status(201).json({ id: result.insertId, name, contact_number, email });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Create lessee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a lessee
router.put('/lessees/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;
      const { name, contact_number, email } = req.body;

      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE lessees SET name = ?, contact_number = ?, email = ? WHERE id = ?',
          [name, contact_number, email, id]
        );

        await logAction(req.user.user_id, 'UPDATE', 'lessees', id, `Updated lessee information`);
        res.json({ message: 'Lessee updated successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Update lessee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a lessee
router.delete('/lessees/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        await connection.query('DELETE FROM lessees WHERE id = ?', [id]);

        await logAction(req.user.user_id, 'DELETE', 'lessees', id, `Deleted lessee`);
        res.json({ message: 'Lessee deleted successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Delete lessee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== PROPERTIES ==========

// Get all properties
router.get('/properties', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [properties] = await connection.query(`
        SELECT 
          p.*,
          COUNT(DISTINCT lc.id) as active_leases
        FROM properties p
        LEFT JOIN lease_contracts lc ON p.id = lc.property_id AND lc.status = 'active'
        GROUP BY p.id
        ORDER BY p.location ASC, p.stall_number ASC
      `);
      res.json(properties);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single property with all details
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [property] = await connection.query(`
        SELECT 
          p.*,
          COUNT(DISTINCT lc.id) as total_leases,
          SUM(CASE WHEN lc.status = 'active' THEN 1 ELSE 0 END) as active_leases
        FROM properties p
        LEFT JOIN lease_contracts lc ON p.id = lc.property_id
        WHERE p.id = ?
        GROUP BY p.id
      `, [id]);
      
      if (property.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }

      // Get lease contracts for this property
      const [leases] = await connection.query(`
        SELECT 
          lc.id,
          lc.contract_effective_date,
          lc.contract_termination_date,
          lc.status,
          l.name as lessee_name,
          l.contact_number,
          l.email
        FROM lease_contracts lc
        JOIN lessees l ON lc.lessee_id = l.id
        WHERE lc.property_id = ?
        ORDER BY lc.contract_effective_date DESC
      `, [id]);
      
      res.json({
        ...property[0],
        leases
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new property
router.post('/properties', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { location, address, description } = req.body;

      if (!location) {
        return res.status(400).json({ error: 'Property/Building is required' });
      }

      const connection = await pool.getConnection();
      try {
        const [result] = await connection.query(
          'INSERT INTO properties (location, stall_number, floor_level, area_sqm, address, description) VALUES (?, ?, ?, ?, ?, ?)',
          [location, null, null, null, address, description]
        );

        await logAction(req.user.user_id, 'CREATE', 'properties', result.insertId, `Created property: ${location}`);
        res.status(201).json({ 
          id: result.insertId, 
          location, 
          address, 
          description 
        });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a property
router.put('/properties/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;
      const { location, address, description } = req.body;

      if (!location) {
        return res.status(400).json({ error: 'Property/Building is required' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE properties SET location = ?, address = ?, description = ? WHERE id = ?',
          [location, address, description, id]
        );

        await logAction(req.user.user_id, 'UPDATE', 'properties', id, `Updated property information`);
        res.json({ message: 'Property updated successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a property
router.delete('/properties/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        // Check if property has active leases
        const [leases] = await connection.query(
          'SELECT COUNT(*) as count FROM lease_contracts WHERE property_id = ? AND status = "active"',
          [id]
        );

        if (leases[0].count > 0) {
          return res.status(400).json({ error: 'Cannot delete property with active leases' });
        }

        await connection.query('DELETE FROM properties WHERE id = ?', [id]);

        await logAction(req.user.user_id, 'DELETE', 'properties', id, `Deleted property`);
        res.json({ message: 'Property deleted successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all rights and rentals
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Rights and Rentals module' });
  } catch (error) {
    console.error('Get rights and rentals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
