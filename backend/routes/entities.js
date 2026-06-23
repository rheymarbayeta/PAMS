const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const etracsService = require('../utils/etracsService');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all entities (with optional search)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = 'SELECT * FROM entities';
    const params = [];

    if (search) {
      query += ' WHERE entity_name LIKE ? OR contact_person LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY entity_name';

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
      'SELECT * FROM entities WHERE entity_id = ?',
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
        a.permit_number,
        a.permit_type,
        a.status,
        a.validity_date,
        a.issued_at,
        a.created_at,
        a.updated_at,
        pt.permit_type_name
       FROM applications a
       LEFT JOIN permit_types pt ON a.permit_type_id = pt.permit_type_id
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
router.post('/', authorize('SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator', 'Waterworks Manager'), async (req, res) => {
  try {
    const {
      entity_name,
      firstname,
      middlename,
      lastname,
      birthdate,
      gender,
      entity_type = 'INDIVIDUAL',
      contact_person,
      email,
      phone,
      address,
      etracs_objid,
      etracs_entityno,
      etracs_match_score,
      etracs_matched_fields
    } = req.body;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const entity_id = generateId(ID_PREFIXES.ENTITY);

    const [result] = await pool.execute(
      `INSERT INTO entities (
        entity_id, entity_name, firstname, middlename, lastname, birthdate, gender,
        entity_type, contact_person, email, phone, address,
        etracs_objid, etracs_entityno, etracs_match_score, etracs_matched_fields, etracs_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        entity_id,
        entity_name || null,
        firstname || null,
        middlename || null,
        lastname || null,
        birthdate || null,
        gender || null,
        entity_type,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        etracs_objid || null,
        etracs_entityno || null,
        etracs_match_score || null,
        etracs_matched_fields ? JSON.stringify(etracs_matched_fields) : null
      ]
    );

    await logAction(req.user.user_id, 'CREATE_ENTITY', `Created entity '${entity_name}'`);

    res.status(201).json({
      entity_id,
      entity_name,
      firstname,
      middlename,
      lastname,
      birthdate,
      gender,
      entity_type,
      contact_person,
      email,
      phone,
      address,
      etracs_objid,
      etracs_entityno,
      etracs_match_score,
      etracs_matched_fields,
      etracs_synced_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update entity (all roles except Viewer)
router.put('/:id', authorize('SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator'), async (req, res) => {
  try {
    const {
      entity_name,
      firstname,
      middlename,
      lastname,
      birthdate,
      gender,
      entity_type,
      contact_person,
      email,
      phone,
      address,
      etracs_objid,
      etracs_entityno,
      etracs_match_score,
      etracs_matched_fields
    } = req.body;
    const entityId = req.params.id;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const [result] = await pool.execute(
      `UPDATE entities SET
        entity_name = ?, firstname = ?, middlename = ?, lastname = ?,
        birthdate = ?, gender = ?, entity_type = ?,
        contact_person = ?, email = ?, phone = ?, address = ?,
        etracs_objid = ?, etracs_entityno = ?, etracs_match_score = ?, etracs_matched_fields = ?
       WHERE entity_id = ?`,
      [
        entity_name || null,
        firstname || null,
        middlename || null,
        lastname || null,
        birthdate || null,
        gender || null,
        entity_type || 'INDIVIDUAL',
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        etracs_objid || null,
        etracs_entityno || null,
        etracs_match_score || null,
        etracs_matched_fields ? JSON.stringify(etracs_matched_fields) : null,
        entityId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    await logAction(req.user.user_id, 'UPDATE_ENTITY', `Updated entity ID ${entityId}`);

    // Fetch and return updated entity
    const [updatedEntity] = await pool.execute(
      'SELECT * FROM entities WHERE entity_id = ?',
      [entityId]
    );

    if (updatedEntity.length > 0) {
      const entity = updatedEntity[0];
      return res.json({
        message: 'Entity updated successfully',
        entity: {
          ...entity,
          etracs_matched_fields: entity.etracs_matched_fields ? JSON.parse(entity.etracs_matched_fields) : null
        }
      });
    }

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
      'SELECT application_id FROM applications WHERE entity_id = ?',
      [entityId]
    );

    if (applications.length > 0) {
      return res.status(400).json({ error: 'Cannot delete entity with existing applications' });
    }

    const [result] = await pool.execute(
      'DELETE FROM entities WHERE entity_id = ?',
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

// ==================== eTracs Integration Endpoints ====================

// Search eTracs for entities
router.get('/etracs/search', async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;

    const etracsResult = await etracsService.searchEntities(search, page);

    res.json({
      source: 'eTracs',
      search,
      ...etracsResult
    });
  } catch (error) {
    console.error('eTracs search error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to search eTracs',
      source: 'eTracs'
    });
  }
});

// Check for duplicate individuals in eTracs
router.get('/etracs/check-duplicate', async (req, res) => {
  try {
    const { firstname, lastname, middlename, birthdate } = req.query;

    if (!firstname && !lastname && !middlename && !birthdate) {
      return res.status(400).json({ 
        error: 'At least one field (firstname, lastname, middlename, birthdate) is required'
      });
    }

    const duplicates = await etracsService.checkDuplicateEntity({
      firstname,
      lastname,
      middlename,
      birthdate
    });

    res.json({
      source: 'eTracs',
      criteria: { firstname, lastname, middlename, birthdate },
      results: duplicates,
      exactMatch: duplicates.find(d => d.match_score === 100) || null
    });
  } catch (error) {
    console.error('eTracs duplicate check error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check duplicates in eTracs',
      source: 'eTracs'
    });
  }
});

// Sync an eTracs entity to PAMS local database
router.post('/etracs/sync', authorize('SuperAdmin', 'Admin', 'Application Creator'), async (req, res) => {
  try {
    const { etracs_objid, etracs_entityno } = req.body;

    if (!etracs_objid) {
      return res.status(400).json({ error: 'eTracs entity ID (objid) is required' });
    }

    // Get the entity from eTracs
    const etracsEntity = await etracsService.getEntityWithIndividuals(etracs_objid);

    // Check if already synced
    const [existing] = await pool.execute(
      'SELECT entity_id FROM entities WHERE etracs_objid = ?',
      [etracs_objid]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Entity already synced',
        entity_id: existing[0].entity_id
      });
    }

    // Create local entity record
    const entity_id = generateId(ID_PREFIXES.ENTITY);
    const entity_name = etracsEntity.name || 'Unknown Entity';
    
    let contact_person = null;
    if (etracsEntity.individual && etracsEntity.individual.firstname) {
      contact_person = [
        etracsEntity.individual.firstname,
        etracsEntity.individual.middlename,
        etracsEntity.individual.lastname
      ].filter(Boolean).join(' ');
    }

    const address = etracsEntity.address_text || null;

    await pool.execute(
      `INSERT INTO entities 
       (entity_id, entity_name, contact_person, email, phone, address, etracs_objid, etracs_entityno, synced_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [entity_id, entity_name, contact_person, null, null, address, etracs_objid, etracs_entityno || null]
    );

    await logAction(req.user.user_id, 'SYNC_ETRACS_ENTITY', `Synced eTracs entity ${etracs_objid} as ${entity_id}`);

    res.status(201).json({
      entity_id,
      entity_name,
      contact_person,
      address,
      etracs_objid,
      etracs_entityno,
      source: 'eTracs',
      synced_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('eTracs sync error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to sync eTracs entity',
      source: 'eTracs'
    });
  }
});

// Get eTracs entity details without syncing
router.get('/etracs/:etracs_id', async (req, res) => {
  try {
    const { etracs_id } = req.params;

    const entity = await etracsService.getEntityWithIndividuals(etracs_id);

    res.json({
      source: 'eTracs',
      ...entity
    });
  } catch (error) {
    console.error(`eTracs get entity ${etracs_id} error:`, error);
    if (error.status === 404) {
      return res.status(404).json({ error: 'Entity not found in eTracs' });
    }
    res.status(500).json({ 
      error: error.message || 'Failed to fetch eTracs entity'
    });
  }
});

module.exports = router;

