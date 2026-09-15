const express = require('express');
const router = express.Router();
const Winners = require('../schemas/winners');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');
const { uploadWinners } = require('../config/cloudinary');

// ========== ADMIN ROUTES ==========

// Get all winners sections
router.get('/winners', teamAuth, async (req, res) => {
    try {
        const sections = await Winners.find().sort({ order: 1, createdAt: -1 });
        res.json(sections);
    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single winners section
router.get('/winners/:id', teamAuth, async (req, res) => {
    try {
        const section = await Winners.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });
        res.json(section);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create winners section
router.post('/winners', teamAuth, hasPermission('winners', 'create'), async (req, res) => {
    try {
        const { heading, subtitle, showOnHomepage, isPublished } = req.body;

        if (!heading) {
            return res.status(400).json({ message: 'Heading is required' });
        }

        const count = await Winners.countDocuments();

        const section = new Winners({
            heading,
            subtitle: subtitle || '',
            winners: [],
            showOnHomepage: showOnHomepage !== false,
            isPublished: isPublished || false,
            order: count
        });

        await section.save();
        res.status(201).json({ message: 'Section created', section });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update winners section
router.put('/winners/:id', teamAuth, hasPermission('winners', 'edit'), async (req, res) => {
    try {
        const { heading, subtitle, showOnHomepage, isPublished } = req.body;

        const section = await Winners.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        if (heading) section.heading = heading;
        if (subtitle !== undefined) section.subtitle = subtitle;
        if (showOnHomepage !== undefined) section.showOnHomepage = showOnHomepage;
        if (isPublished !== undefined) section.isPublished = isPublished;
        section.updatedAt = new Date();

        await section.save();
        res.json({ message: 'Section updated', section });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete winners section
router.delete('/winners/:id', teamAuth, hasPermission('winners', 'delete'), async (req, res) => {
    try {
        const section = await Winners.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        const { cloudinary } = require('../config/cloudinary');
        for (const winner of section.winners) {
            try {
                await cloudinary.uploader.destroy(winner.publicId);
            } catch (err) {
                console.error('Cloudinary delete error:', err);
            }
        }

        await Winners.findByIdAndDelete(req.params.id);
        res.json({ message: 'Section deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add winner
router.post('/winners/:id/add-winner', teamAuth, hasPermission('winners', 'create'), uploadWinners.single('photo'), async (req, res) => {
    try {
        const { name, rollno, eventName, rank } = req.body;

        if (!name || !rollno || !eventName) {
            return res.status(400).json({ message: 'Name, rollno and eventName are required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Photo is required' });
        }

        const section = await Winners.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        const winner = {
            name: name.trim(),
            rollno: rollno.trim(),
            eventName: eventName.trim(),
            rank: rank || '1st',
            photo: req.file.path,
            publicId: req.file.filename,
            order: section.winners.length
        };

        section.winners.push(winner);
        section.updatedAt = new Date();
        await section.save();

        res.status(201).json({ message: 'Winner added successfully', section });
    } catch (error) {
        console.error('Error adding winner:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== ✅ NEW: Edit Winner ==========
router.put('/winners/:id/edit-winner/:winnerId', teamAuth, hasPermission('winners', 'edit'), uploadWinners.single('photo'), async (req, res) => {
    try {
        const { name, rollno, eventName, rank } = req.body;
        const { id, winnerId } = req.params;

        if (!name || !rollno || !eventName) {
            return res.status(400).json({ message: 'Name, rollno and eventName are required' });
        }

        const section = await Winners.findById(id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        const winner = section.winners.id(winnerId);
        if (!winner) return res.status(404).json({ message: 'Winner not found' });

        // Update text fields
        winner.name = name.trim();
        winner.rollno = rollno.trim();
        winner.eventName = eventName.trim();
        winner.rank = rank || winner.rank || '1st';

        // ✅ Photo optional — agar naya photo aaya toh purani delete karke nayi lagao
        if (req.file) {
            const { cloudinary } = require('../config/cloudinary');
            try {
                if (winner.publicId) {
                    await cloudinary.uploader.destroy(winner.publicId);
                }
            } catch (cloudErr) {
                console.error('Cloudinary delete error (old winner photo):', cloudErr);
            }
            winner.photo = req.file.path;
            winner.publicId = req.file.filename;
        }

        section.updatedAt = new Date();
        await section.save();

        res.json({ message: 'Winner updated successfully', section });
    } catch (error) {
        console.error('Error editing winner:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete winner
router.delete('/winners/:id/winner/:winnerId', teamAuth, hasPermission('winners', 'delete'), async (req, res) => {
    try {
        const section = await Winners.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        const winner = section.winners.id(req.params.winnerId);
        if (!winner) return res.status(404).json({ message: 'Winner not found' });

        const { cloudinary } = require('../config/cloudinary');
        try {
            await cloudinary.uploader.destroy(winner.publicId);
        } catch (err) {
            console.error('Cloudinary delete error:', err);
        }

        section.winners.pull({ _id: req.params.winnerId });
        section.updatedAt = new Date();
        await section.save();

        res.json({ message: 'Winner deleted', section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTES ==========

router.get('/public/winners', async (req, res) => {
    try {
        const sections = await Winners.find({
            isPublished: true,
            showOnHomepage: true
        })
            .sort({ order: 1, createdAt: -1 })
            .select('-winners.publicId');

        res.json(sections);
    } catch (error) {
        console.error('Error fetching public winners:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;