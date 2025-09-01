const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { generateToken } = require('../middleware/auth');
const router = express.Router();

// Employee login
router.post('/login', [
    body('empId').notEmpty().withMessage('Employee ID is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { empId, password } = req.body;

        // Find employee
        const employee = await Employee.findOne({ empId, isActive: true });
        if (!employee) {
            return res.status(401).json({
                success: false,
                message: 'Invalid employee ID or password'
            });
        }

        // Check password
        const isPasswordValid = await employee.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid employee ID or password'
            });
        }

        // Generate token
        const token = generateToken(employee.empId);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            employee: {
                empId: employee.empId,
                fullName: employee.fullName,
                email: employee.email,
                department: employee.department,
                position: employee.position
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
