const mongoose = require('mongoose');

// ========== BLOCK SCHEMA ==========
const blockSchema = new mongoose.Schema({
    id: { type: String, required: true },  // unique id for drag-drop
    type: {
        type: String,
        enum: [
            'heading',
            'subheading',
            'paragraph',
            'image',
            'video',
            'button',
            'gallery',
            'list',
            'quote',
            'divider',
            'card',
            'cardgrid', 
            'cta',
            'html',
            'spacer'
        ],
        required: true
    },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    styles: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 }
}, { _id: false });

// ========== SECTION SCHEMA ==========
const customSectionSchema = new mongoose.Schema({
    // Basic info
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    // Appearance
    icon: { type: String, default: '📦' },
    background: {
        type: String,
        enum: ['default', 'gradient', 'dark', 'light', 'custom'],
        default: 'default'
    },
    customBackground: { type: String, default: '' },
    maxWidth: { type: String, default: '1400px' },
    padding: { type: String, default: '90px 28px' },

    // Content blocks
    blocks: [blockSchema],

    // Display settings
    isPublished: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: true },
    showInNav: { type: Boolean, default: false },
    navLabel: { type: String, default: '' },

    // Order & meta
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

customSectionSchema.index({ order: 1, isPublished: 1 });
customSectionSchema.index({ showOnHomepage: 1, isPublished: 1 });

module.exports = mongoose.model('CustomSection', customSectionSchema);