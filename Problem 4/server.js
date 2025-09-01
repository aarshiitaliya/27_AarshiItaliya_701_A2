require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const path = require('path');

// Import models
const Employee = require('./models/Employee');
const Admin = require('./models/Admin');

// Import utilities
const { sendWelcomeEmail, sendUpdateNotification, testEmailConfig } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 3003;

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://aarshiitaliya:VCics3t47YDwMIPR@fullstackasgn.j5eu2kk.mongodb.net/erp_system?retryWrites=true&w=majority&appName=FullStackAsgn';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        initializeAdmin();
        testEmailConfig();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration with MongoDB store
app.use(session({
    secret: 'erp-admin-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize default admin user
async function initializeAdmin() {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const defaultAdmin = new Admin({
                username: 'admin',
                email: 'admin@company.com',
                password: 'admin123', // Will be hashed by pre-save middleware
                fullName: 'System Administrator',
                role: 'super_admin'
            });
            await defaultAdmin.save();
            console.log('Default admin user created: admin/admin123');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    } else {
        return res.redirect('/login?error=Please log in to access the admin panel');
    }
};

// Routes
app.get('/', (req, res) => {
    if (req.session.admin) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Login routes
app.get('/login', (req, res) => {
    if (req.session.admin) {
        return res.redirect('/dashboard');
    }
    res.render('login', {
        error: req.query.error || null,
        success: req.query.success || null
    });
});

app.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('login', {
                error: errors.array()[0].msg,
                success: null
            });
        }

        const { username, password } = req.body;
        const admin = await Admin.findOne({ username: username, isActive: true });

        if (admin && await admin.comparePassword(password)) {
            // Update last login
            admin.lastLogin = new Date();
            await admin.save();

            req.session.admin = {
                id: admin._id,
                username: admin.username,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role
            };
            res.redirect('/dashboard');
        } else {
            res.render('login', {
                error: 'Invalid username or password',
                success: null
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            error: 'An error occurred during login',
            success: null
        });
    }
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments({ isActive: true });
        const totalDepartments = await Employee.distinct('department').then(deps => deps.length);
        const recentEmployees = await Employee.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('empId firstName lastName department position createdAt');

        // Calculate total salary expenses
        const employees = await Employee.find({ isActive: true });
        const totalSalaryExpense = employees.reduce((total, emp) => total + emp.netSalary, 0);

        res.render('dashboard', {
            admin: req.session.admin,
            stats: {
                totalEmployees,
                totalDepartments,
                totalSalaryExpense,
                recentEmployees
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', {
            error: 'Error loading dashboard',
            admin: req.session.admin
        });
    }
});

// Employee CRUD routes
app.get('/employees', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const employees = await Employee.find({ isActive: true })
            .select('+tempPassword')  // Include the temporary password field
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalEmployees = await Employee.countDocuments({ isActive: true });
        const totalPages = Math.ceil(totalEmployees / limit);

        res.render('employees/list', {
            admin: req.session.admin,
            employees,
            currentPage: page,
            totalPages,
            totalEmployees,
            query: req.query
        });
    } catch (error) {
        console.error('Employees list error:', error);
        res.render('error', {
            error: 'Error loading employees',
            admin: req.session.admin
        });
    }
});

app.get('/employees/add', requireAuth, (req, res) => {
    res.render('employees/add', {
        admin: req.session.admin,
        error: null,
        success: null,
        formData: {}
    });
});

app.post('/employees/add', requireAuth, [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('position').trim().notEmpty().withMessage('Position is required'),
    body('baseSalary').isNumeric().withMessage('Base salary must be a number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('employees/add', {
                admin: req.session.admin,
                error: errors.array()[0].msg,
                success: null,
                formData: req.body
            });
        }

        // Generate employee ID and password
        const empId = await Employee.generateEmpId();
        const plainPassword = Employee.generatePassword();

        // Create employee
        const employee = new Employee({
            empId,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            department: req.body.department,
            position: req.body.position,
            joiningDate: req.body.joiningDate || new Date(),
            baseSalary: parseFloat(req.body.baseSalary),
            allowances: {
                hra: parseFloat(req.body.hra) || 0,
                transport: parseFloat(req.body.transport) || 0,
                medical: parseFloat(req.body.medical) || 0,
                other: parseFloat(req.body.otherAllowance) || 0
            },
            deductions: {
                pf: parseFloat(req.body.pf) || 0,
                tax: parseFloat(req.body.tax) || 0,
                insurance: parseFloat(req.body.insurance) || 0,
                other: parseFloat(req.body.otherDeduction) || 0
            },
            password: plainPassword,
            tempPassword: plainPassword,  // Store the plain text password temporarily
            createdBy: req.session.admin.username
        });

        await employee.save();
        
        res.render('employees/add', {
            admin: req.session.admin,
            error: null,
            success: `Employee created successfully! Employee ID: ${empId}, Password: ${plainPassword} (Please save these credentials)`,
            formData: {}
        });
    } catch (error) {
        console.error('Add employee error:', error);
        res.render('employees/add', {
            admin: req.session.admin,
            error: error.code === 11000 ? 'Email already exists' : 'Error creating employee',
            success: null,
            formData: req.body
        });
    }
});

app.get('/employees/view/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.render('error', {
                error: 'Employee not found',
                admin: req.session.admin
            });
        }

        res.render('employees/view', {
            admin: req.session.admin,
            employee
        });
    } catch (error) {
        console.error('View employee error:', error);
        res.render('error', {
            error: 'Error loading employee details',
            admin: req.session.admin
        });
    }
});

app.get('/employees/edit/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.render('error', {
                error: 'Employee not found',
                admin: req.session.admin
            });
        }

        res.render('employees/edit', {
            admin: req.session.admin,
            employee,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Edit employee error:', error);
        res.render('error', {
            error: 'Error loading employee for editing',
            admin: req.session.admin
        });
    }
});

app.post('/employees/edit/:id', requireAuth, [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('position').trim().notEmpty().withMessage('Position is required'),
    body('baseSalary').isNumeric().withMessage('Base salary must be a number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        const employee = await Employee.findById(req.params.id);
        
        if (!employee) {
            return res.render('error', {
                error: 'Employee not found',
                admin: req.session.admin
            });
        }

        if (!errors.isEmpty()) {
            return res.render('employees/edit', {
                admin: req.session.admin,
                employee,
                error: errors.array()[0].msg,
                success: null
            });
        }

        // Track updated fields
        const updatedFields = [];
        const fieldsToCheck = ['firstName', 'lastName', 'email', 'phone', 'department', 'position', 'baseSalary'];
        
        fieldsToCheck.forEach(field => {
            if (employee[field] !== req.body[field]) {
                updatedFields.push(field);
            }
        });

        // Update employee
        employee.firstName = req.body.firstName;
        employee.lastName = req.body.lastName;
        employee.email = req.body.email;
        employee.phone = req.body.phone;
        employee.department = req.body.department;
        employee.position = req.body.position;
        employee.baseSalary = parseFloat(req.body.baseSalary);
        employee.allowances = {
            hra: parseFloat(req.body.hra) || 0,
            transport: parseFloat(req.body.transport) || 0,
            medical: parseFloat(req.body.medical) || 0,
            other: parseFloat(req.body.otherAllowance) || 0
        };
        employee.deductions = {
            pf: parseFloat(req.body.pf) || 0,
            tax: parseFloat(req.body.tax) || 0,
            insurance: parseFloat(req.body.insurance) || 0,
            other: parseFloat(req.body.otherDeduction) || 0
        };

        await employee.save();

        // Send update notification if there were changes
        if (updatedFields.length > 0) {
            await sendUpdateNotification(employee, updatedFields);
        }

        res.render('employees/edit', {
            admin: req.session.admin,
            employee,
            error: null,
            success: 'Employee updated successfully!'
        });
    } catch (error) {
        console.error('Update employee error:', error);
        const employee = await Employee.findById(req.params.id);
        res.render('employees/edit', {
            admin: req.session.admin,
            employee,
            error: error.code === 11000 ? 'Email already exists' : 'Error updating employee',
            success: null
        });
    }
});

app.post('/employees/delete/:id', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.redirect('/employees?error=Employee not found');
        }

        // Soft delete
        employee.isActive = false;
        await employee.save();

        res.redirect('/employees?success=Employee deleted successfully');
    } catch (error) {
        console.error('Delete employee error:', error);
        res.redirect('/employees?error=Error deleting employee');
    }
});

// Logout
app.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.redirect('/dashboard?error=Logout failed');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login?success=Successfully logged out');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        error: 'Something went wrong!',
        admin: req.session.admin || null
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        error: 'Page not found',
        admin: req.session.admin || null
    });
});

app.listen(PORT, () => {
    console.log(`ERP Admin Panel running on http://localhost:${PORT}`);
    console.log('Default admin credentials: admin/admin123');
    console.log('Connected to MongoDB Atlas');
});
