const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const notesController = require('../controllers/notesController');
const auth = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for audio uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'voice-note-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed types: ' + allowedTypes.join(', ')));
        }
    }
}).single('audio');

// Error handling middleware for multer
const handleUpload = (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    message: 'File too large. Maximum size is 50MB'
                });
            }
            return res.status(400).json({
                message: 'Error uploading file',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        next();
    });
};

// All note routes require authentication
router.use(auth);

// Get all notes for the current user
router.get('/', notesController.getAllNotes);

// Get a single note
router.get('/:id', notesController.getNoteById);

// Create a new text note
router.post('/', notesController.createNote);

// Create a voice note
// router.post('/voice', handleUpload, notesController.createVoiceNote);

// Update a note
router.put('/:id', notesController.updateNote);

// Delete a note
router.delete('/:id', notesController.deleteNote);

// Add summarize route
router.post('/summarize', notesController.summarizeNote);

// Audio upload route
router.post('/upload-audio', handleUpload, notesController.uploadAudio);

module.exports = router;
