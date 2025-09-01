const express = require('express');
const { verifyToken } = require('../middleware/auth');
const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const router = express.Router();

// Get employee profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const employee = req.employee;
        
        res.json({
            success: true,
            employee: {
                empId: employee.empId,
                fullName: employee.fullName,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                position: employee.position,
                joiningDate: moment(employee.joiningDate).format('DD/MM/YYYY'),
                yearsOfService: employee.yearsOfService,
                baseSalary: employee.baseSalary,
                allowances: employee.allowances,
                deductions: employee.deductions,
                grossSalary: employee.grossSalary,
                netSalary: employee.netSalary,
                totalAllowances: employee.totalAllowances,
                totalDeductions: employee.totalDeductions
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Apply for leave
router.post('/leave/apply', verifyToken, [
    body('leaveDate').isISO8601().withMessage('Valid leave date is required'),
    body('reason').notEmpty().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10-500 characters')
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

        const { leaveDate, reason } = req.body;
        const employee = req.employee;

        // Check if leave date is in the future
        const selectedDate = new Date(leaveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Leave date must be in the future'
            });
        }

        // Check if leave already applied for this date
        const existingLeave = await LeaveApplication.findOne({
            empId: employee.empId,
            leaveDate: selectedDate
        });

        if (existingLeave) {
            return res.status(400).json({
                success: false,
                message: 'Leave already applied for this date'
            });
        }

        // Create leave application
        const leaveApplication = new LeaveApplication({
            empId: employee.empId,
            employeeName: employee.fullName,
            leaveDate: selectedDate,
            reason: reason.trim()
        });

        await leaveApplication.save();

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully',
            leaveApplication: {
                id: leaveApplication._id,
                leaveDate: moment(leaveApplication.leaveDate).format('DD/MM/YYYY'),
                reason: leaveApplication.reason,
                status: leaveApplication.status,
                appliedDate: moment(leaveApplication.appliedDate).format('DD/MM/YYYY HH:mm')
            }
        });

    } catch (error) {
        console.error('Leave application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit leave application'
        });
    }
});

// Get employee's leave applications
router.get('/leave/list', verifyToken, async (req, res) => {
    try {
        const employee = req.employee;
        
        const leaveApplications = await LeaveApplication.find({ empId: employee.empId })
            .sort({ appliedDate: -1 });

        const formattedApplications = leaveApplications.map(leave => ({
            id: leave._id,
            leaveDate: moment(leave.leaveDate).format('DD/MM/YYYY'),
            reason: leave.reason,
            status: leave.status,
            appliedDate: moment(leave.appliedDate).format('DD/MM/YYYY HH:mm'),
            reviewDate: leave.reviewDate ? moment(leave.reviewDate).format('DD/MM/YYYY HH:mm') : null,
            comments: leave.comments || ''
        }));

        res.json({
            success: true,
            leaveApplications: formattedApplications
        });

    } catch (error) {
        console.error('Leave list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave applications'
        });
    }
});

module.exports = router;
