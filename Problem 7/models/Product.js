const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [300, 'Short description cannot exceed 300 characters']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    comparePrice: {
        type: Number,
        min: [0, 'Compare price cannot be negative']
    },
    cost: {
        type: Number,
        min: [0, 'Cost cannot be negative']
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true
    },
    barcode: {
        type: String,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        alt: {
            type: String,
            default: ''
        },
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    inventory: {
        trackQuantity: {
            type: Boolean,
            default: true
        },
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantity cannot be negative']
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: [0, 'Low stock threshold cannot be negative']
        }
    },
    shipping: {
        weight: {
            type: Number,
            min: [0, 'Weight cannot be negative']
        },
        dimensions: {
            length: Number,
            width: Number,
            height: Number
        },
        requiresShipping: {
            type: Boolean,
            default: true
        }
    },
    seo: {
        metaTitle: {
            type: String,
            maxlength: [60, 'Meta title cannot exceed 60 characters']
        },
        metaDescription: {
            type: String,
            maxlength: [160, 'Meta description cannot exceed 160 characters']
        },
        keywords: [String]
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'active'
    },
    featured: {
        type: Boolean,
        default: false
    },
    tags: [String],
    attributes: [{
        name: String,
        value: String
    }],
    variants: [{
        name: String,
        options: [String]
    }],
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    sales: {
        totalSold: {
            type: Number,
            default: 0
        },
        revenue: {
            type: Number,
            default: 0
        }
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : '/images/no-image.png');
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
    if (this.comparePrice && this.comparePrice > this.price) {
        return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
    }
    return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (!this.inventory.trackQuantity) return 'in_stock';
    if (this.inventory.quantity <= 0) return 'out_of_stock';
    if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low_stock';
    return 'in_stock';
});

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
    return `₹${this.price.toLocaleString('en-IN')}`;
});

// Virtual for formatted compare price
productSchema.virtual('formattedComparePrice').get(function() {
    return this.comparePrice ? `₹${this.comparePrice.toLocaleString('en-IN')}` : null;
});

// Pre-save middleware to generate slug and SKU
productSchema.pre('save', async function(next) {
    if (this.isModified('name') || !this.slug) {
        let baseSlug = slugify(this.name, { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g
        });
        
        // Ensure slug is unique
        let slug = baseSlug;
        let counter = 1;
        
        while (await this.constructor.findOne({ slug: slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        this.slug = slug;
    }
    
    // Auto-generate SKU if not provided
    if (this.isNew && !this.sku) {
        const timestamp = Date.now().toString().slice(-6);
        const namePrefix = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        this.sku = `${namePrefix}${timestamp}`;
    }
    
    // Ensure only one primary image
    if (this.images && this.images.length > 0) {
        const primaryCount = this.images.filter(img => img.isPrimary).length;
        if (primaryCount === 0) {
            this.images[0].isPrimary = true;
        } else if (primaryCount > 1) {
            this.images.forEach((img, index) => {
                img.isPrimary = index === 0;
            });
        }
    }
    
    next();
});

// Pre-save middleware to set parent category
productSchema.pre('save', async function(next) {
    if (this.isModified('category')) {
        const Category = mongoose.model('Category');
        const category = await Category.findById(this.category).populate('parent');
        
        if (category) {
            if (category.level === 2 && category.parent) {
                this.parentCategory = category.parent._id;
            } else if (category.level === 1) {
                this.parentCategory = category._id;
            }
        }
    }
    next();
});

// Static method to get products by category with filters
productSchema.statics.getByCategory = async function(categoryId, options = {}) {
    const {
        page = 1,
        limit = 12,
        sort = 'createdAt',
        order = 'desc',
        minPrice,
        maxPrice,
        inStock = false,
        featured = false
    } = options;
    
    const query = { 
        status: 'active',
        $or: [
            { category: categoryId },
            { parentCategory: categoryId }
        ]
    };
    
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = minPrice;
        if (maxPrice) query.price.$lte = maxPrice;
    }
    
    if (inStock) {
        query.$or = [
            { 'inventory.trackQuantity': false },
            { 'inventory.quantity': { $gt: 0 } }
        ];
    }
    
    if (featured) {
        query.featured = true;
    }
    
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;
    
    const skip = (page - 1) * limit;
    
    const products = await this.find(query)
        .populate('category', 'name slug')
        .populate('parentCategory', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limit);
    
    const total = await this.countDocuments(query);
    
    return {
        products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static method for search
productSchema.statics.search = async function(query, options = {}) {
    const {
        page = 1,
        limit = 12,
        sort = 'relevance'
    } = options;
    
    const searchQuery = {
        status: 'active',
        $text: { $search: query }
    };
    
    const sortObj = sort === 'relevance' 
        ? { score: { $meta: 'textScore' } }
        : { [sort]: -1 };
    
    const skip = (page - 1) * limit;
    
    const products = await this.find(searchQuery, { score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('parentCategory', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limit);
    
    const total = await this.countDocuments(searchQuery);
    
    return {
        products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Instance method to update inventory
productSchema.methods.updateInventory = function(quantity, operation = 'subtract') {
    if (!this.inventory.trackQuantity) return;
    
    if (operation === 'subtract') {
        this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
    } else if (operation === 'add') {
        this.inventory.quantity += quantity;
    }
    
    return this.save();
};

// Indexes for better performance
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ parentCategory: 1, status: 1 });
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', shortDescription: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
