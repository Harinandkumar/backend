const mongoose = require('mongoose');

const adminActivityLogSchema = new mongoose.Schema({
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TeamMember',
        required: true 
    },
    adminName: { type: String, required: true },
    adminEmail: { type: String, required: true },
    adminRole: { type: String, required: true },
    action: { 
        type: String, 
        enum: [
            // Events
            'event_created', 'event_updated', 'event_deleted', 'event_toggle_status',
            // Notifications
            'notification_created', 'notification_deleted',
            // Gallery
            'image_uploaded', 'image_updated', 'image_deleted',
            // Categories
            'category_created', 'category_updated', 'category_deleted',
            // Nav Items
            'nav_created', 'nav_updated', 'nav_deleted', 'nav_reordered',
            // Members (User management)
            'member_deleted', 'member_viewed',
            // Team Management
            'team_member_added', 'team_member_updated', 'team_member_deleted', 'permission_updated',
            // Certificates
            'certificate_uploaded', 'certificate_deleted',
            // Work Assignment
            'work_assigned', 'work_updated', 'work_status_changed', 'work_deleted',
            // Login/Logout
            'admin_login', 'admin_logout'
        ],
        required: true 
    },
    actionDetails: { 
        type: mongoose.Schema.Types.Mixed,
        default: {} 
    },
    targetId: { 
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel',
        default: null
    },
    targetModel: {
        type: String,
        enum: ['Event', 'Notification', 'Gallery', 'Category', 'NavItem', 'User', 'TeamMember', 'Certificate', 'WorkAssignment'],
        default: null
    },
    targetName: { type: String, default: null },
    ipAddress: { type: String, default: 'Unknown' },
    userAgent: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Desktop' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    errorMessage: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
adminActivityLogSchema.index({ adminId: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1, createdAt: -1 });
adminActivityLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 90 days
adminActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AdminActivityLog', adminActivityLogSchema);