const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logosDir = path.join(__dirname, '..', 'uploads', 'logos');
fs.mkdirSync(logosDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const logoUpload = multer({
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
      cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

// Get all settings (authenticated users can read)
router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key'
    );

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    // Check if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.status(500).json({ 
        error: 'System settings table not found. Please run the database migration first.',
        details: 'Run: mysql -u root -p < database/migrations/add_system_settings.sql'
      });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update settings (admin only) - must come before /:key route
router.put('/:key', authenticate, authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    console.log(`[Settings] Updating setting: key=${key}, value=${value}`);

    if (value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' });
    }

    // Check if table exists, if not return helpful error
    try {
      const [result] = await pool.execute(
        'UPDATE system_settings SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [value, description || null, key]
      );

      console.log(`[Settings] Update result for ${key}: affectedRows=${result.affectedRows}`);

      if (result.affectedRows === 0) {
        // Try to insert if it doesn't exist
        console.log(`[Settings] Inserting new setting: ${key}`);
        const setting_id = generateId(ID_PREFIXES.SYSTEM_SETTING);
        await pool.execute(
          'INSERT INTO system_settings (setting_id, setting_key, setting_value, description) VALUES (?, ?, ?, ?)',
          [setting_id, key, value, description || null]
        );
      }

      res.json({ message: 'Setting updated successfully' });
    } catch (dbError) {
      console.error(`[Settings] Database error for ${key}:`, dbError);
      // Check if it's a table doesn't exist error
      if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes("doesn't exist")) {
        console.error('system_settings table does not exist. Please run the migration:');
        console.error('mysql -u root -p < database/migrations/add_system_settings.sql');
        return res.status(500).json({ 
          error: 'System settings table not found. Please run the database migration first.',
          details: 'Run: mysql -u root -p < database/migrations/add_system_settings.sql'
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('[Settings] Update setting error:', error);
    console.error('[Settings] Error details:', error.message);
    console.error('[Settings] Error code:', error.code);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get a specific setting - must come after PUT route
router.get('/:key', authenticate, async (req, res) => {
  try {
    const { key } = req.params;
    const [settings] = await pool.execute(
      'SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (settings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({
      key: settings[0].setting_key,
      value: settings[0].setting_value,
      description: settings[0].description
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload logo (admin only) — POST /api/settings/upload-logo
router.post('/upload-logo', authenticate, authorize('SuperAdmin', 'Admin'), (req, res) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/api/settings/logo/${req.file.filename}`, filename: req.file.filename });
  });
});

// Serve logo file (no auth — needed for print/PDF rendering)
router.get('/logo/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).json({ error: 'Invalid filename' });
  const filePath = path.join(logosDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Logo not found' });
  res.sendFile(filePath);
});

module.exports = router;

