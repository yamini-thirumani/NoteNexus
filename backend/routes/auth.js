const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register route
router.post('/register', (req, res, next) => {
    console.log('Register request received:', {
        body: { ...req.body, password: '[REDACTED]' }
    });
    authController.register(req, res).catch(next);
});

// Login route
router.post('/login', (req, res, next) => {
    console.log('Login request received:', {
        body: { ...req.body, password: '[REDACTED]' }
    });
    authController.login(req, res).catch(next);
});

// Logout route
router.post('/logout', (req, res, next) => {
    authController.logout(req, res).catch(next);
});

module.exports = router; 