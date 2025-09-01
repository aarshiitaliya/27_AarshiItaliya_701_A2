const express = require('express');
const router = express.Router();

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { attachCart, validateCartItem, handleAsyncErrors } = require('../middleware/auth');

// Apply cart middleware to all routes
router.use(attachCart);

// Get cart contents
router.get('/', handleAsyncErrors(async (req, res) => {
    const cart = await Cart.findById(req.cart._id).populate({
        path: 'items.product',
        populate: {
            path: 'category',
            select: 'name slug'
        }
    });
    
    res.render('cart/index', {
        title: 'Shopping Cart',
        cart: cart || { items: [], total: 0, itemCount: 0 }
    });
}));

// Add item to cart
router.post('/add', validateCartItem, handleAsyncErrors(async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    
    try {
        await req.cart.addItem(productId, parseInt(quantity));
        
        // Update session cart data
        const updatedCart = await Cart.findById(req.cart._id).populate('items.product');
        req.session.cart = {
            items: updatedCart.items,
            total: updatedCart.total,
            count: updatedCart.itemCount,
            formattedTotal: updatedCart.formattedTotal
        };
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: 'Item added to cart',
                cart: {
                    count: updatedCart.itemCount,
                    total: updatedCart.formattedTotal
                }
            });
        }
        
        req.flash('success_msg', 'Item added to cart successfully');
        res.redirect('back');
    } catch (error) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        req.flash('error_msg', error.message);
        res.redirect('back');
    }
}));

// Update item quantity
router.put('/update', validateCartItem, handleAsyncErrors(async (req, res) => {
    const { productId, quantity } = req.body;
    
    try {
        await req.cart.updateItem(productId, parseInt(quantity));
        
        // Update session cart data
        const updatedCart = await Cart.findById(req.cart._id).populate('items.product');
        req.session.cart = {
            items: updatedCart.items,
            total: updatedCart.total,
            count: updatedCart.itemCount,
            formattedTotal: updatedCart.formattedTotal
        };
        
        res.json({
            success: true,
            message: 'Cart updated successfully',
            cart: {
                count: updatedCart.itemCount,
                total: updatedCart.formattedTotal,
                subtotal: updatedCart.formattedSubtotal,
                tax: `₹${updatedCart.tax.toLocaleString('en-IN')}`,
                shipping: `₹${updatedCart.shipping.toLocaleString('en-IN')}`,
                items: updatedCart.items.map(item => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    total: `₹${item.total.toLocaleString('en-IN')}`
                }))
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// Remove item from cart
router.delete('/remove', validateCartItem, handleAsyncErrors(async (req, res) => {
    const { productId } = req.body;
    
    try {
        await req.cart.removeItem(productId);
        
        // Update session cart data
        const updatedCart = await Cart.findById(req.cart._id).populate('items.product');
        req.session.cart = {
            items: updatedCart.items,
            total: updatedCart.total,
            count: updatedCart.itemCount,
            formattedTotal: updatedCart.formattedTotal
        };
        
        res.json({
            success: true,
            message: 'Item removed from cart',
            cart: {
                count: updatedCart.itemCount,
                total: updatedCart.formattedTotal,
                subtotal: updatedCart.formattedSubtotal,
                tax: `₹${updatedCart.tax.toLocaleString('en-IN')}`,
                shipping: `₹${updatedCart.shipping.toLocaleString('en-IN')}`
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// Clear entire cart
router.delete('/clear', handleAsyncErrors(async (req, res) => {
    try {
        await req.cart.clear();
        
        // Update session cart data
        req.session.cart = {
            items: [],
            total: 0,
            count: 0,
            formattedTotal: '₹0'
        };
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: 'Cart cleared successfully',
                cart: {
                    count: 0,
                    total: '₹0'
                }
            });
        }
        
        req.flash('success_msg', 'Cart cleared successfully');
        res.redirect('/cart');
    } catch (error) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        req.flash('error_msg', error.message);
        res.redirect('/cart');
    }
}));

// Get cart count (for AJAX requests)
router.get('/count', handleAsyncErrors(async (req, res) => {
    res.json({
        success: true,
        count: req.cart.itemCount,
        total: req.cart.formattedTotal
    });
}));

module.exports = router;
