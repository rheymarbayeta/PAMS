/**
 * File Upload Middleware
 * Handles file uploads for DOCX templates using multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateId } = require('../utils/idGenerator');

// Ensure upload directories exist
const templatesDir = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}

// Configure storage for templates
const templateStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, templatesDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: template_<hash>_<timestamp>.docx
        const uniqueId = generateId();
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `template_${uniqueId}_${timestamp}${ext}`;
        cb(null, filename);
    }
});

// File filter to only accept DOCX files
const docxFileFilter = (req, file, cb) => {
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check MIME type and extension
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    const allowedExts = ['.docx', '.doc'];
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only Microsoft Word documents (.docx, .doc) are allowed'), false);
    }
};

// Create multer instance for template uploads
const uploadTemplate = multer({
    storage: templateStorage,
    fileFilter: docxFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 1 // Only one file at a time
    }
});

// Error handling middleware for multer errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

// Utility to delete uploaded file (cleanup on error)
const deleteUploadedFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

// Get the templates directory path
const getTemplatesDir = () => templatesDir;

module.exports = {
    uploadTemplate,
    handleUploadError,
    deleteUploadedFile,
    getTemplatesDir
};
