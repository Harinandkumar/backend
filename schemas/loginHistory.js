const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['User', 'TeamMember']
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
    logoutTime: { 
        type: Date,
        default: null
    },
    sessionDuration: {
        type: Number,
        default: 0
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
    sessionId: {
        type: String,
        default: null
    },
    loginMethod: { 
        type: String, 
        enum: ['email_password', 'google', 'otp'], 
        default: 'email_password' 
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    failureReason: {
        type: String,
        default: null
    }
});

loginHistorySchema.index({ loginTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
loginHistorySchema.index({ sessionId: 1 });
loginHistorySchema.index({ userId: 1, userModel: 1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);