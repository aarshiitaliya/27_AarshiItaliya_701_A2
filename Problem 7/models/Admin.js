const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'moderator'],
        default: 'admin'
    },
    permissions: {
        categories: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: true },
            delete: { type: Boolean, default: true }
        },
        products: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: true },
            delete: { type: Boolean, default: true }
        },
        orders: {
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: true },
            delete: { type: Boolean, default: false }
        },
        users: {
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        settings: {
            read: { type: Boolean, default: false },
            update: { type: Boolean, default: false }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    avatar: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

// Instance method to check permission
adminSchema.methods.hasPermission = function(resource, action) {
    if (this.role === 'super_admin') return true;
    
    return this.permissions[resource] && this.permissions[resource][action];
};

// Static method to create default admin
adminSchema.statics.createDefaultAdmin = async function() {
    const existingAdmin = await this.findOne({ role: 'super_admin' });
    if (existingAdmin) return existingAdmin;
    
    const defaultAdmin = new this({
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@shoppingcart.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        permissions: {
            categories: { create: true, read: true, update: true, delete: true },
            products: { create: true, read: true, update: true, delete: true },
            orders: { read: true, update: true, delete: true },
            users: { read: true, update: true, delete: true },
            settings: { read: true, update: true }
        }
    });
    
    return defaultAdmin.save();
};

// Indexes for better performance
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ role: 1 });

module.exports = mongoose.model('Admin', adminSchema);
