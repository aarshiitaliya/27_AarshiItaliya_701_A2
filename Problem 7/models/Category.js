const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        type: String,
        default: null
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    level: {
        type: Number,
        enum: [1, 2],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    productCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for subcategories (only for level 1 categories)
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

// Virtual for products
categorySchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category'
});

// Pre-save middleware to generate slug
categorySchema.pre('save', async function(next) {
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
    next();
});

// Static method to get category hierarchy
categorySchema.statics.getHierarchy = async function() {
    const categories = await this.find({ isActive: true })
        .populate('subcategories')
        .sort({ level: 1, sortOrder: 1, name: 1 });
    
    const hierarchy = [];
    const parentCategories = categories.filter(cat => cat.level === 1);
    
    for (const parent of parentCategories) {
        const subcategories = categories.filter(cat => 
            cat.level === 2 && cat.parent && cat.parent.toString() === parent._id.toString()
        );
        
        hierarchy.push({
            ...parent.toObject(),
            subcategories: subcategories
        });
    }
    
    return hierarchy;
};

// Static method to get breadcrumb trail
categorySchema.statics.getBreadcrumb = async function(categoryId) {
    const category = await this.findById(categoryId).populate('parent');
    if (!category) return [];
    
    const breadcrumb = [category];
    if (category.parent) {
        breadcrumb.unshift(category.parent);
    }
    
    return breadcrumb;
};

// Instance method to get full path
categorySchema.methods.getFullPath = function() {
    if (this.parent && this.populated('parent')) {
        return `${this.parent.name} > ${this.name}`;
    }
    return this.name;
};

// Indexes for better performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1, level: 1 });
categorySchema.index({ isActive: 1, level: 1, sortOrder: 1 });
categorySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Category', categorySchema);
