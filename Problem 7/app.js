const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Method override for PUT/DELETE in forms
app.use(methodOverride('_method'));

// Static files - serve with proper headers
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages
app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    res.locals.cart = req.session.cart || { items: [], total: 0, count: 0 };
    next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Import routes
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const apiRoutes = require('./routes/api');

// Debug route for CSS
app.get('/test-css', (req, res) => {
    res.send(`
        <html>
        <head>
            <link rel="stylesheet" href="/css/style.css">
            <style>body { background: red; }</style>
        </head>
        <body>
            <h1>CSS Test</h1>
            <p>If this has styling, CSS is working</p>
        </body>
        </html>
    `);
});

// Route middleware (order matters - static files should be served before routes)
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/api', apiRoutes);
app.use('/', userRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: { status: 404 }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', {
        title: 'Server Error',
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
    console.log('🛒 Shopping Cart Application Started');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👤 User Site: http://localhost:${PORT}`);
    console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/auth/admin/login`);
    console.log(`📱 API Endpoints: http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
