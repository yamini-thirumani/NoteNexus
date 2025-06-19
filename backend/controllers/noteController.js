const Note = require('../models/Note');

// Create a new note with mock summarization
exports.createNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user.id; // Will be set by auth middleware

        // Mock summarization (in production, this would use a real AI model)
        const summary = mockSummarize(content);

        const note = new Note({
            title,
            content,
            userId,
            summary
        });

        await note.save();

        res.status(201).json({
            message: 'Note created successfully',
            note
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ 
            message: 'Error creating note' 
        });
    }
};

// Get all notes for a user
exports.getNotes = async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ 
            message: 'Error fetching notes' 
        });
    }
};

// Mock summarization function
function mockSummarize(content) {
    // Split content into sentences
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    
    // Take first 2-3 sentences as summary
    const summaryLength = Math.min(3, Math.ceil(sentences.length / 2));
    const summary = sentences.slice(0, summaryLength).join('. ') + '.';
    
    return summary;
}
