const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Create Redis client with fallback
let redisClient;
let useRedis = true;

try {
    redisClient = createClient({
        username: 'default',
        password: 'b9y9E5bg9knme2wvsrRGrHbkmJBNeLBR',
        socket: {
            host: 'redis-14584.c85.us-east-1-2.ec2.redns.redis-cloud.com',
            port: 14584
        }
    });

    // Connect to Redis
    redisClient.connect().catch((err) => {
        console.log('Redis connection failed, using memory sessions:', err.message);
        useRedis = false;
    });

    redisClient.on('error', (err) => {
        console.log('Redis Client Error:', err.message);
        useRedis = false;
    });

    redisClient.on('connect', () => {
        console.log('Connected to Redis server');
        useRedis = true;
    });
} catch (error) {
    console.log('Redis initialization failed, using memory sessions:', error.message);
    useRedis = false;
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration with Redis store or memory fallback
const sessionConfig = {
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Add Redis store if available, otherwise use default memory store
if (useRedis && redisClient) {
    sessionConfig.store = new RedisStore({ client: redisClient });
}

app.use(session(sessionConfig));

// Demo users (in production, use a database)
const users = [
    {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('password', 10),
        email: 'admin@example.com',
        role: 'admin'
    },
    {
        id: 2,
        username: 'user',
        password: bcrypt.hashSync('password', 10),
        email: 'user@example.com',
        role: 'user'
    }
];

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login?error=Please log in to access this page');
    }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).render('error', {
            error: 'Access denied. Admin privileges required.',
            user: req.session.user || null
        });
    }
};

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
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
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('login', {
            error: errors.array()[0].msg,
            success: null
        });
    }

    const { username, password } = req.body;
    const user = users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        res.redirect('/dashboard');
    } else {
        res.render('login', {
            error: 'Invalid username or password',
            success: null
        });
    }
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', {
        user: req.session.user,
        sessionId: req.sessionID
    });
});

app.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {
        user: req.session.user,
        sessionId: req.sessionID
    });
});

app.get('/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Get all Redis keys for sessions
        const sessionKeys = await redisClient.keys('sess:*');
        const sessions = [];

        for (const key of sessionKeys) {
            try {
                const sessionData = await redisClient.get(key);
                if (sessionData) {
                    const parsedSession = JSON.parse(sessionData);
                    const sessionId = key.replace('sess:', '');
                    
                    sessions.push({
                        sessionId: sessionId,
                        user: parsedSession.user || null,
                        cookie: parsedSession.cookie || null,
                        lastAccess: parsedSession.cookie ? new Date(parsedSession.cookie.expires) : null,
                        redisKey: key
                    });
                }
            } catch (parseError) {
                console.error('Error parsing session:', parseError);
            }
        }

        res.render('admin', {
            user: req.session.user,
            sessions: sessions,
            totalSessions: sessions.length,
            redisConnected: redisClient.isOpen
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.render('error', {
            error: 'Error fetching session data from Redis',
            user: req.session.user
        });
    }
});

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

// API endpoint to get session details
app.get('/api/session', requireAuth, (req, res) => {
    res.json({
        sessionId: req.sessionID,
        user: req.session.user,
        cookie: req.session.cookie,
        store: 'Redis'
    });
});

// API endpoint to get Redis info (admin only)
app.get('/api/redis-info', requireAuth, requireAdmin, async (req, res) => {
    try {
        const info = await redisClient.info();
        const dbSize = await redisClient.dbSize();
        
        res.json({
            connected: redisClient.isOpen,
            dbSize: dbSize,
            info: info
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get Redis info' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        error: 'Something went wrong!',
        user: req.session.user || null
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        error: 'Page not found',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Using Redis session store');
    console.log('Demo accounts:');
    console.log('  Admin: username=admin, password=password');
    console.log('  User: username=user, password=password');
});
