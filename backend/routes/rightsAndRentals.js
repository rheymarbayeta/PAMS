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
          pu.stall_number,
          pu.floor_level,
          pu.area_sqm,
          lc.contract_effective_date,
          lc.contract_termination_date,
          lc.status
        FROM lessees l
        LEFT JOIN lease_contracts lc ON l.id = lc.lessee_id
        LEFT JOIN properties p ON lc.property_id = p.id
        LEFT JOIN property_units pu ON lc.property_unit_id = pu.id
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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

// Get a single property unit with current occupant
router.get('/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [unit] = await connection.query(`
        SELECT 
          pu.*,
          p.property_name,
          p.property_code,
          p.address AS property_address
        FROM property_units pu
        JOIN properties p ON pu.property_id = p.id
        WHERE pu.id = ?
      `, [id]);
      
      if (unit.length === 0) {
        return res.status(404).json({ error: 'Property unit not found' });
      }

      const unitData = unit[0];

      // Active lease linked to this unit (primary source for current occupant)
      let currentOccupant = null;
      let currentLease = null;
      try {
        const [leaseRows] = await connection.query(`
          SELECT
            lc.id AS lease_contract_id,
            lc.contract_effective_date,
            lc.contract_termination_date,
            lc.status AS contract_status,
            lc.monthly_rights_amount,
            lc.monthly_rental_amount,
            l.id AS lessee_id,
            l.name AS lessee_name,
            l.contact_number AS lessee_contact,
            l.email AS lessee_email
          FROM lease_contract_units lcu
          JOIN lease_contracts lc ON lcu.lease_contract_id = lc.id
          JOIN lessees l ON lc.lessee_id = l.id
          WHERE lcu.property_unit_id = ?
            AND lc.status = 'active'
            AND lc.contract_effective_date <= CURDATE()
            AND (lc.contract_termination_date IS NULL OR lc.contract_termination_date >= CURDATE())
          ORDER BY lc.contract_effective_date DESC
          LIMIT 1
        `, [id]);

        if (leaseRows.length > 0) {
          const row = leaseRows[0];
          currentLease = {
            id: row.lease_contract_id,
            contract_effective_date: row.contract_effective_date,
            contract_termination_date: row.contract_termination_date,
            status: row.contract_status,
            monthly_rights_amount: row.monthly_rights_amount,
            monthly_rental_amount: row.monthly_rental_amount,
          };
          currentOccupant = {
            lessee_id: row.lessee_id,
            name: row.lessee_name,
            contact_number: row.lessee_contact,
            email: row.lessee_email,
            source: 'active_lease',
          };
        }
      } catch (e) {
        // lease_contract_units may not exist during migration
      }

      // Fallback: lessee_id stored directly on the unit
      if (!currentOccupant && unitData.lessee_id) {
        const [lesseeRows] = await connection.query(
          'SELECT id, name, contact_number, email FROM lessees WHERE id = ?',
          [unitData.lessee_id]
        );
        if (lesseeRows.length > 0) {
          currentOccupant = {
            lessee_id: lesseeRows[0].id,
            name: lesseeRows[0].name,
            contact_number: lesseeRows[0].contact_number,
            email: lesseeRows[0].email,
            source: 'unit_record',
          };
        }
      }

      res.json({
        ...unitData,
        current_occupant: currentOccupant,
        current_lease: currentLease,
      });
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
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

      // Fetch units for each contract
      const contractsWithUnits = await Promise.all(
        contracts.map(async (contract) => {
          const [units] = await connection.query(`
            SELECT 
              pu.id,
              pu.stall_number,
              pu.floor_level,
              pu.unit_description,
              pu.area_sqm,
              pu.status
            FROM lease_contract_units lcu
            JOIN property_units pu ON lcu.property_unit_id = pu.id
            WHERE lcu.lease_contract_id = ?
          `, [contract.id]);
          return {
            ...contract,
            property_units: units
          };
        })
      );

      res.json(contractsWithUnits);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get lease contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lease contracts for a specific property with their units
router.get('/properties/:property_id/lease-contracts', async (req, res) => {
  try {
    const { property_id } = req.params;
    const connection = await pool.getConnection();
    try {
      // Get all lease contracts for this property
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
          lc.status,
          lc.created_at
        FROM lease_contracts lc
        JOIN lessees l ON lc.lessee_id = l.id
        JOIN properties p ON lc.property_id = p.id
        WHERE lc.property_id = ?
        ORDER BY lc.contract_effective_date DESC
      `, [property_id]);

      // For each contract, fetch its associated units
      const contractsWithUnits = await Promise.all(contracts.map(async (contract) => {
        const [units] = await connection.query(`
          SELECT pu.id, pu.stall_number
          FROM lease_contract_units lcu
          JOIN property_units pu ON lcu.property_unit_id = pu.id
          WHERE lcu.lease_contract_id = ?
        `, [contract.id]);
        
        return {
          ...contract,
          property_units: units
        };
      }));

      res.json(contractsWithUnits);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get property lease contracts error:', error);
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

      // Fetch associated property units from junction table
      let property_units = [];
      try {
        const [unitRows] = await connection.query(`
          SELECT pu.id, pu.stall_number, pu.floor_level, pu.unit_description, pu.area_sqm, pu.status
          FROM lease_contract_units lcu
          JOIN property_units pu ON lcu.property_unit_id = pu.id
          WHERE lcu.lease_contract_id = ?
          ORDER BY pu.stall_number ASC
        `, [id]);
        property_units = unitRows;
      } catch (e) {
        // Junction table may not exist yet during migration
      }

      res.json({ ...contract[0], property_units });
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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
      const {
        lessee_id,
        property_id,
        property_unit_ids,
        property_unit_id,
        contract_effective_date,
        contract_termination_date,
        principal_amount,
        monthly_rights_amount,
        monthly_rental_amount,
        downpayment,
        status = 'active'
      } = req.body;

      // Normalise unit IDs: accept array (new) or single id (legacy)
      const unitIds = Array.isArray(property_unit_ids) && property_unit_ids.length > 0
        ? property_unit_ids.map(Number).filter(Boolean)
        : property_unit_id ? [Number(property_unit_id)] : [];

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

        // Insert lease contract (property_unit_id = first unit for backwards compat)
        const [result] = await connection.query(`
          INSERT INTO lease_contracts (
            lessee_id,
            property_unit_id,
            property_id,
            contract_effective_date,
            contract_termination_date,
            principal_amount,
            monthly_rights_amount,
            monthly_rental_amount,
            downpayment,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lessee_id,
          unitIds[0] || null,
          property_id,
          contract_effective_date,
          contract_termination_date || null,
          principal_amount || 0,
          monthly_rights_amount || 0,
          monthly_rental_amount || 0,
          downpayment || 0,
          status
        ]);

        // Insert all units into junction table and mark them occupied if active
        for (const unitId of unitIds) {
          await connection.query(
            'INSERT IGNORE INTO lease_contract_units (lease_contract_id, property_unit_id) VALUES (?, ?)',
            [result.insertId, unitId]
          );
          if (status === 'active') {
            await connection.query(
              'UPDATE property_units SET status = ?, lessee_id = ? WHERE id = ?',
              ['occupied', lessee_id, unitId]
            );
          }
        }

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
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
      const { id } = req.params;
      const {
        property_unit_ids,
        contract_effective_date,
        contract_termination_date,
        principal_amount,
        monthly_rights_amount,
        monthly_rental_amount,
        downpayment,
        status
      } = req.body;

      // Normalise incoming unit IDs (may be undefined if not changed)
      const newUnitIds = Array.isArray(property_unit_ids)
        ? property_unit_ids.map(Number).filter(Boolean)
        : undefined;

      const connection = await pool.getConnection();
      try {
        // Get current contract
        const [currentContract] = await connection.query(
          'SELECT property_unit_id, lessee_id, status FROM lease_contracts WHERE id = ?',
          [id]
        );

        const newStatus = status || currentContract[0]?.status;

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

        if (newUnitIds !== undefined) {
          // Fetch current units from junction table
          let currentUnitIds = [];
          try {
            const [currentUnits] = await connection.query(
              'SELECT property_unit_id FROM lease_contract_units WHERE lease_contract_id = ?',
              [id]
            );
            currentUnitIds = currentUnits.map(u => u.property_unit_id);
          } catch (e) { /* junction table may not exist yet */ }

          // Reset units that are being removed
          for (const oldId of currentUnitIds) {
            if (!newUnitIds.includes(oldId)) {
              await connection.query(
                'UPDATE property_units SET status = ?, lessee_id = NULL WHERE id = ?',
                ['available', oldId]
              );
            }
          }

          // Replace junction table entries
          try {
            await connection.query(
              'DELETE FROM lease_contract_units WHERE lease_contract_id = ?',
              [id]
            );
            for (const unitId of newUnitIds) {
              await connection.query(
                'INSERT IGNORE INTO lease_contract_units (lease_contract_id, property_unit_id) VALUES (?, ?)',
                [id, unitId]
              );
              if (newStatus === 'active') {
                await connection.query(
                  'UPDATE property_units SET status = ?, lessee_id = ? WHERE id = ?',
                  ['occupied', currentContract[0].lessee_id, unitId]
                );
              } else {
                await connection.query(
                  'UPDATE property_units SET status = ?, lessee_id = NULL WHERE id = ?',
                  ['available', unitId]
                );
              }
            }
          } catch (e) { /* junction table may not exist yet */ }

          // Keep property_unit_id in sync with first unit
          await connection.query(
            'UPDATE lease_contracts SET property_unit_id = ? WHERE id = ?',
            [newUnitIds[0] || null, id]
          );
        } else {
          // No unit changes – just sync status on the legacy single unit if any
          const unitId = currentContract[0]?.property_unit_id;
          if (unitId) {
            if (newStatus === 'active') {
              await connection.query(
                'UPDATE property_units SET status = ?, lessee_id = ? WHERE id = ?',
                ['occupied', currentContract[0].lessee_id, unitId]
              );
            } else {
              await connection.query(
                'UPDATE property_units SET status = ?, lessee_id = NULL WHERE id = ?',
                ['available', unitId]
              );
            }
          }
        }

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

// Update outstanding / previous rental balance for a lease contract
router.patch('/lease-contracts/:id/outstanding-balance', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
      const { id } = req.params;
      const { outstanding_rental_balance, outstanding_balance_notes } = req.body;

      if (outstanding_rental_balance === undefined || outstanding_rental_balance === null || outstanding_rental_balance === '') {
        return res.status(400).json({ error: 'Outstanding balance amount is required' });
      }

      const amount = parseFloat(outstanding_rental_balance);
      if (Number.isNaN(amount) || amount < 0) {
        return res.status(400).json({ error: 'Outstanding balance must be a non-negative number' });
      }

      const connection = await pool.getConnection();
      try {
        const [existing] = await connection.query('SELECT id FROM lease_contracts WHERE id = ?', [id]);
        if (!existing.length) {
          return res.status(404).json({ error: 'Lease contract not found' });
        }

        await connection.query(`
          UPDATE lease_contracts SET
            outstanding_rental_balance = ?,
            outstanding_balance_notes = ?
          WHERE id = ?
        `, [amount, outstanding_balance_notes || null, id]);

        const [updated] = await connection.query(`
          SELECT lc.*, l.name AS lessee_name, p.property_name
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
          `Updated outstanding rental balance to ${amount.toFixed(2)}`
        );

        res.json(updated[0]);
      } catch (dbError) {
        if (dbError.code === 'ER_BAD_FIELD_ERROR') {
          return res.status(500).json({
            error: 'Outstanding balance columns are missing. Run database/migrations/add_lease_contract_outstanding_balance.sql'
          });
        }
        throw dbError;
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Update outstanding balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a lease contract
router.delete('/lease-contracts/:id', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        const [contract] = await connection.query(
          'SELECT lessee_id, property_id, property_unit_id FROM lease_contracts WHERE id = ?',
          [id]
        );

        if (contract.length === 0) {
          return res.status(404).json({ error: 'Lease contract not found' });
        }

        // Reset all linked units to available when contract is deleted
        try {
          const [contractUnits] = await connection.query(
            'SELECT property_unit_id FROM lease_contract_units WHERE lease_contract_id = ?',
            [id]
          );
          const resetIds = new Set(contractUnits.map(u => u.property_unit_id));
          // Also include legacy property_unit_id in case it wasn't migrated
          if (contract[0].property_unit_id) resetIds.add(contract[0].property_unit_id);
          for (const unitId of resetIds) {
            await connection.query(
              'UPDATE property_units SET status = ?, lessee_id = NULL WHERE id = ?',
              ['available', unitId]
            );
          }
        } catch (e) {
          // Fallback for legacy single unit
          if (contract[0].property_unit_id) {
            await connection.query(
              'UPDATE property_units SET status = ?, lessee_id = NULL WHERE id = ?',
              ['available', contract[0].property_unit_id]
            );
          }
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

// ========== PAYMENT MANAGEMENT ==========

// Get account balance for a lease contract
router.get('/lease-contracts/:contract_id/balance', async (req, res) => {
  try {
    const { contract_id } = req.params;
    const connection = await pool.getConnection();
    try {
      // Get account balance
      const [balance] = await connection.query(`
        SELECT 
          id,
          lease_contract_id,
          principal_balance,
          rights_balance,
          rental_balance,
          total_balance,
          last_updated
        FROM account_balances
        WHERE lease_contract_id = ?
      `, [contract_id]);

      if (balance && balance.length > 0) {
        return res.json(balance[0]);
      }

      // If no balance record exists, calculate from contract and payments
      const [contract] = await connection.query(`
        SELECT principal_amount, monthly_rights_amount, monthly_rental_amount, downpayment
        FROM lease_contracts
        WHERE id = ?
      `, [contract_id]);

      if (!contract || contract.length === 0) {
        return res.status(404).json({ error: 'Lease contract not found' });
      }

      const [rightsPayments] = await connection.query(`
        SELECT COALESCE(SUM(amount_paid), 0) as total_paid
        FROM payment_history_rights
        WHERE lease_contract_id = ?
      `, [contract_id]);

      const [rentalPayments] = await connection.query(`
        SELECT COALESCE(SUM(amount_paid), 0) as total_paid
        FROM payment_history_rental
        WHERE lease_contract_id = ?
      `, [contract_id]);

      const princ = parseFloat(contract[0].principal_amount) || 0;
      const rights = parseFloat(contract[0].monthly_rights_amount) || 0;
      const rental = parseFloat(contract[0].monthly_rental_amount) || 0;
      const downpay = parseFloat(contract[0].downpayment) || 0;

      const principalBal = princ - downpay;
      const totalRightsPaid = parseFloat(rightsPayments[0].total_paid) || 0;
      const totalRentalPaid = parseFloat(rentalPayments[0].total_paid) || 0;
      // Rights: remaining balance after deducting payments from principal
      const rightsBal = principalBal - totalRightsPaid;
      // Rental: cumulative total of rental payments collected
      const rentalBal = totalRentalPaid;
      const totalBal = rightsBal + rentalBal;

      res.json({
        principal_balance: principalBal,
        rights_balance: rightsBal,
        rental_balance: rentalBal,
        total_balance: totalBal
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get account balance error:', error.message || error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get payment history for a lease contract
router.get('/lease-contracts/:contract_id/payments', async (req, res) => {
  try {
    const { contract_id } = req.params;
    const connection = await pool.getConnection();
    try {
      // Get contract details for balance calculation
      const [contract] = await connection.query(`
        SELECT principal_amount, downpayment
        FROM lease_contracts
        WHERE id = ?
      `, [contract_id]);

      if (!contract || contract.length === 0) {
        return res.status(404).json({ error: 'Lease contract not found' });
      }

      const initialBalance = (contract[0].principal_amount || 0) - (contract[0].downpayment || 0);

      // Get rights payments
      const [rightsPayments] = await connection.query(`
        SELECT 
          id,
          lease_contract_id,
          period_month,
          period_year,
          or_number,
          payment_date,
          amount_paid,
          collectible,
          delinquent,
          balance,
          'rights' as payment_type
        FROM payment_history_rights
        WHERE lease_contract_id = ?
        ORDER BY payment_date DESC
      `, [contract_id]);

      // Get rental payments
      const [rentalPayments] = await connection.query(`
        SELECT 
          id,
          lease_contract_id,
          period_month,
          period_year,
          or_number,
          payment_date,
          amount_paid,
          collectible,
          delinquent,
          balance,
          'rental' as payment_type
        FROM payment_history_rental
        WHERE lease_contract_id = ?
        ORDER BY payment_date DESC
      `, [contract_id]);

      // Combine and sort by date
      const allPayments = [...rightsPayments, ...rentalPayments].sort((a, b) => 
        new Date(b.payment_date) - new Date(a.payment_date)
      );

      // Calculate current balance (initial - sum of all payments)
      const totalRightsPaid = rightsPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
      const totalRentalPaid = rentalPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

      // Rights: remaining balance (initial minus payments deducted)
      const currentRightsBalance = initialBalance - totalRightsPaid;
      // Rental: cumulative total of all rental payments collected
      const currentRentalBalance = totalRentalPaid;

      res.json({
        payments: allPayments,
        current_balance: {
          initial: initialBalance,
          rights: currentRightsBalance,
          rental: currentRentalBalance,
          total: currentRightsBalance + currentRentalBalance
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get billing statement data for a lease contract
router.get('/lease-contracts/:contract_id/billing', async (req, res) => {
  try {
    const { contract_id } = req.params;
    const billingMonth = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const billingYear  = parseInt(req.query.year)  || new Date().getFullYear();

    const connection = await pool.getConnection();
    try {
      // Contract + lessee + property
      const [contracts] = await connection.query(`
        SELECT
          lc.*,
          l.name            AS lessee_name,
          l.email           AS lessee_email,
          l.contact_number  AS lessee_contact,
          p.property_name,
          p.property_code,
          p.address         AS property_address
        FROM lease_contracts lc
        JOIN lessees   l ON lc.lessee_id   = l.id
        JOIN properties p ON lc.property_id = p.id
        WHERE lc.id = ?
      `, [contract_id]);

      if (!contracts || contracts.length === 0) {
        return res.status(404).json({ error: 'Lease contract not found' });
      }
      const contract = contracts[0];

      // Property units via junction table
      const [units] = await connection.query(`
        SELECT pu.id, pu.stall_number, pu.floor_level, pu.unit_description, pu.area_sqm
        FROM lease_contract_units lcu
        JOIN property_units pu ON lcu.property_unit_id = pu.id
        WHERE lcu.lease_contract_id = ?
      `, [contract_id]);

      const principal     = parseFloat(contract.principal_amount)     || 0;
      const downpayment   = parseFloat(contract.downpayment)          || 0;
      const monthlyRights = parseFloat(contract.monthly_rights_amount) || 0;
      const monthlyRental = parseFloat(contract.monthly_rental_amount) || 0;

      // Total rights payments ever paid
      const [rightsTotalRow] = await connection.query(`
        SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
        FROM payment_history_rights
        WHERE lease_contract_id = ?
      `, [contract_id]);
      const totalRightsPaid = parseFloat(rightsTotalRow[0].total_paid) || 0;
      const rightsBalance   = principal - downpayment - totalRightsPaid;

      // Previous month unpaid rental balance
      const prevMonth = billingMonth === 1 ? 12 : billingMonth - 1;
      const prevYear  = billingMonth === 1 ? billingYear - 1 : billingYear;

      const [prevBalRow] = await connection.query(`
        SELECT COALESCE(balance, 0) AS balance
        FROM payment_history_rental
        WHERE lease_contract_id = ? AND period_month = ? AND period_year = ?
        ORDER BY id DESC LIMIT 1
      `, [contract_id, prevMonth, prevYear]);
      const previousMonthBalance = prevBalRow.length > 0 ? parseFloat(prevBalRow[0].balance) || 0 : 0;
      const outstandingBalance   = parseFloat(contract.outstanding_rental_balance) || 0;
      const previousBalance      = parseFloat((previousMonthBalance + outstandingBalance).toFixed(2));
      const surcharge       = previousBalance > 0 ? parseFloat((previousBalance * 0.20).toFixed(2)) : 0;

      // Current month rental payment (if any – for "Less: Late Payments" line)
      const [currRentalRow] = await connection.query(`
        SELECT or_number, COALESCE(amount_paid, 0) AS amount_paid
        FROM payment_history_rental
        WHERE lease_contract_id = ? AND period_month = ? AND period_year = ?
        ORDER BY id DESC LIMIT 1
      `, [contract_id, billingMonth, billingYear]);
      const latePaymentOR     = currRentalRow.length > 0 ? currRentalRow[0].or_number : null;
      const latePaymentAmount = currRentalRow.length > 0 ? parseFloat(currRentalRow[0].amount_paid) || 0 : 0;

      const rentalDues = parseFloat((previousBalance + surcharge + monthlyRental - latePaymentAmount).toFixed(2));
      const rightsDues = monthlyRights;
      const totalDue   = parseFloat((rightsDues + rentalDues).toFixed(2));

      // Billing statement number: {property_code}-{year}-{mm}-{contractId padded}
      const billingNumber = `${contract.property_code}-${billingYear}-${String(billingMonth).padStart(2, '0')}-${String(contract_id).padStart(3, '0')}`;

      // Last calendar day of billing month
      const lastDay = new Date(billingYear, billingMonth, 0).getDate();

      res.json({
        contract: { ...contract, property_units: units },
        billing: {
          billing_number:   billingNumber,
          billing_month:    billingMonth,
          billing_year:     billingYear,
          payment_due_date: `${billingYear}-${String(billingMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          rights: {
            principal,
            downpayment,
            total_paid: totalRightsPaid,
            balance:    rightsBalance,
            monthly_amount: monthlyRights,
            dues:       rightsDues
          },
          rental: {
            previous_balance:    previousBalance,
            previous_month_balance: previousMonthBalance,
            outstanding_balance: outstandingBalance,
            outstanding_balance_notes: contract.outstanding_balance_notes || null,
            surcharge,
            this_month:          monthlyRental,
            late_payment_or:     latePaymentOR,
            late_payment_amount: latePaymentAmount,
            monthly_rental:      monthlyRental,
            dues:                rentalDues
          },
          total_due: totalDue
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a new payment for rights and/or rental
router.post('/lease-contracts/:contract_id/payments/record', async (req, res) => {
  try {
    authorize('SuperAdmin', 'Admin', 'Rights and Rentals Manager')(req, res, async () => {
      const { contract_id } = req.params;
      const { payment_date, rights_amount, rental_amount, or_number } = req.body;

      if (!payment_date || (!rights_amount && !rental_amount)) {
        return res.status(400).json({ error: 'Payment date and at least one payment amount are required' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Get period from payment_date
        const paymentDate = new Date(payment_date);
        const period_month = paymentDate.getMonth() + 1;
        const period_year = paymentDate.getFullYear();

        // Get lease contract details to calculate initial balance
        const [leaseContract] = await connection.query(`
          SELECT principal_amount, downpayment
          FROM lease_contracts
          WHERE id = ?
        `, [contract_id]);

        if (!leaseContract || leaseContract.length === 0) {
          throw new Error('Lease contract not found');
        }

        const contract = leaseContract[0];
        const initialBalance = (contract.principal_amount || 0) - (contract.downpayment || 0);

        // Get sum of all previous rights payments
        const [rightsPaid] = await connection.query(`
          SELECT COALESCE(SUM(amount_paid), 0) as total_paid
          FROM payment_history_rights
          WHERE lease_contract_id = ?
        `, [contract_id]);

        const totalRightsPaid = parseFloat(rightsPaid[0].total_paid) || 0;
        // Rights balance = initial minus all rights payments deducted
        let currentRightsBalance = initialBalance - totalRightsPaid;

        // Get sum of all previous rental payments
        const [rentalPaid] = await connection.query(`
          SELECT COALESCE(SUM(amount_paid), 0) as total_paid
          FROM payment_history_rental
          WHERE lease_contract_id = ?
        `, [contract_id]);

        const totalRentalPaid = parseFloat(rentalPaid[0].total_paid) || 0;
        // Rental balance = cumulative total of all rental payments collected
        let currentRentalBalance = totalRentalPaid;

        // Record rights payment if amount provided
        if (rights_amount && parseFloat(rights_amount) > 0) {
          const rightsPaymentAmount = parseFloat(rights_amount);
          const newRightsBalance = currentRightsBalance - rightsPaymentAmount;

          await connection.query(`
            INSERT INTO payment_history_rights 
            (lease_contract_id, period_month, period_year, or_number, payment_date, amount_paid, collectible, delinquent, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [contract_id, period_month, period_year, or_number || null, payment_date, rightsPaymentAmount, rightsPaymentAmount, 0, newRightsBalance]);

          currentRightsBalance = newRightsBalance;
        }

        // Record rental payment if amount provided
        if (rental_amount && parseFloat(rental_amount) > 0) {
          const rentalPaymentAmount = parseFloat(rental_amount);
          // Rental balance is cumulative: add this payment to the running total
          const newRentalBalance = currentRentalBalance + rentalPaymentAmount;

          await connection.query(`
            INSERT INTO payment_history_rental 
            (lease_contract_id, period_month, period_year, or_number, payment_date, amount_paid, collectible, delinquent, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [contract_id, period_month, period_year, or_number || null, payment_date, rentalPaymentAmount, rentalPaymentAmount, 0, newRentalBalance]);

          currentRentalBalance = newRentalBalance;
        }

        // Log the action
        await logAction(req.user.user_id, 'CREATE', 'payments', contract_id, 
          `Recorded payment - Rights: ${rights_amount || 0}, Rental: ${rental_amount || 0}. New Balance - Rights: ${currentRightsBalance}, Rental: ${currentRentalBalance}`);

        await connection.commit();

        res.status(201).json({ 
          message: 'Payment recorded successfully',
          contract_id,
          period_month,
          period_year,
          rights_amount: rights_amount ? parseFloat(rights_amount) : null,
          rental_amount: rental_amount ? parseFloat(rental_amount) : null,
          or_number,
          payment_date,
          remaining_balance: {
            rights: currentRightsBalance,
            rental: currentRentalBalance,
            total: currentRightsBalance + currentRentalBalance
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
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
