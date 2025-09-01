const express = require('express');
const router = express.Router();

const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { handleAsyncErrors } = require('../middleware/auth');

// API Routes for AJAX requests

// Get categories hierarchy
router.get('/categories', handleAsyncErrors(async (req, res) => {
    const categories = await Category.getHierarchy();
    res.json({
        success: true,
        data: categories
    });
}));

// Get subcategories by parent ID
router.get('/categories/:parentId/subcategories', handleAsyncErrors(async (req, res) => {
    const subcategories = await Category.find({
        parent: req.params.parentId,
        isActive: true
    }).sort({ sortOrder: 1, name: 1 });
    
    res.json({
        success: true,
        data: subcategories
    });
}));

// Get products by category
router.get('/categories/:categoryId/products', handleAsyncErrors(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order || 'desc';
    
    const options = { page, limit, sort, order };
    const result = await Product.getByCategory(req.params.categoryId, options);
    
    res.json({
        success: true,
        data: result
    });
}));

// Search products
router.get('/products/search', handleAsyncErrors(async (req, res) => {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || 'relevance';
    
    const options = { page, limit, sort };
    const result = await Product.search(query.trim(), options);
    
    res.json({
        success: true,
        data: result
    });
}));

// Get product details
router.get('/products/:id', handleAsyncErrors(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('category', 'name slug')
        .populate('parentCategory', 'name slug');
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }
    
    res.json({
        success: true,
        data: product
    });
}));

// Check product availability
router.get('/products/:id/availability', handleAsyncErrors(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }
    
    const isAvailable = product.status === 'active' && 
        (!product.inventory.trackQuantity || product.inventory.quantity > 0);
    
    res.json({
        success: true,
        data: {
            available: isAvailable,
            stock: product.inventory.trackQuantity ? product.inventory.quantity : null,
            stockStatus: product.stockStatus
        }
    });
}));

// Get cart summary
router.get('/cart/summary', handleAsyncErrors(async (req, res) => {
    let cart;
    
    if (req.session.user) {
        cart = await Cart.findOrCreate(req.session.user._id, true);
    } else {
        const sessionId = req.session.cartId || req.sessionID;
        cart = await Cart.findOrCreate(sessionId, false);
    }
    
    res.json({
        success: true,
        data: {
            count: cart.itemCount,
            total: cart.formattedTotal,
            subtotal: cart.formattedSubtotal,
            tax: `₹${cart.tax.toLocaleString('en-IN')}`,
            shipping: `₹${cart.shipping.toLocaleString('en-IN')}`
        }
    });
}));

// Get featured products
router.get('/products/featured', handleAsyncErrors(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    
    const products = await Product.find({ 
        status: 'active', 
        featured: true 
    })
    .populate('category', 'name slug')
    .limit(limit)
    .sort({ createdAt: -1 });
    
    res.json({
        success: true,
        data: products
    });
}));

// Get recent products
router.get('/products/recent', handleAsyncErrors(async (req, res) => {
    const limit = parseInt(req.query.limit) || 12;
    
    const products = await Product.find({ status: 'active' })
        .populate('category', 'name slug')
        .limit(limit)
        .sort({ createdAt: -1 });
    
    res.json({
        success: true,
        data: products
    });
}));

// Get product recommendations
router.get('/products/:id/recommendations', handleAsyncErrors(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }
    
    const limit = parseInt(req.query.limit) || 4;
    
    // Get products from same category
    const recommendations = await Product.find({
        category: product.category,
        _id: { $ne: product._id },
        status: 'active'
    })
    .populate('category', 'name slug')
    .limit(limit)
    .sort({ createdAt: -1 });
    
    res.json({
        success: true,
        data: recommendations
    });
}));

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Shopping Cart API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;
