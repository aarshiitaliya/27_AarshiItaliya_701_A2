const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Create sessions directory if it doesn't exist
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

// Dummy user database (in production, use a real database)
const users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
        role: 'admin'
    },
    {
        id: 2,
        username: 'user',
        email: 'user@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
        role: 'user'
    }
];

// Session configuration with file store
app.use(session({
    store: new FileStore({
        path: './sessions',
        ttl: 86400, // 24 hours in seconds
        retries: 5,
        factor: 1,
        minTimeout: 50,
        maxTimeout: 86400000,
        reapInterval: 3600, // Clean up expired sessions every hour
        logFn: function(message) {
            console.log('Session Store:', message);
        }
    }),
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId'
}));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
};

// Check if user is already logged in
const redirectIfLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

// Validation rules for login
const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

// Routes
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// Login page
app.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('login', {
        errors: [],
        formData: {},
        message: null
    });
});

// Login POST
app.post('/login', redirectIfLoggedIn, loginValidation, async (req, res) => {
    const errors = validationResult(req);
    const { username, password } = req.body;
    
    if (!errors.isEmpty()) {
        return res.render('login', {
            errors: errors.array(),
            formData: req.body,
            message: null
        });
    }
    
    try {
        // Find user by username or email
        const user = users.find(u => 
            u.username === username || u.email === username
        );
        
        if (!user) {
            return res.render('login', {
                errors: [{ msg: 'Invalid username or password' }],
                formData: req.body,
                message: null
            });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.render('login', {
                errors: [{ msg: 'Invalid username or password' }],
                formData: req.body,
                message: null
            });
        }
        
        // Create session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            loginTime: new Date()
        };
        
        // Redirect to intended page or dashboard
        const redirectTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        
        res.redirect(redirectTo);
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            errors: [{ msg: 'An error occurred during login. Please try again.' }],
            formData: req.body,
            message: null
        });
    }
});

// Dashboard (protected route)
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', {
        user: req.session.user,
        sessionId: req.sessionID
    });
});

// Profile page (protected route)
app.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {
        user: req.session.user
    });
});

// Admin page (protected route - admin only)
app.get('/admin', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            error: 'Access Denied',
            message: 'You do not have permission to access this page.'
        });
    }
    
    // Get session files info
    const sessionFiles = fs.readdirSync(sessionsDir).filter(file => file.endsWith('.json'));
    const sessionInfo = sessionFiles.map(file => {
        try {
            const sessionData = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), 'utf8'));
            return {
                filename: file,
                sessionId: file.replace('.json', ''),
                user: sessionData.user || null,
                expires: sessionData.cookie ? new Date(sessionData.cookie.expires) : null,
                lastAccess: fs.statSync(path.join(sessionsDir, file)).mtime
            };
        } catch (error) {
            return {
                filename: file,
                error: 'Could not read session file'
            };
        }
    });
    
    res.render('admin', {
        user: req.session.user,
        sessions: sessionInfo,
        users: users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role }))
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('sessionId');
        res.redirect('/login?message=logged_out');
    });
});

// Session info API endpoint
app.get('/api/session', requireAuth, (req, res) => {
    res.json({
        sessionId: req.sessionID,
        user: req.session.user,
        cookie: req.session.cookie
    });
});

// Error handling middleware
app.use((req, res) => {
    res.status(404).render('error', {
        error: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).render('error', {
        error: '500 - Internal Server Error',
        message: 'An unexpected error occurred.'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Sessions are stored in: ${sessionsDir}`);
});
