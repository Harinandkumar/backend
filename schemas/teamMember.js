const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    events: {
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    notifications: {
        create: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    gallery: {
        upload: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    members: {
        view: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    categories: {
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    navItems: {
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    teamManagement: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false }
    },
    certificates: {
        upload: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    // ✅ NEW: Winners permissions
    winners: {
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    // ✅ NEW: Custom Sections permission
customSections: {
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
},
// ✅ NEW: Reels permission
reels: {
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
}

});

const teamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    position: { 
        type: String, 
        enum: ['Core Member', 'Senior Coordinator', 'Coordinator', 'Sub-Coordinator', 'Super Admin'],
        default: 'Sub-Coordinator'
    },
    role: {
        type: String,
        enum: ['super_admin', 'senior_coordinator', 'core_member', 'coordinator', 'sub_coordinator'],
        required: true
    },
    profileImage: { type: String, default: '' },
    phone: { type: String, default: '' },
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    permissions: { type: permissionSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);