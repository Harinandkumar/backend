const express = require('express');
const router = express.Router();
const Alumni = require('../schemas/alumni');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');
const { upload } = require('../config/cloudinary');

// ========== ADMIN ROUTES (Super Admin only) ==========

// Get all alumni
router.get('/alumni', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const alumni = await Alumni.find().sort({ order: 1, createdAt: -1 });
        res.json(alumni);
    } catch (error) {
        console.error('Error fetching alumni:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add alumni
router.post('/alumni', teamAuth, isSuperAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, batch, linkedin, description } = req.body;
        
        if (!name || !batch) {
            return res.status(400).json({ message: 'Name and batch are required' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'Photo is required' });
        }
        
        const count = await Alumni.countDocuments();
        
        const alumni = new Alumni({
            name: name.trim(),
            batch: batch.trim(),
            linkedin: linkedin ? linkedin.trim() : '',
            description: description ? description.trim() : '',
            photo: req.file.path,
            publicId: req.file.filename,
            order: count
        });
        
        await alumni.save();
        
        res.status(201).json({ 
            message: 'Alumni added successfully', 
            alumni 
        });
    } catch (error) {
        console.error('Error adding alumni:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update alumni
router.put('/alumni/:id', teamAuth, isSuperAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, batch, linkedin, description, isActive } = req.body;
        const alumni = await Alumni.findById(req.params.id);
        
        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }
        
        if (name) alumni.name = name.trim();
        if (batch) alumni.batch = batch.trim();
        if (linkedin !== undefined) alumni.linkedin = linkedin.trim();
        if (description !== undefined) alumni.description = description.trim();
        if (isActive !== undefined) alumni.isActive = isActive;
        alumni.updatedAt = new Date();
        
        if (req.file) {
            const { cloudinary } = require('../config/cloudinary');
            try {
                await cloudinary.uploader.destroy(alumni.publicId);
            } catch (cloudError) {
                console.error('Cloudinary delete error:', cloudError);
            }
            alumni.photo = req.file.path;
            alumni.publicId = req.file.filename;
        }
        
        await alumni.save();
        
        res.json({ 
            message: 'Alumni updated successfully', 
            alumni 
        });
    } catch (error) {
        console.error('Error updating alumni:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete alumni
router.delete('/alumni/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);
        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }
        
        const { cloudinary } = require('../config/cloudinary');
        try {
            await cloudinary.uploader.destroy(alumni.publicId);
        } catch (cloudError) {
            console.error('Cloudinary delete error:', cloudError);
        }
        
        await Alumni.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Alumni deleted successfully' });
    } catch (error) {
        console.error('Error deleting alumni:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reorder alumni
router.put('/alumni/reorder', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Items array is required' });
        }
        
        for (let i = 0; i < items.length; i++) {
            await Alumni.findByIdAndUpdate(items[i]._id, { order: i });
        }
        
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error reordering alumni:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTE (No auth required) ==========

// Get all active alumni
router.get('/public/alumni', async (req, res) => {
    try {
        const alumni = await Alumni.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select('-publicId -__v');
        
        res.json(alumni);
    } catch (error) {
        console.error('Error fetching public alumni:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;