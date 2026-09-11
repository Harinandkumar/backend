const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['team_welcome', 'user_verification', 'otp', 'work_assigned', 'work_completed', 'custom'],
        required: true 
    },
    includePermissions: { type: Boolean, default: true },
    includeLoginInstructions: { type: Boolean, default: true },
    includeLoginButton: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);