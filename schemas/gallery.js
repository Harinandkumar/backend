const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    title: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    category: { type: String, default: 'events' },  // Changed from enum to string
    format: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gallery', gallerySchema);