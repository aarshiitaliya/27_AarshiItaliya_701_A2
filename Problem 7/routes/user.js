const express = require('express');
const router = express.Router();

const Category = require('../models/Category');
const Product = require('../models/Product');
const { attachCart, handleAsyncErrors } = require('../middleware/auth');

// Apply cart middleware to all routes
router.use(attachCart);

// Home page
router.get('/', handleAsyncErrors(async (req, res) => {
    const [categories, featuredProducts, recentProducts] = await Promise.all([
        Category.getHierarchy(),
        Product.find({ status: 'active', featured: true })
            .populate('category', 'name slug')
            .limit(8)
            .sort({ createdAt: -1 }),
        Product.find({ status: 'active' })
            .populate('category', 'name slug')
            .limit(12)
            .sort({ createdAt: -1 })
    ]);
    
    res.render('user/home', {
        title: 'Shopping Cart - Home',
        categories,
        featuredProducts,
        recentProducts
    });
}));

// Category listing page
router.get('/categories', handleAsyncErrors(async (req, res) => {
    const categories = await Category.getHierarchy();
    
    res.render('user/categories', {
        title: 'Categories',
        categories
    });
}));

// Category products page
router.get('/category/:slug', handleAsyncErrors(async (req, res) => {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    
    if (!category) {
        req.flash('error_msg', 'Category not found');
        return res.redirect('/categories');
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order || 'desc';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    
    const options = {
        page,
        limit,
        sort,
        order,
        minPrice,
        maxPrice,
        inStock: req.query.inStock === 'true'
    };
    
    const result = await Product.getByCategory(category._id, options);
    const breadcrumb = await Category.getBreadcrumb(category._id);
    
    res.render('user/category-products', {
        title: `${category.name} - Products`,
        category,
        products: result.products,
        pagination: result.pagination,
        breadcrumb,
        filters: {
            sort,
            order,
            minPrice,
            maxPrice,
            inStock: req.query.inStock === 'true'
        }
    });
}));

// Product detail page
router.get('/product/:slug', handleAsyncErrors(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, status: 'active' })
        .populate('category', 'name slug')
        .populate('parentCategory', 'name slug');
    
    if (!product) {
        req.flash('error_msg', 'Product not found');
        return res.redirect('/');
    }
    
    // Get related products from same category
    const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: product._id },
        status: 'active'
    })
    .populate('category', 'name slug')
    .limit(4)
    .sort({ createdAt: -1 });
    
    // Build breadcrumb
    const breadcrumb = [];
    if (product.parentCategory) {
        breadcrumb.push(product.parentCategory);
    }
    breadcrumb.push(product.category);
    breadcrumb.push({ name: product.name, slug: product.slug });
    
    res.render('user/product-detail', {
        title: product.name,
        product,
        relatedProducts,
        breadcrumb
    });
}));

// Search products
router.get('/search', handleAsyncErrors(async (req, res) => {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
        req.flash('error_msg', 'Please enter at least 2 characters to search');
        return res.redirect('/');
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || 'relevance';
    
    const options = { page, limit, sort };
    const result = await Product.search(query.trim(), options);
    
    res.render('user/search-results', {
        title: `Search Results for "${query}"`,
        query,
        products: result.products,
        pagination: result.pagination,
        sort
    });
}));

// All products page
router.get('/products', handleAsyncErrors(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order || 'desc';
    const categoryId = req.query.category;
    
    const query = { status: 'active' };
    if (categoryId) {
        query.$or = [
            { category: categoryId },
            { parentCategory: categoryId }
        ];
    }
    
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;
    
    const skip = (page - 1) * limit;
    
    const [products, total, categories] = await Promise.all([
        Product.find(query)
            .populate('category', 'name slug')
            .populate('parentCategory', 'name slug')
            .sort(sortObj)
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
    
    res.render('user/products', {
        title: 'All Products',
        products,
        categories,
        pagination,
        filters: {
            sort,
            order,
            category: categoryId
        }
    });
}));

module.exports = router;
