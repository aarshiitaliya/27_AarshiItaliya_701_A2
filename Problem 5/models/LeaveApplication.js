const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        ref: 'Employee'
    },
    employeeName: {
        type: String,
        required: true
    },
    leaveDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    appliedDate: {
        type: Date,
        default: Date.now
    },
    reviewedBy: {
        type: String,
        default: null
    },
    reviewDate: {
        type: Date,
        default: null
    },
    comments: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for efficient queries
leaveApplicationSchema.index({ empId: 1, appliedDate: -1 });

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);
