const express = require('express');
const router = express.Router();
const TeamPublic = require('../schemas/teamPublic');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');
const { upload } = require('../config/cloudinary');

// ========== ADMIN ROUTES (Super Admin only) ==========

// Get all team members
router.get('/team-public', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const members = await TeamPublic.find().sort({ order: 1, createdAt: -1 });
        res.json(members);
    } catch (error) {
        console.error('Error fetching team public:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add team member
router.post('/team-public', teamAuth, isSuperAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, position, batch, linkedin } = req.body;
        
        // Validation
        if (!name || !position || !batch) {
            return res.status(400).json({ message: 'Name, position, and batch are required' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'Photo is required' });
        }
        
        // Get count for ordering
        const count = await TeamPublic.countDocuments();
        
        const member = new TeamPublic({
            name: name.trim(),
            position,
            batch: batch.trim(),
            linkedin: linkedin ? linkedin.trim() : '',
            photo: req.file.path,
            publicId: req.file.filename,
            order: count
        });
        
        await member.save();
        
        res.status(201).json({ 
            message: 'Team member added successfully', 
            member 
        });
    } catch (error) {
        console.error('Error adding team public member:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update team member
router.put('/team-public/:id', teamAuth, isSuperAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, position, batch, linkedin, isActive } = req.body;
        const member = await TeamPublic.findById(req.params.id);
        
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        // Update fields
        if (name) member.name = name.trim();
        if (position) member.position = position;
        if (batch) member.batch = batch.trim();
        if (linkedin !== undefined) member.linkedin = linkedin.trim();
        if (isActive !== undefined) member.isActive = isActive;
        member.updatedAt = new Date();
        
        // Update photo if new file uploaded
        if (req.file) {
            // Delete old image from Cloudinary
            const { cloudinary } = require('../config/cloudinary');
            try {
                await cloudinary.uploader.destroy(member.publicId);
            } catch (cloudError) {
                console.error('Cloudinary delete error:', cloudError);
            }
            member.photo = req.file.path;
            member.publicId = req.file.filename;
        }
        
        await member.save();
        
        res.json({ 
            message: 'Team member updated successfully', 
            member 
        });
    } catch (error) {
        console.error('Error updating team public member:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete team member
router.delete('/team-public/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamPublic.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        // Delete image from Cloudinary
        const { cloudinary } = require('../config/cloudinary');
        try {
            await cloudinary.uploader.destroy(member.publicId);
        } catch (cloudError) {
            console.error('Cloudinary delete error:', cloudError);
        }
        
        await TeamPublic.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team public member:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reorder team members
router.put('/team-public/reorder', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Items array is required' });
        }
        
        for (let i = 0; i < items.length; i++) {
            await TeamPublic.findByIdAndUpdate(items[i]._id, { order: i });
        }
        
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error reordering team public:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTE (No auth required) ==========

// Get all active team members grouped by position
router.get('/public/team', async (req, res) => {
    try {
        const members = await TeamPublic.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select('-publicId -__v');
        
        // Group by position
        const grouped = {
            senior_coordinators: members.filter(m => m.position === 'Senior Coordinator'),
            coordinators: members.filter(m => m.position === 'Coordinator'),
            sub_coordinators: members.filter(m => m.position === 'Sub-Coordinator')
        };
        
        res.json(grouped);
    } catch (error) {
        console.error('Error fetching public team:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;