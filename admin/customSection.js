const express = require('express');
const router = express.Router();
const CustomSection = require('../schemas/customSection');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');

// ========== ADMIN ROUTES ==========

// Get all sections (any admin can view)
router.get('/custom-sections', teamAuth, async (req, res) => {
    try {
        const sections = await CustomSection.find()
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ order: 1, createdAt: -1 });
        res.json(sections);
    } catch (error) {
        console.error('Error fetching custom sections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single section
router.get('/custom-sections/:id', teamAuth, async (req, res) => {
    try {
        const section = await CustomSection.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });
        res.json(section);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create section
router.post('/custom-sections', teamAuth, hasPermission('customSections', 'create'), async (req, res) => {
    try {
        const { name, title, description, icon, background, customBackground, showOnHomepage, showInNav, navLabel } = req.body;

        if (!name || !title) {
            return res.status(400).json({ message: 'Name and title are required' });
        }

        const cleanName = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const existing = await CustomSection.findOne({ name: cleanName });
        if (existing) {
            return res.status(400).json({ message: 'A section with this name already exists' });
        }

        const count = await CustomSection.countDocuments();

        const section = new CustomSection({
            name: cleanName,
            title: title.trim(),
            description: description || '',
            icon: icon || '📦',
            background: background || 'default',
            customBackground: customBackground || '',
            blocks: [],
            showOnHomepage: showOnHomepage !== false,
            showInNav: showInNav || false,
            navLabel: navLabel || '',
            isPublished: false,
            order: count,
            createdBy: req.teamMember._id
        });

        await section.save();
        res.status(201).json({ message: 'Section created successfully', section });
    } catch (error) {
        console.error('Create section error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update section (metadata)
router.put('/custom-sections/:id', teamAuth, hasPermission('customSections', 'edit'), async (req, res) => {
    try {
        const { title, description, icon, background, customBackground, showOnHomepage, showInNav, navLabel, isPublished, maxWidth, padding } = req.body;

        const section = await CustomSection.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        if (title) section.title = title.trim();
        if (description !== undefined) section.description = description;
        if (icon) section.icon = icon;
        if (background) section.background = background;
        if (customBackground !== undefined) section.customBackground = customBackground;
        if (showOnHomepage !== undefined) section.showOnHomepage = showOnHomepage;
        if (showInNav !== undefined) section.showInNav = showInNav;
        if (navLabel !== undefined) section.navLabel = navLabel;
        if (isPublished !== undefined) section.isPublished = isPublished;
        if (maxWidth) section.maxWidth = maxWidth;
        if (padding) section.padding = padding;

        section.updatedBy = req.teamMember._id;
        section.updatedAt = new Date();

        await section.save();
        res.json({ message: 'Section updated successfully', section });
    } catch (error) {
        console.error('Update section error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update blocks (bulk save)
router.put('/custom-sections/:id/blocks', teamAuth, hasPermission('customSections', 'edit'), async (req, res) => {
    try {
        const { blocks } = req.body;

        if (!Array.isArray(blocks)) {
            return res.status(400).json({ message: 'Blocks must be an array' });
        }

        // Validate each block
        for (const block of blocks) {
            if (!block.id || !block.type) {
                return res.status(400).json({ message: 'Each block must have an id and type' });
            }
        }

        const section = await CustomSection.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        section.blocks = blocks;
        section.updatedBy = req.teamMember._id;
        section.updatedAt = new Date();

        await section.save();
        res.json({ message: 'Blocks saved successfully', section });
    } catch (error) {
        console.error('Save blocks error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete section
router.delete('/custom-sections/:id', teamAuth, hasPermission('customSections', 'delete'), async (req, res) => {
    try {
        const section = await CustomSection.findById(req.params.id);
        if (!section) return res.status(404).json({ message: 'Section not found' });

        // Clean up Cloudinary images
        const { cloudinary } = require('../config/cloudinary');
        for (const block of section.blocks) {
            // Single image block
            if (block.type === 'image' && block.content?.publicId) {
                try {
                    await cloudinary.uploader.destroy(block.content.publicId);
                } catch (err) {
                    console.error('Cloudinary delete error (image):', err.message);
                }
            }
            // Gallery block
            if (block.type === 'gallery' && Array.isArray(block.content?.images)) {
                for (const img of block.content.images) {
                    if (img.publicId) {
                        try {
                            await cloudinary.uploader.destroy(img.publicId);
                        } catch (err) {
                            console.error('Cloudinary delete error (gallery):', err.message);
                        }
                    }
                }
            }
        }

        await CustomSection.findByIdAndDelete(req.params.id);
        res.json({ message: 'Section deleted successfully' });
    } catch (error) {
        console.error('Delete section error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reorder sections
router.put('/custom-sections-reorder/bulk', teamAuth, hasPermission('customSections', 'edit'), async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Items array is required' });
        }

        for (let i = 0; i < items.length; i++) {
            await CustomSection.findByIdAndUpdate(items[i]._id, { order: i });
        }

        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTES ==========

router.get('/public/custom-sections', async (req, res) => {
    try {
        const sections = await CustomSection.find({ isPublished: true })
            .sort({ order: 1, createdAt: -1 })
            .select('-createdBy -updatedBy -__v');
        res.json(sections);
    } catch (error) {
        console.error('Public fetch error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;