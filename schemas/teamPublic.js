const mongoose = require('mongoose');

const teamPublicSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    position: { 
        type: String, 
        enum: ['Core Member', 'Coordinator', 'Sub-Coordinator'],
        required: true 
    },
    batch: { 
        type: String, 
        required: true,
        trim: true
    },
    linkedin: { 
        type: String, 
        default: '',
        trim: true
    },
    photo: { 
        type: String, 
        required: true 
    },
    publicId: { 
        type: String, 
        required: true 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    order: { 
        type: Number, 
        default: 0 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Index for faster queries
teamPublicSchema.index({ position: 1, order: 1 });
teamPublicSchema.index({ isActive: 1 });

module.exports = mongoose.model('TeamPublic', teamPublicSchema);