/**
 * Templates Routes
 * Handles CRUD operations for DOCX report templates
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadTemplate, handleUploadError, deleteUploadedFile, getTemplatesDir } = require('../middleware/upload');
const { generateId } = require('../utils/idGenerator');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/templates
 * Get all templates, optionally filtered by permit_type_id
 */
router.get('/', async (req, res) => {
    try {
        const { permit_type_id, active_only } = req.query;
        
        let query = `
            SELECT 
                t.template_id,
                t.template_name,
                t.file_name,
                t.file_size,
                t.permit_type_id,
                t.description,
                t.is_default,
                t.is_active,
                t.created_at,
                t.updated_at,
                pt.permit_type_name,
                u.full_name as created_by_name
            FROM report_templates t
            LEFT JOIN permit_types pt ON t.permit_type_id = pt.permit_type_id
            LEFT JOIN users u ON t.created_by = u.user_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (permit_type_id) {
            query += ' AND t.permit_type_id = ?';
            params.push(permit_type_id);
        }
        
        if (active_only === 'true') {
            query += ' AND t.is_active = TRUE';
        }
        
        query += ' ORDER BY t.is_default DESC, t.created_at DESC';
        
        const [templates] = await db.query(query, params);
        
        res.json(templates);
    } catch (error) {
        console.error('[Templates] Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * GET /api/templates/:id
 * Get a single template by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [templates] = await db.query(`
            SELECT 
                t.template_id,
                t.template_name,
                t.file_name,
                t.file_path,
                t.file_size,
                t.permit_type_id,
                t.description,
                t.is_default,
                t.is_active,
                t.created_at,
                t.updated_at,
                pt.permit_type_name,
                u.full_name as created_by_name
            FROM report_templates t
            LEFT JOIN permit_types pt ON t.permit_type_id = pt.permit_type_id
            LEFT JOIN users u ON t.created_by = u.user_id
            WHERE t.template_id = ?
        `, [id]);
        
        if (templates.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        res.json(templates[0]);
    } catch (error) {
        console.error('[Templates] Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * POST /api/templates/upload
 * Upload a new template
 */
router.post('/upload', 
    authorize(['SuperAdmin', 'Admin']),
    uploadTemplate.single('template'),
    handleUploadError,
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            const { template_name, permit_type_id, description, is_default } = req.body;
            
            if (!template_name || template_name.trim() === '') {
                deleteUploadedFile(req.file.path);
                return res.status(400).json({ error: 'Template name is required' });
            }
            
            const templateId = generateId();
            
            // If setting as default, unset other defaults for same permit type
            if (is_default === 'true' || is_default === true) {
                if (permit_type_id) {
                    await db.query(
                        'UPDATE report_templates SET is_default = FALSE WHERE permit_type_id = ?',
                        [permit_type_id]
                    );
                } else {
                    // Unset default for general templates (no permit type)
                    await db.query(
                        'UPDATE report_templates SET is_default = FALSE WHERE permit_type_id IS NULL'
                    );
                }
            }
            
            // Insert template record
            await db.query(`
                INSERT INTO report_templates (
                    template_id,
                    template_name,
                    file_name,
                    file_path,
                    file_size,
                    permit_type_id,
                    description,
                    is_default,
                    is_active,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
            `, [
                templateId,
                template_name.trim(),
                req.file.originalname,
                req.file.path,
                req.file.size,
                permit_type_id || null,
                description || null,
                is_default === 'true' || is_default === true,
                req.user.user_id
            ]);
            
            console.log(`[Templates] Template uploaded: ${template_name} (ID: ${templateId})`);
            
            res.status(201).json({
                message: 'Template uploaded successfully',
                template_id: templateId,
                template_name: template_name.trim(),
                file_name: req.file.originalname
            });
        } catch (error) {
            console.error('[Templates] Error uploading template:', error);
            if (req.file) {
                deleteUploadedFile(req.file.path);
            }
            res.status(500).json({ error: 'Failed to upload template' });
        }
    }
);

/**
 * PUT /api/templates/:id
 * Update template metadata (not the file)
 */
router.put('/:id', 
    authorize(['SuperAdmin', 'Admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { template_name, permit_type_id, description, is_active } = req.body;
            
            // Check if template exists
            const [existing] = await db.query(
                'SELECT * FROM report_templates WHERE template_id = ?',
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }
            
            // Update template
            await db.query(`
                UPDATE report_templates SET
                    template_name = COALESCE(?, template_name),
                    permit_type_id = ?,
                    description = ?,
                    is_active = COALESCE(?, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE template_id = ?
            `, [
                template_name?.trim(),
                permit_type_id || null,
                description || null,
                is_active,
                id
            ]);
            
            console.log(`[Templates] Template updated: ${id}`);
            
            res.json({ message: 'Template updated successfully' });
        } catch (error) {
            console.error('[Templates] Error updating template:', error);
            res.status(500).json({ error: 'Failed to update template' });
        }
    }
);

/**
 * PUT /api/templates/:id/set-default
 * Set a template as the default for its permit type
 */
router.put('/:id/set-default', 
    authorize(['SuperAdmin', 'Admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get the template's permit_type_id
            const [templates] = await db.query(
                'SELECT permit_type_id FROM report_templates WHERE template_id = ?',
                [id]
            );
            
            if (templates.length === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }
            
            const permitTypeId = templates[0].permit_type_id;
            
            // Unset other defaults for the same permit type
            if (permitTypeId) {
                await db.query(
                    'UPDATE report_templates SET is_default = FALSE WHERE permit_type_id = ?',
                    [permitTypeId]
                );
            } else {
                await db.query(
                    'UPDATE report_templates SET is_default = FALSE WHERE permit_type_id IS NULL'
                );
            }
            
            // Set this template as default
            await db.query(
                'UPDATE report_templates SET is_default = TRUE WHERE template_id = ?',
                [id]
            );
            
            console.log(`[Templates] Template ${id} set as default`);
            
            res.json({ message: 'Template set as default successfully' });
        } catch (error) {
            console.error('[Templates] Error setting default template:', error);
            res.status(500).json({ error: 'Failed to set default template' });
        }
    }
);

/**
 * GET /api/templates/:id/download
 * Download a template file
 */
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [templates] = await db.query(
            'SELECT file_name, file_path FROM report_templates WHERE template_id = ?',
            [id]
        );
        
        if (templates.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const template = templates[0];
        
        if (!fs.existsSync(template.file_path)) {
            return res.status(404).json({ error: 'Template file not found on server' });
        }
        
        res.download(template.file_path, template.file_name);
    } catch (error) {
        console.error('[Templates] Error downloading template:', error);
        res.status(500).json({ error: 'Failed to download template' });
    }
});

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', 
    authorize(['SuperAdmin', 'Admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get template file path
            const [templates] = await db.query(
                'SELECT file_path FROM report_templates WHERE template_id = ?',
                [id]
            );
            
            if (templates.length === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }
            
            const filePath = templates[0].file_path;
            
            // Delete from database
            await db.query('DELETE FROM report_templates WHERE template_id = ?', [id]);
            
            // Delete file from disk
            deleteUploadedFile(filePath);
            
            console.log(`[Templates] Template deleted: ${id}`);
            
            res.json({ message: 'Template deleted successfully' });
        } catch (error) {
            console.error('[Templates] Error deleting template:', error);
            res.status(500).json({ error: 'Failed to delete template' });
        }
    }
);

/**
 * GET /api/templates/default/:permit_type_id
 * Get the default template for a permit type
 */
router.get('/default/:permit_type_id', async (req, res) => {
    try {
        const { permit_type_id } = req.params;
        
        // First try to find a default template for this specific permit type
        let [templates] = await db.query(`
            SELECT 
                t.template_id,
                t.template_name,
                t.file_name,
                t.file_path,
                t.permit_type_id
            FROM report_templates t
            WHERE t.permit_type_id = ? 
                AND t.is_default = TRUE 
                AND t.is_active = TRUE
            LIMIT 1
        `, [permit_type_id]);
        
        // If no specific default, try to find a general default (no permit type)
        if (templates.length === 0) {
            [templates] = await db.query(`
                SELECT 
                    t.template_id,
                    t.template_name,
                    t.file_name,
                    t.file_path,
                    t.permit_type_id
                FROM report_templates t
                WHERE t.permit_type_id IS NULL 
                    AND t.is_default = TRUE 
                    AND t.is_active = TRUE
                LIMIT 1
            `);
        }
        
        // If still no default, get any active template for this permit type
        if (templates.length === 0) {
            [templates] = await db.query(`
                SELECT 
                    t.template_id,
                    t.template_name,
                    t.file_name,
                    t.file_path,
                    t.permit_type_id
                FROM report_templates t
                WHERE (t.permit_type_id = ? OR t.permit_type_id IS NULL)
                    AND t.is_active = TRUE
                ORDER BY t.permit_type_id DESC, t.created_at DESC
                LIMIT 1
            `, [permit_type_id]);
        }
        
        if (templates.length === 0) {
            return res.status(404).json({ error: 'No template found for this permit type' });
        }
        
        res.json(templates[0]);
    } catch (error) {
        console.error('[Templates] Error fetching default template:', error);
        res.status(500).json({ error: 'Failed to fetch default template' });
    }
});

module.exports = router;
