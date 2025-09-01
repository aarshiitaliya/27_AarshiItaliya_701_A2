const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    phone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    addresses: [{
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        firstName: String,
        lastName: String,
        company: String,
        address1: {
            type: String,
            required: true
        },
        address2: String,
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: 'India'
        },
        phone: String,
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    preferences: {
        newsletter: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        },
        currency: {
            type: String,
            default: 'INR'
        },
        language: {
            type: String,
            default: 'en'
        }
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    orderHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for default address
userSchema.virtual('defaultAddress').get(function() {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to ensure only one default address
userSchema.pre('save', function(next) {
    if (this.addresses && this.addresses.length > 0) {
        const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
        
        if (defaultAddresses.length === 0) {
            this.addresses[0].isDefault = true;
        } else if (defaultAddresses.length > 1) {
            this.addresses.forEach((addr, index) => {
                addr.isDefault = index === 0;
            });
        }
    }
    next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

// Instance method to add to wishlist
userSchema.methods.addToWishlist = function(productId) {
    if (!this.wishlist.includes(productId)) {
        this.wishlist.push(productId);
        return this.save();
    }
    return Promise.resolve(this);
};

// Instance method to remove from wishlist
userSchema.methods.removeFromWishlist = function(productId) {
    this.wishlist = this.wishlist.filter(id => id.toString() !== productId.toString());
    return this.save();
};

// Instance method to add address
userSchema.methods.addAddress = function(addressData) {
    // If this is the first address or marked as default, make it default
    if (this.addresses.length === 0 || addressData.isDefault) {
        this.addresses.forEach(addr => addr.isDefault = false);
        addressData.isDefault = true;
    }
    
    this.addresses.push(addressData);
    return this.save();
};

// Instance method to update address
userSchema.methods.updateAddress = function(addressId, addressData) {
    const address = this.addresses.id(addressId);
    if (!address) throw new Error('Address not found');
    
    // If marking as default, unset others
    if (addressData.isDefault) {
        this.addresses.forEach(addr => addr.isDefault = false);
    }
    
    Object.assign(address, addressData);
    return this.save();
};

// Instance method to remove address
userSchema.methods.removeAddress = function(addressId) {
    const address = this.addresses.id(addressId);
    if (!address) throw new Error('Address not found');
    
    const wasDefault = address.isDefault;
    address.remove();
    
    // If removed address was default, make first address default
    if (wasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
    }
    
    return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

module.exports = mongoose.model('User', userSchema);
