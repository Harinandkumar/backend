const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
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
    description: { 
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

// Indexes
alumniSchema.index({ order: 1 });
alumniSchema.index({ isActive: 1 });

module.exports = mongoose.model('Alumni', alumniSchema);