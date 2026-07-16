const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { fail } = require('../utils/apiResponse');

const router = express.Router();

const attachmentsDir = path.join(__dirname, '..', 'uploads', 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, attachmentsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 20);
    cb(null, `${generateId('file')}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

router.use(authenticate);

router.get('/', requirePermission('applications', 'citations', 'rights_rentals_view', 'settings'), async (req, res) => {
  try {
    const { module, reference_type, reference_id } = req.query;
    if (!module || !reference_type || !reference_id) {
      return fail(res, 400, 'module, reference_type, and reference_id are required');
    }
    const [rows] = await pool.execute(
      `SELECT attachment_id, module, reference_type, reference_id, file_name, mime_type, size_bytes, uploaded_by, created_at
       FROM attachments
       WHERE module = ? AND reference_type = ? AND reference_id = ?
       ORDER BY created_at DESC`,
      [module, reference_type, reference_id]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('List attachments error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.post(
  '/',
  requirePermission('applications', 'citations', 'rights_rentals_view', 'settings'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { module, reference_type, reference_id } = req.body;
      if (!module || !reference_type || !reference_id || !req.file) {
        return fail(res, 400, 'module, reference_type, reference_id, and file are required');
      }
      const attachment_id = generateId(ID_PREFIXES.ATTACHMENT);
      await pool.execute(
        `INSERT INTO attachments
          (attachment_id, module, reference_type, reference_id, file_name, stored_name, mime_type, size_bytes, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attachment_id,
          module,
          reference_type,
          reference_id,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
          req.user.user_id,
        ]
      );
      res.status(201).json({
        attachment_id,
        file_name: req.file.originalname,
        size_bytes: req.file.size,
      });
    } catch (error) {
      console.error('Upload attachment error:', error);
      return fail(res, 500, 'Internal server error');
    }
  }
);

router.get('/:id/download', requirePermission('applications', 'citations', 'rights_rentals_view', 'settings'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE attachment_id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Not found');
    const filePath = path.join(attachmentsDir, rows[0].stored_name);
    if (!fs.existsSync(filePath)) return fail(res, 404, 'File missing on disk');
    res.download(filePath, rows[0].file_name);
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requirePermission('settings', 'applications'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE attachment_id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Not found');
    const filePath = path.join(attachmentsDir, rows[0].stored_name);
    await pool.execute('DELETE FROM attachments WHERE attachment_id = ?', [req.params.id]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Deleted' });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
