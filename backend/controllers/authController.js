const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
};

// Register new user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ 
                message: 'User already exists with this email or username' 
            });
        }

        // Create new user
        user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'Signup successful',
            token,
            user: {
                id: user._id,
                name: user.username, 
                email: user.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            message: 'An error occurred during signup. Please try again.' 
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Please provide both email and password' 
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        
        // Check if user exists
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = generateToken(user);

        const response = {
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.username, 
                email: user.email
            }
        };

        console.log('Login successful for:', email);
        console.log('Sending response:', { ...response, token: '[HIDDEN]' });

        res.json(response);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'An error occurred during login. Please try again.' 
        });
    }
};

// Logout user
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                message: 'Error logging out' 
            });
        }
        res.json({ message: 'Logged out successfully' });
    });
};