const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
    // Basic info
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    description: { 
        type: String, 
        default: '', 
        trim: true 
    },

    // Video source
    videoType: {
        type: String,
        enum: ['upload', 'url'],   // 'upload' = Cloudinary, 'url' = YouTube/Instagram/etc
        required: true,
        default: 'upload'
    },
    videoUrl: { 
        type: String, 
        required: true 
    },
    videoPublicId: { 
        type: String, 
        default: ''   // Cloudinary public_id (agar upload hua)
    },

    // Thumbnail (optional)
    thumbnailUrl: { 
        type: String, 
        default: '' 
    },
    thumbnailPublicId: { 
        type: String, 
        default: '' 
    },

    // Video metadata
    duration: { 
        type: Number, 
        default: 0   // seconds
    },
    aspectRatio: {
        type: String,
        enum: ['vertical', 'horizontal', 'square'],
        default: 'vertical'
    },

    // Display settings
    isActive: { 
        type: Boolean, 
        default: true 
    },
    order: { 
        type: Number, 
        default: 0 
    },

    // Meta
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TeamMember' 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TeamMember' 
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
reelSchema.index({ order: 1, isActive: 1 });
reelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reel', reelSchema);