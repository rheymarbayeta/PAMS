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
          p.id as property_id,
          p.property_name,
          p.property_code,
          p.address,
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
          p.property_name
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
        ORDER BY p.property_name ASC
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

      // Get property units for this property
      let units = [];
      try {
        const [unitResults] = await connection.query(`
          SELECT 
            pu.*
          FROM property_units pu
          WHERE pu.property_id = ?
          ORDER BY pu.stall_number ASC
        `, [id]);
        units = unitResults;
      } catch (unitError) {
        // Table might not exist yet, just skip units
        console.log('Note: property_units table query failed, units will be empty', unitError.message);
      }
      
      res.json({
        ...property[0],
        leases,
        units
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
      const { property_name, property_code, address, description } = req.body;

      if (!property_name) {
        return res.status(400).json({ error: 'Property/Building is required' });
      }

      if (!property_code) {
        return res.status(400).json({ error: 'Property Code is required' });
      }

      const connection = await pool.getConnection();
      try {
        const [result] = await connection.query(
          'INSERT INTO properties (property_name, property_code, address, description) VALUES (?, ?, ?, ?)',
          [property_name, property_code, address, description]
        );

        await logAction(req.user.user_id, 'CREATE', 'properties', result.insertId, `Created property: ${property_name}`);
        res.status(201).json({ 
          id: result.insertId, 
          property_name, 
          property_code,
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
      const { property_name, property_code, address, description } = req.body;

      if (!property_name) {
        return res.status(400).json({ error: 'Property/Building is required' });
      }

      if (!property_code) {
        return res.status(400).json({ error: 'Property Code is required' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE properties SET property_name = ?, property_code = ?, address = ?, description = ? WHERE id = ?',
          [property_name, property_code, address, description, id]
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

// ========== PROPERTY UNITS ==========

// Get a single property unit
router.get('/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [unit] = await connection.query(`
        SELECT 
          pu.*,
          p.property_name,
          p.property_code
        FROM property_units pu
        JOIN properties p ON pu.property_id = p.id
        WHERE pu.id = ?
      `, [id]);
      
      if (unit.length === 0) {
        return res.status(404).json({ error: 'Property unit not found' });
      }

      res.json(unit[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get property unit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all property units for a specific property
router.get('/properties/:property_id/units', async (req, res) => {
  try {
    const { property_id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [units] = await connection.query(`
        SELECT 
          pu.*
        FROM property_units pu
        WHERE pu.property_id = ?
        ORDER BY pu.stall_number ASC
      `, [property_id]);
      
      res.json(units);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get property units error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new property unit
router.post('/properties/:property_id/units', async (req, res) => {
  try {
    console.log('[Units] POST /properties/:property_id/units called');
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      try {
        console.log('[Units] Authorization passed, req.user:', req.user.username);
        const { property_id } = req.params;
        const { stall_number, floor_level, unit_description, area_sqm, status } = req.body;
        
        console.log('[Units] Request data:', { property_id, stall_number, floor_level, unit_description, area_sqm, status });

        if (!stall_number) {
          return res.status(400).json({ error: 'Stall number is required' });
        }

        const connection = await pool.getConnection();
        try {
          // Verify property exists
          console.log('[Units] Checking if property exists:', property_id);
          const [property] = await connection.query(
            'SELECT id FROM properties WHERE id = ?',
            [property_id]
          );

          if (property.length === 0) {
            console.log('[Units] Property not found:', property_id);
            return res.status(404).json({ error: 'Property not found' });
          }

          console.log('[Units] Inserting unit into database');
          const [result] = await connection.query(
            'INSERT INTO property_units (property_id, stall_number, floor_level, unit_description, area_sqm, status) VALUES (?, ?, ?, ?, ?, ?)',
            [property_id, stall_number, floor_level, unit_description, area_sqm, status || 'available']
          );

          console.log('[Units] Unit inserted, id:', result.insertId);
          await logAction(req.user.user_id, 'CREATE', 'property_units', result.insertId, `Created property unit: ${stall_number}`);
          console.log('[Units] Sending response');
          res.status(201).json({ 
            id: result.insertId, 
            property_id,
            stall_number, 
            floor_level,
            unit_description, 
            area_sqm,
            status: status || 'available'
          });
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('[Units] Error in authorize callback:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
        }
      }
    });
  } catch (error) {
    console.error('[Units] Create property unit error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
});

// Update a property unit
router.put('/units/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;
      const { stall_number, floor_level, unit_description, area_sqm, status } = req.body;

      if (!stall_number) {
        return res.status(400).json({ error: 'Stall number is required' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE property_units SET stall_number = ?, floor_level = ?, unit_description = ?, area_sqm = ?, status = ? WHERE id = ?',
          [stall_number, floor_level, unit_description, area_sqm, status, id]
        );

        await logAction(req.user.user_id, 'UPDATE', 'property_units', id, `Updated property unit information`);
        res.json({ message: 'Property unit updated successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Update property unit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a property unit
router.delete('/units/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        await connection.query('DELETE FROM property_units WHERE id = ?', [id]);

        await logAction(req.user.user_id, 'DELETE', 'property_units', id, `Deleted property unit`);
        res.json({ message: 'Property unit deleted successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Delete property unit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== LEASE CONTRACTS ==========

// Get all lease contracts
router.get('/lease-contracts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [contracts] = await connection.query(`
        SELECT 
          lc.id,
          lc.lessee_id,
          l.name as lessee_name,
          l.contact_number,
          lc.property_id,
          p.property_name,
          p.property_code,
          lc.contract_effective_date,
          lc.contract_termination_date,
          lc.principal_amount,
          lc.monthly_rights_amount,
          lc.monthly_rental_amount,
          lc.downpayment,
          lc.status,
          lc.created_at
        FROM lease_contracts lc
        JOIN lessees l ON lc.lessee_id = l.id
        JOIN properties p ON lc.property_id = p.id
        ORDER BY lc.contract_effective_date DESC
      `);
      res.json(contracts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lease contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single lease contract
router.get('/lease-contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [contract] = await connection.query(`
        SELECT 
          lc.*,
          l.name as lessee_name,
          l.contact_number as lessee_contact,
          l.email as lessee_email,
          p.property_name,
          p.property_code,
          p.address as property_address
        FROM lease_contracts lc
        JOIN lessees l ON lc.lessee_id = l.id
        JOIN properties p ON lc.property_id = p.id
        WHERE lc.id = ?
      `, [id]);
      
      if (contract.length === 0) {
        return res.status(404).json({ error: 'Lease contract not found' });
      }
      
      res.json(contract[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lease contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new lease contract
router.post('/lease-contracts', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const {
        lessee_id,
        property_id,
        contract_effective_date,
        contract_termination_date,
        principal_amount,
        monthly_rights_amount,
        monthly_rental_amount,
        downpayment,
        status = 'active'
      } = req.body;

      // Validation
      if (!lessee_id || !property_id || !contract_effective_date) {
        return res.status(400).json({ 
          error: 'Lessee ID, Property ID, and Effective Date are required' 
        });
      }

      const connection = await pool.getConnection();
      try {
        // Verify lessee exists
        const [lessee] = await connection.query(
          'SELECT id FROM lessees WHERE id = ?',
          [lessee_id]
        );
        if (lessee.length === 0) {
          return res.status(400).json({ error: 'Lessee not found' });
        }

        // Verify property exists
        const [property] = await connection.query(
          'SELECT id FROM properties WHERE id = ?',
          [property_id]
        );
        if (property.length === 0) {
          return res.status(400).json({ error: 'Property not found' });
        }

        // Insert lease contract
        const [result] = await connection.query(`
          INSERT INTO lease_contracts (
            lessee_id,
            property_id,
            contract_effective_date,
            contract_termination_date,
            principal_amount,
            monthly_rights_amount,
            monthly_rental_amount,
            downpayment,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lessee_id,
          property_id,
          contract_effective_date,
          contract_termination_date || null,
          principal_amount || 0,
          monthly_rights_amount || 0,
          monthly_rental_amount || 0,
          downpayment || 0,
          status
        ]);

        // Get the created contract with details
        const [createdContract] = await connection.query(`
          SELECT 
            lc.*,
            l.name as lessee_name,
            p.property_name
          FROM lease_contracts lc
          JOIN lessees l ON lc.lessee_id = l.id
          JOIN properties p ON lc.property_id = p.id
          WHERE lc.id = ?
        `, [result.insertId]);

        await logAction(
          req.user.user_id,
          'CREATE',
          'lease_contracts',
          result.insertId,
          `Created lease contract for ${createdContract[0].lessee_name} - ${createdContract[0].property_name}`
        );

        res.status(201).json(createdContract[0]);
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Create lease contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a lease contract
router.put('/lease-contracts/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;
      const {
        contract_effective_date,
        contract_termination_date,
        principal_amount,
        monthly_rights_amount,
        monthly_rental_amount,
        downpayment,
        status
      } = req.body;

      const connection = await pool.getConnection();
      try {
        await connection.query(`
          UPDATE lease_contracts SET
            contract_effective_date = COALESCE(?, contract_effective_date),
            contract_termination_date = ?,
            principal_amount = COALESCE(?, principal_amount),
            monthly_rights_amount = COALESCE(?, monthly_rights_amount),
            monthly_rental_amount = COALESCE(?, monthly_rental_amount),
            downpayment = COALESCE(?, downpayment),
            status = COALESCE(?, status)
          WHERE id = ?
        `, [
          contract_effective_date,
          contract_termination_date,
          principal_amount,
          monthly_rights_amount,
          monthly_rental_amount,
          downpayment,
          status,
          id
        ]);

        // Get updated contract
        const [updatedContract] = await connection.query(`
          SELECT 
            lc.*,
            l.name as lessee_name,
            p.property_name
          FROM lease_contracts lc
          JOIN lessees l ON lc.lessee_id = l.id
          JOIN properties p ON lc.property_id = p.id
          WHERE lc.id = ?
        `, [id]);

        await logAction(
          req.user.user_id,
          'UPDATE',
          'lease_contracts',
          id,
          `Updated lease contract information`
        );

        res.json(updatedContract[0]);
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Update lease contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a lease contract
router.delete('/lease-contracts/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin')(req, res, async () => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        const [contract] = await connection.query(
          'SELECT lessee_id, property_id FROM lease_contracts WHERE id = ?',
          [id]
        );

        if (contract.length === 0) {
          return res.status(404).json({ error: 'Lease contract not found' });
        }

        await connection.query('DELETE FROM lease_contracts WHERE id = ?', [id]);

        await logAction(
          req.user.user_id,
          'DELETE',
          'lease_contracts',
          id,
          `Deleted lease contract`
        );

        res.json({ message: 'Lease contract deleted successfully' });
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Delete lease contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lease contracts by lessee
router.get('/lessees/:lesseeId/lease-contracts', async (req, res) => {
  try {
    const { lesseeId } = req.params;
    const connection = await pool.getConnection();
    try {
      const [contracts] = await connection.query(`
        SELECT 
          lc.*,
          p.property_name,
          p.property_code
        FROM lease_contracts lc
        JOIN properties p ON lc.property_id = p.id
        WHERE lc.lessee_id = ?
        ORDER BY lc.contract_effective_date DESC
      `, [lesseeId]);
      
      res.json(contracts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lessee lease contracts error:', error);
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
