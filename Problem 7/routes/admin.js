const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');
const { requireAdmin, requirePermission, handleAsyncErrors } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp').split(',');
        const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
        }
    }
});

// Admin Dashboard
router.get('/', requireAdmin, handleAsyncErrors(async (req, res) => {
    const [categoryCount, productCount, userCount] = await Promise.all([
        Category.countDocuments({ isActive: true }),
        Product.countDocuments({ status: 'active' }),
        User.countDocuments({ isActive: true })
    ]);
    
    const recentProducts = await Product.find({ status: 'active' })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(5);
    
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        layout: 'layouts/admin',
        stats: {
            categories: categoryCount,
            products: productCount,
            users: userCount
        },
        recentProducts
    });
}));

// Categories Management
router.get('/categories', requireAdmin, requirePermission('categories', 'read'), handleAsyncErrors(async (req, res) => {
    const categories = await Category.find()
        .populate('parent', 'name')
        .sort({ level: 1, sortOrder: 1, name: 1 });
    
    res.render('admin/categories/index', {
        title: 'Categories Management',
        layout: 'layouts/admin',
        categories
    });
}));

router.get('/categories/create', requireAdmin, requirePermission('categories', 'create'), handleAsyncErrors(async (req, res) => {
    const parentCategories = await Category.find({ level: 1, isActive: true }).sort({ name: 1 });
    
    res.render('admin/categories/create', {
        title: 'Create Category',
        layout: 'layouts/admin',
        parentCategories
    });
}));

router.post('/categories/create', [
    requireAdmin,
    requirePermission('categories', 'create'),
    upload.single('image'),
    body('name').trim().isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
    body('level').isIn(['1', '2']).withMessage('Invalid category level'),
    body('parent').optional().isMongoId().withMessage('Invalid parent category')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const parentCategories = await Category.find({ level: 1, isActive: true }).sort({ name: 1 });
        return res.render('admin/categories/create', {
            title: 'Create Category',
            layout: 'layouts/admin',
            errors: errors.array(),
            formData: req.body,
            parentCategories
        });
    }
    
    const { name, description, level, parent, sortOrder } = req.body;
    
    // Validate level and parent relationship
    if (level === '2' && !parent) {
        const parentCategories = await Category.find({ level: 1, isActive: true }).sort({ name: 1 });
        return res.render('admin/categories/create', {
            title: 'Create Category',
            layout: 'layouts/admin',
            errors: [{ msg: 'Subcategory must have a parent category' }],
            formData: req.body,
            parentCategories
        });
    }
    
    if (level === '1' && parent) {
        const parentCategories = await Category.find({ level: 1, isActive: true }).sort({ name: 1 });
        return res.render('admin/categories/create', {
            title: 'Create Category',
            layout: 'layouts/admin',
            errors: [{ msg: 'Main category cannot have a parent' }],
            formData: req.body,
            parentCategories
        });
    }
    
    const categoryData = {
        name,
        description,
        level: parseInt(level),
        sortOrder: parseInt(sortOrder) || 0
    };
    
    if (level === '2' && parent) {
        categoryData.parent = parent;
    }
    
    if (req.file) {
        categoryData.image = `/uploads/${req.file.filename}`;
    }
    
    const category = new Category(categoryData);
    await category.save();
    
    req.flash('success_msg', 'Category created successfully');
    res.redirect('/admin/categories');
}));

router.get('/categories/:id/edit', requireAdmin, requirePermission('categories', 'update'), handleAsyncErrors(async (req, res) => {
    const [category, parentCategories] = await Promise.all([
        Category.findById(req.params.id).populate('parent'),
        Category.find({ level: 1, isActive: true }).sort({ name: 1 })
    ]);
    
    if (!category) {
        req.flash('error_msg', 'Category not found');
        return res.redirect('/admin/categories');
    }
    
    res.render('admin/categories/edit', {
        title: 'Edit Category',
        layout: 'layouts/admin',
        category,
        parentCategories
    });
}));

router.put('/categories/:id', [
    requireAdmin,
    requirePermission('categories', 'update'),
    upload.single('image'),
    body('name').trim().isLength({ min: 2 }).withMessage('Category name must be at least 2 characters')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const [category, parentCategories] = await Promise.all([
            Category.findById(req.params.id).populate('parent'),
            Category.find({ level: 1, isActive: true }).sort({ name: 1 })
        ]);
        
        return res.render('admin/categories/edit', {
            title: 'Edit Category',
            layout: 'layouts/admin',
            errors: errors.array(),
            category: { ...category.toObject(), ...req.body },
            parentCategories
        });
    }
    
    const category = await Category.findById(req.params.id);
    if (!category) {
        req.flash('error_msg', 'Category not found');
        return res.redirect('/admin/categories');
    }
    
    const { name, description, sortOrder, isActive } = req.body;
    
    category.name = name;
    category.description = description;
    category.sortOrder = parseInt(sortOrder) || 0;
    category.isActive = isActive === 'on';
    
    if (req.file) {
        category.image = `/uploads/${req.file.filename}`;
    }
    
    await category.save();
    
    req.flash('success_msg', 'Category updated successfully');
    res.redirect('/admin/categories');
}));

router.delete('/categories/:id', requireAdmin, requirePermission('categories', 'delete'), handleAsyncErrors(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Check if category has products
    const productCount = await Product.countDocuments({ 
        $or: [{ category: category._id }, { parentCategory: category._id }] 
    });
    
    if (productCount > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete category with products. Please move or delete products first.' 
        });
    }
    
    // Check if category has subcategories
    if (category.level === 1) {
        const subcategoryCount = await Category.countDocuments({ parent: category._id });
        if (subcategoryCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete category with subcategories. Please delete subcategories first.' 
            });
        }
    }
    
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Category deleted successfully' });
}));

// Products Management
router.get('/products', requireAdmin, requirePermission('products', 'read'), handleAsyncErrors(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (req.query.category) {
        query.category = req.query.category;
    }
    if (req.query.status) {
        query.status = req.query.status;
    }
    
    const [products, total, categories] = await Promise.all([
        Product.find(query)
            .populate('category', 'name')
            .populate('parentCategory', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Product.countDocuments(query),
        Category.find({ isActive: true }).sort({ level: 1, name: 1 })
    ]);
    
    const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    };
    
    res.render('admin/products/index', {
        title: 'Products Management',
        layout: 'layouts/admin',
        products,
        categories,
        pagination,
        query: req.query
    });
}));

router.get('/products/create', requireAdmin, requirePermission('products', 'create'), handleAsyncErrors(async (req, res) => {
    const categories = await Category.find({ isActive: true }).populate('parent').sort({ level: 1, name: 1 });
    
    res.render('admin/products/create', {
        title: 'Create Product',
        layout: 'layouts/admin',
        categories
    });
}));

router.post('/products/create', [
    requireAdmin,
    requirePermission('products', 'create'),
    upload.array('images', 5),
    body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isMongoId().withMessage('Invalid category')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const categories = await Category.find({ isActive: true }).populate('parent').sort({ level: 1, name: 1 });
        return res.render('admin/products/create', {
            title: 'Create Product',
            layout: 'layouts/admin',
            errors: errors.array(),
            formData: req.body,
            categories
        });
    }
    
    const {
        name, description, shortDescription, price, comparePrice, cost,
        sku, barcode, category, trackQuantity, quantity, lowStockThreshold,
        weight, length, width, height, requiresShipping, metaTitle,
        metaDescription, keywords, status, featured, tags
    } = req.body;
    
    const productData = {
        name,
        description,
        shortDescription,
        price: parseFloat(price),
        category,
        inventory: {
            trackQuantity: trackQuantity === 'on',
            quantity: parseInt(quantity) || 0,
            lowStockThreshold: parseInt(lowStockThreshold) || 10
        },
        shipping: {
            weight: parseFloat(weight) || 0,
            dimensions: {
                length: parseFloat(length) || 0,
                width: parseFloat(width) || 0,
                height: parseFloat(height) || 0
            },
            requiresShipping: requiresShipping !== 'off'
        },
        seo: {
            metaTitle,
            metaDescription,
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : []
        },
        status: status || 'active',
        featured: featured === 'on',
        tags: tags ? tags.split(',').map(t => t.trim()) : []
    };
    
    if (comparePrice) productData.comparePrice = parseFloat(comparePrice);
    if (cost) productData.cost = parseFloat(cost);
    if (sku) productData.sku = sku;
    if (barcode) productData.barcode = barcode;
    
    // Handle image uploads
    if (req.files && req.files.length > 0) {
        productData.images = req.files.map((file, index) => ({
            url: `/uploads/${file.filename}`,
            alt: `${name} - Image ${index + 1}`,
            isPrimary: index === 0
        }));
    }
    
    const product = new Product(productData);
    await product.save();
    
    req.flash('success_msg', 'Product created successfully');
    res.redirect('/admin/products');
}));

router.get('/products/:id/edit', requireAdmin, requirePermission('products', 'update'), handleAsyncErrors(async (req, res) => {
    const [product, categories] = await Promise.all([
        Product.findById(req.params.id).populate('category').populate('parentCategory'),
        Category.find({ isActive: true }).populate('parent').sort({ level: 1, name: 1 })
    ]);
    
    if (!product) {
        req.flash('error_msg', 'Product not found');
        return res.redirect('/admin/products');
    }
    
    res.render('admin/products/edit', {
        title: 'Edit Product',
        layout: 'layouts/admin',
        product,
        categories
    });
}));

router.put('/products/:id', [
    requireAdmin,
    requirePermission('products', 'update'),
    upload.array('images', 5),
    body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
], handleAsyncErrors(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const [product, categories] = await Promise.all([
            Product.findById(req.params.id).populate('category').populate('parentCategory'),
            Category.find({ isActive: true }).populate('parent').sort({ level: 1, name: 1 })
        ]);
        
        return res.render('admin/products/edit', {
            title: 'Edit Product',
            layout: 'layouts/admin',
            errors: errors.array(),
            product: { ...product.toObject(), ...req.body },
            categories
        });
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
        req.flash('error_msg', 'Product not found');
        return res.redirect('/admin/products');
    }
    
    const {
        name, description, shortDescription, price, comparePrice, cost,
        sku, barcode, category, trackQuantity, quantity, lowStockThreshold,
        weight, length, width, height, requiresShipping, metaTitle,
        metaDescription, keywords, status, featured, tags
    } = req.body;
    
    // Update product fields
    product.name = name;
    product.description = description;
    product.shortDescription = shortDescription;
    product.price = parseFloat(price);
    product.comparePrice = comparePrice ? parseFloat(comparePrice) : undefined;
    product.cost = cost ? parseFloat(cost) : undefined;
    product.sku = sku;
    product.barcode = barcode;
    product.category = category;
    
    product.inventory.trackQuantity = trackQuantity === 'on';
    product.inventory.quantity = parseInt(quantity) || 0;
    product.inventory.lowStockThreshold = parseInt(lowStockThreshold) || 10;
    
    product.shipping.weight = parseFloat(weight) || 0;
    product.shipping.dimensions.length = parseFloat(length) || 0;
    product.shipping.dimensions.width = parseFloat(width) || 0;
    product.shipping.dimensions.height = parseFloat(height) || 0;
    product.shipping.requiresShipping = requiresShipping !== 'off';
    
    product.seo.metaTitle = metaTitle;
    product.seo.metaDescription = metaDescription;
    product.seo.keywords = keywords ? keywords.split(',').map(k => k.trim()) : [];
    
    product.status = status || 'active';
    product.featured = featured === 'on';
    product.tags = tags ? tags.split(',').map(t => t.trim()) : [];
    
    // Handle new image uploads
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file, index) => ({
            url: `/uploads/${file.filename}`,
            alt: `${name} - Image ${index + 1}`,
            isPrimary: product.images.length === 0 && index === 0
        }));
        product.images.push(...newImages);
    }
    
    await product.save();
    
    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/admin/products');
}));

router.delete('/products/:id', requireAdmin, requirePermission('products', 'delete'), handleAsyncErrors(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Product deleted successfully' });
}));

// Users Management
router.get('/users', requireAdmin, requirePermission('users', 'read'), handleAsyncErrors(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
        User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments()
    ]);
    
    const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    };
    
    res.render('admin/users/index', {
        title: 'Users Management',
        layout: 'layouts/admin',
        users,
        pagination
    });
}));

module.exports = router;
