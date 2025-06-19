const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const noteRoutes = require('./routes/notes');
const authRoutes = require('./routes/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

dotenv.config();
const app = express();

// Configure CORS with specific options
const corsOptions = {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.static('public'));
app.use('/images', express.static('backend/public/images'));
// Session middleware
app.use(session({
    secret: 'notenexus-secret-key', // In production, use a proper secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/notes', noteRoutes);
app.use('/api/auth', authRoutes);


// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/notenexus', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    // Start the server only after MongoDB connection is established
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('CORS enabled for all origins');
    });
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
