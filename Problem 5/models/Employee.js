const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        unique: true
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

// Method to compare password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Ensure virtual fields are serialized
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
