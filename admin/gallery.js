const express = require('express');
const router = express.Router();
const Gallery = require('../schemas/gallery');
const { adminAuth } = require('../middleware/auth');
const { cloudinary, upload } = require('../config/cloudinary');

// ========== ADMIN ROUTES ==========

// Upload image to Cloudinary
router.post('/gallery/upload', adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const galleryImage = new Gallery({
            title: req.body.title || 'Untitled',
            cloudinaryUrl: req.file.path,
            publicId: req.file.filename,
            format: req.file.format,
            size: req.file.size,
            width: req.file.width,
            height: req.file.height
        });
        
        await galleryImage.save();
        res.status(201).json({ 
            message: 'Image uploaded successfully', 
            image: galleryImage 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get all gallery images
router.get('/gallery', adminAuth, async (req, res) => {
    try {
        const images = await Gallery.find().sort({ uploadDate: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single image
router.get('/gallery/:id', adminAuth, async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }
        res.json(image);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update image title
router.put('/gallery/:id', adminAuth, async (req, res) => {
    try {
        const { title } = req.body;
        const image = await Gallery.findByIdAndUpdate(
            req.params.id,
            { title },
            { new: true }
        );
        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }
        res.json({ message: 'Title updated', image });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete image from Cloudinary and database
router.delete('/gallery/:id', adminAuth, async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }
        
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(image.publicId);
        
        // Delete from database
        await Gallery.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTES ==========

// Get all gallery images (for frontend website)
router.get('/public/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ uploadDate: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;