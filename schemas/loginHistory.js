const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true 
    },
    loginTime: { 
        type: Date, 
        default: Date.now 
    },
    ipAddress: { 
        type: String, 
        default: 'Unknown' 
    },
    userAgent: { 
        type: String, 
        default: 'Unknown' 
    },
    device: { 
        type: String, 
        default: 'Unknown' 
    },
    browser: { 
        type: String, 
        default: 'Unknown' 
    },
    os: { 
        type: String, 
        default: 'Unknown' 
    },
    loginMethod: { 
        type: String, 
        enum: ['email_password', 'google', 'otp'], 
        default: 'email_password' 
    }
});

// Auto-delete logs older than 90 days
loginHistorySchema.index({ loginTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);