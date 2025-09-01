const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        unique: true
    },
    tempPassword: {
        type: String,
        select: false  // Won't be returned in normal queries
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true,
        enum: ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales']
    },
    position: {
        type: String,
        required: true
    },
    joiningDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    baseSalary: {
        type: Number,
        required: true,
        min: 0
    },
    allowances: {
        hra: { type: Number, default: 0 },
        transport: { type: Number, default: 0 },
        medical: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    deductions: {
        pf: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        insurance: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    password: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for total allowances
employeeSchema.virtual('totalAllowances').get(function() {
    return this.allowances.hra + this.allowances.transport + 
           this.allowances.medical + this.allowances.other;
});

// Virtual for total deductions
employeeSchema.virtual('totalDeductions').get(function() {
    return this.deductions.pf + this.deductions.tax + 
           this.deductions.insurance + this.deductions.other;
});

// Virtual for gross salary calculation
employeeSchema.virtual('grossSalary').get(function() {
    return this.baseSalary + this.totalAllowances;
});

// Virtual for net salary calculation
employeeSchema.virtual('netSalary').get(function() {
    return this.grossSalary - this.totalDeductions;
});

// Virtual for years of service
employeeSchema.virtual('yearsOfService').get(function() {
    const now = new Date();
    const joining = new Date(this.joiningDate);
    return Math.floor((now - joining) / (365.25 * 24 * 60 * 60 * 1000));
});

// Pre-save middleware to hash password
employeeSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Static method to generate employee ID
employeeSchema.statics.generateEmpId = async function() {
    const count = await this.countDocuments();
    const year = new Date().getFullYear();
    const empNumber = String(count + 1).padStart(4, '0');
    return `EMP${year}${empNumber}`;
};

// Static method to generate random password
employeeSchema.statics.generatePassword = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Ensure virtual fields are serialized
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
