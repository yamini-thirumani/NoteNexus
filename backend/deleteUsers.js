require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function deleteAllUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Delete all users
        const result = await User.deleteMany({});
        console.log(`Deleted ${result.deletedCount} users successfully`);

        // Close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the function
deleteAllUsers(); 