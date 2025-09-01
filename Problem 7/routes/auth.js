const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const Admin = require('../models/Admin');
const { requireGuest, requireAdminGuest, handleAsyncErrors } = require('../middleware/auth');

// User Registration Routes
router.get('/register', requireGuest, (req, res) => {
    res.render('auth/register', {
        title: 'Create Account',
        layout: 'layouts/auth'
    });
});

router.post('/register', [
    requireGuest,
    body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            title: 'Create Account',
            layout: 'layouts/auth',
            errors: errors.array(),
            formData: req.body
        });
    }
    
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        return res.render('auth/register', {
            title: 'Create Account',
            layout: 'layouts/auth',
            errors: [{ msg: 'Email already registered' }],
            formData: req.body
        });
    }
    
    // Create new user
    const user = new User({
        firstName,
        lastName,
        email,
        password
    });
    
    await user.save();
    
    req.flash('success_msg', 'Registration successful! Please log in.');
    res.redirect('/auth/login');
}));

// User Login Routes
router.get('/login', requireGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        layout: 'layouts/auth'
    });
});

router.post('/login', [
    requireGuest,
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            errors: errors.array(),
            formData: req.body
        });
    }
    
    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    if (!user) {
        return res.render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Invalid email or password' }],
            formData: req.body
        });
    }
    
    if (user.isLocked) {
        return res.render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Account is temporarily locked. Please try again later.' }],
            formData: req.body
        });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        await user.incLoginAttempts();
        return res.render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Invalid email or password' }],
            formData: req.body
        });
    }
    
    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    
    // Store user in session
    req.session.user = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: user.fullName
    };
    
    req.flash('success_msg', `Welcome back, ${user.firstName}!`);
    res.redirect('/');
}));

// Admin Login Routes
router.get('/admin/login', requireAdminGuest, (req, res) => {
    res.render('auth/admin-login', {
        title: 'Admin Login',
        layout: 'layouts/auth'
    });
});

router.post('/admin/login', [
    requireAdminGuest,
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/admin-login', {
            title: 'Admin Login',
            layout: 'layouts/auth',
            errors: errors.array(),
            formData: req.body
        });
    }
    
    const { email, password } = req.body;
    
    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
        return res.render('auth/admin-login', {
            title: 'Admin Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Invalid credentials' }],
            formData: req.body
        });
    }
    
    if (admin.isLocked) {
        return res.render('auth/admin-login', {
            title: 'Admin Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Account is temporarily locked. Please try again later.' }],
            formData: req.body
        });
    }
    
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
        await admin.incLoginAttempts();
        return res.render('auth/admin-login', {
            title: 'Admin Login',
            layout: 'layouts/auth',
            errors: [{ msg: 'Invalid credentials' }],
            formData: req.body
        });
    }
    
    // Reset login attempts and update last login
    await admin.resetLoginAttempts();
    
    // Store admin in session
    req.session.admin = {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions
    };
    
    req.flash('success_msg', `Welcome back, ${admin.firstName}!`);
    res.redirect('/admin');
}));

// Logout Routes
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/');
    });
});

router.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/auth/admin/login');
    });
});

module.exports = router;
