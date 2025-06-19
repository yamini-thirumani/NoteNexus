const Note = require('../models/Note');
const { transcribeAudio } = require('../utils/assemblyAI');
const { summarizeText } = require('../utils/summarizer');
const path = require('path');

// Upload audio and get transcription
exports.uploadAudio = async (req, res) => {
    try {
        console.log('\n=== Starting Audio Upload Process ===');
        
        if (!req.file) {
            console.error('❌ No file received in request');
            return res.status(400).json({ 
                message: 'No audio file provided',
                details: 'The request did not contain any file data'
            });
        }

        console.log('Audio file details:', {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            fieldname: req.file.fieldname
        });

        // Validate file type
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            console.error('❌ Invalid file type:', req.file.mimetype);
            return res.status(400).json({ 
                message: 'Invalid file type',
                details: `File type ${req.file.mimetype} is not supported. Supported types: ${allowedTypes.join(', ')}`
            });
        }

        console.log('✅ File validation passed');
        console.log('Starting transcription process...');

        // Get transcription from AssemblyAI
        const transcription = await transcribeAudio(req.file.path);
        console.log('Transcription received, length:', transcription.length, 'characters');

        // Return both the file URL and transcription
        const response = {
            audioUrl: `/uploads/${req.file.filename}`,
            transcription
        };
        
        console.log('✅ Audio upload and transcription completed successfully');
        console.log('Response:', response);
        console.log('\n=== Audio Upload Process Complete ===\n');
        
        res.json(response);
    } catch (error) {
        console.error('\n❌ Error handling audio upload:', {
            error: error.message,
            stack: error.stack,
            request: {
                headers: req.headers,
                body: req.body,
                file: req.file
            }
        });
        res.status(500).json({ 
            message: 'Failed to process audio file',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get all notes for the current user
exports.getAllNotes = async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Error fetching notes' });
    }
};

// Get a single note
exports.getNoteById = async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new note
exports.createNote = async (req, res) => {
    try {
        const { title, content, audioUrl, summary } = req.body;
        
        const note = new Note({
            title,
            content,
            userId: req.user._id,
            audioUrl,
            summary
        });

        await note.save();
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Error creating note' });
    }
};

// Update a note
exports.updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, audioUrl, summary } = req.body;

        // First check if the note exists and belongs to the user
        const note = await Note.findOne({ _id: id, userId: req.user._id });
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }

        // Update the note
        const updatedNote = await Note.findByIdAndUpdate(
            id,
            { title, content, audioUrl, summary },
            { new: true }
        );

        res.json(updatedNote);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Error updating note' });
    }
};

// Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;

        // First check if the note exists and belongs to the user
        const note = await Note.findOne({ _id: id, userId: req.user._id });
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }

        await Note.findByIdAndDelete(id);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Error deleting note' });
    }
};

// New summarizeNote controller function
exports.summarizeNote = async (req, res) => {
    try {
        const { text, title } = req.body;
        if (!text || !title) {
            return res.status(400).json({ message: 'Text and title are required for summarization' });
        }

        const summary = await summarizeText(text);

        res.json({ summary });
    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({ message: 'Failed to generate summary' });
    }
};
