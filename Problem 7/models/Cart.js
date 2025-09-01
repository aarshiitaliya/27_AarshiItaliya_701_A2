const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        max: [99, 'Quantity cannot exceed 99']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    total: {
        type: Number,
        required: true,
        min: [0, 'Total cannot be negative']
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: function() {
            return !this.user;
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return !this.sessionId;
        }
    },
    items: [cartItemSchema],
    subtotal: {
        type: Number,
        default: 0,
        min: [0, 'Subtotal cannot be negative']
    },
    tax: {
        type: Number,
        default: 0,
        min: [0, 'Tax cannot be negative']
    },
    shipping: {
        type: Number,
        default: 0,
        min: [0, 'Shipping cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    total: {
        type: Number,
        default: 0,
        min: [0, 'Total cannot be negative']
    },
    currency: {
        type: String,
        default: 'INR'
    },
    expiresAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60 // 30 days
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for formatted total
cartSchema.virtual('formattedTotal').get(function() {
    return `₹${this.total.toLocaleString('en-IN')}`;
});

// Virtual for formatted subtotal
cartSchema.virtual('formattedSubtotal').get(function() {
    return `₹${this.subtotal.toLocaleString('en-IN')}`;
});

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate tax (18% GST)
    this.tax = Math.round(this.subtotal * 0.18);
    
    // Calculate shipping (free for orders above ₹500)
    this.shipping = this.subtotal >= 500 ? 0 : 50;
    
    // Calculate final total
    this.total = this.subtotal + this.tax + this.shipping - this.discount;
    
    // Update expiry
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    next();
});

// Instance method to add item
cartSchema.methods.addItem = async function(productId, quantity = 1) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    if (product.status !== 'active') {
        throw new Error('Product is not available');
    }
    
    // Check inventory
    if (product.inventory.trackQuantity && product.inventory.quantity < quantity) {
        throw new Error('Insufficient stock');
    }
    
    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        // Check max quantity
        if (newQuantity > 99) {
            throw new Error('Maximum quantity limit exceeded');
        }
        
        // Check inventory for new quantity
        if (product.inventory.trackQuantity && product.inventory.quantity < newQuantity) {
            throw new Error('Insufficient stock for requested quantity');
        }
        
        existingItem.quantity = newQuantity;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        this.items.push({
            product: productId,
            quantity: quantity,
            price: product.price,
            total: product.price * quantity
        });
    }
    
    return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItem = async function(productId, quantity) {
    const item = this.items.find(item => 
        item.product.toString() === productId.toString()
    );
    
    if (!item) {
        throw new Error('Item not found in cart');
    }
    
    if (quantity <= 0) {
        return this.removeItem(productId);
    }
    
    // Check inventory
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (product && product.inventory.trackQuantity && product.inventory.quantity < quantity) {
        throw new Error('Insufficient stock');
    }
    
    item.quantity = quantity;
    item.total = item.quantity * item.price;
    
    return this.save();
};

// Instance method to remove item
cartSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    
    return this.save();
};

// Instance method to clear cart
cartSchema.methods.clear = function() {
    this.items = [];
    return this.save();
};

// Instance method to merge with another cart
cartSchema.methods.mergeWith = async function(otherCart) {
    for (const otherItem of otherCart.items) {
        await this.addItem(otherItem.product, otherItem.quantity);
    }
    
    return this.save();
};

// Static method to find or create cart
cartSchema.statics.findOrCreate = async function(identifier, isUser = false) {
    const query = isUser ? { user: identifier } : { sessionId: identifier };
    
    let cart = await this.findOne(query).populate('items.product');
    
    if (!cart) {
        const cartData = isUser ? { user: identifier } : { sessionId: identifier };
        cart = new this(cartData);
        await cart.save();
    }
    
    return cart;
};

// Static method to cleanup expired carts
cartSchema.statics.cleanupExpired = function() {
    return this.deleteMany({
        expiresAt: { $lt: new Date() },
        user: { $exists: false } // Only cleanup guest carts
    });
};

// Indexes for better performance
cartSchema.index({ sessionId: 1 });
cartSchema.index({ user: 1 });
cartSchema.index({ expiresAt: 1 });
cartSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);
