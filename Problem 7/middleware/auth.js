// Authentication middleware for admin and user routes

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/auth/login');
};

const requireGuest = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    
    res.redirect('/');
};

const requireAdmin = (req, res, next) => {
    if (req.session.admin) {
        return next();
    }
    
    req.flash('error_msg', 'Admin access required');
    res.redirect('/auth/admin/login');
};

const requireAdminGuest = (req, res, next) => {
    if (!req.session.admin) {
        return next();
    }
    
    res.redirect('/admin');
};

const requirePermission = (resource, action) => {
    return (req, res, next) => {
        if (!req.session.admin) {
            req.flash('error_msg', 'Admin access required');
            return res.redirect('/auth/admin/login');
        }
        
        const admin = req.session.admin;
        
        // Super admin has all permissions
        if (admin.role === 'super_admin') {
            return next();
        }
        
        // Check specific permission
        if (admin.permissions[resource] && admin.permissions[resource][action]) {
            return next();
        }
        
        req.flash('error_msg', 'You do not have permission to perform this action');
        res.redirect('/admin');
    };
};

const attachCart = async (req, res, next) => {
    try {
        const Cart = require('../models/Cart');
        
        let cart;
        if (req.session.user) {
            // User is logged in, find their cart
            cart = await Cart.findOrCreate(req.session.user._id, true);
        } else {
            // Guest user, use session ID
            if (!req.session.cartId) {
                req.session.cartId = req.sessionID;
            }
            cart = await Cart.findOrCreate(req.session.cartId, false);
        }
        
        // Update session cart data for templates
        req.session.cart = {
            items: cart.items,
            total: cart.total,
            count: cart.itemCount,
            formattedTotal: cart.formattedTotal
        };
        
        req.cart = cart;
        next();
    } catch (error) {
        console.error('Cart middleware error:', error);
        // Continue without cart if there's an error
        req.session.cart = { items: [], total: 0, count: 0, formattedTotal: '₹0' };
        next();
    }
};

const validateCartItem = (req, res, next) => {
    const { productId, quantity } = req.body;
    
    if (!productId) {
        return res.status(400).json({
            success: false,
            message: 'Product ID is required'
        });
    }
    
    if (quantity && (isNaN(quantity) || quantity < 1 || quantity > 99)) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be between 1 and 99'
        });
    }
    
    next();
};

const rateLimitByIP = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!requests.has(ip)) {
            requests.set(ip, []);
        }
        
        const ipRequests = requests.get(ip);
        
        // Remove old requests outside the window
        const validRequests = ipRequests.filter(time => time > windowStart);
        requests.set(ip, validRequests);
        
        if (validRequests.length >= max) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later'
            });
        }
        
        validRequests.push(now);
        next();
    };
};

const logActivity = (action) => {
    return (req, res, next) => {
        const user = req.session.user || req.session.admin;
        const userType = req.session.admin ? 'admin' : 'user';
        
        console.log(`[${new Date().toISOString()}] ${userType.toUpperCase()}: ${user?.email || 'Guest'} - ${action} - ${req.method} ${req.originalUrl}`);
        
        next();
    };
};

const handleAsyncErrors = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    requireAuth,
    requireGuest,
    requireAdmin,
    requireAdminGuest,
    requirePermission,
    attachCart,
    validateCartItem,
    rateLimitByIP,
    logActivity,
    handleAsyncErrors
};
