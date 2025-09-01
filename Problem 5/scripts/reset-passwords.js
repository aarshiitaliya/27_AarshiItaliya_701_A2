const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');

// MongoDB connection string
const mongoURI = 'mongodb+srv://aarshiitaliya:VCics3t47YDwMIPR@fullstackasgn.j5eu2kk.mongodb.net/leave_mgmt?retryWrites=true&w=majority';

async function resetPasswords() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // New default password
        const newPassword = 'employee123';

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update all employees
        const result = await Employee.updateMany(
            {},
            { 
                $set: { 
                    password: hashedPassword,
                    tempPassword: newPassword  // Store plain text password temporarily
                } 
            }
        );

        console.log(`Updated ${result.modifiedCount} employees`);
        console.log(`New password for all employees: ${newPassword}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the script
resetPasswords();
