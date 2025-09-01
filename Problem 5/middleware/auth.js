const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (empId) => {
    return jwt.sign({ empId }, JWT_SECRET, { expiresIn: '24h' });
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const employee = await Employee.findOne({ empId: decoded.empId, isActive: true });
        
        if (!employee) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token or employee not found.' 
            });
        }

        req.employee = employee;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token.' 
        });
    }
};

module.exports = {
    generateToken,
    verifyToken
};
