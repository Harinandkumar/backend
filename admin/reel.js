const express = require('express');
const router = express.Router();
const Reel = require('../schemas/reel');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');
const { uploadReelVideo, uploadReelThumbnail, cloudinary } = require('../config/cloudinary');

// ========== ADMIN ROUTES ==========

// Get all reels (admin — includes inactive)
router.get('/reels', teamAuth, async (req, res) => {
    try {
        const reels = await Reel.find()
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ order: 1, createdAt: -1 });
        res.json(reels);
    } catch (error) {
        console.error('Error fetching reels:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single reel
router.get('/reels/:id', teamAuth, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel not found' });
        res.json(reel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== ✅ UPLOAD VIDEO (Cloudinary) ==========
router.post(
    '/reels/upload-video',
    teamAuth,
    hasPermission('reels', 'create'),
    uploadReelVideo.single('video'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No video file uploaded' });
            }

            res.json({
                message: 'Video uploaded successfully',
                url: req.file.path,
                publicId: req.file.filename,
                duration: req.file.duration || 0,
                format: req.file.format || 'mp4'
            });
        } catch (error) {
            console.error('Video upload error:', error);
            res.status(500).json({ message: error.message });
        }
    }
);

// ========== ✅ UPLOAD THUMBNAIL (Cloudinary) ==========
router.post(
    '/reels/upload-thumbnail',
    teamAuth,
    hasPermission('reels', 'create'),
    uploadReelThumbnail.single('thumbnail'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No thumbnail uploaded' });
            }

            res.json({
                message: 'Thumbnail uploaded successfully',
                url: req.file.path,
                publicId: req.file.filename
            });
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            res.status(500).json({ message: error.message });
        }
    }
);

// ========== ✅ CREATE REEL ==========
router.post('/reels', teamAuth, hasPermission('reels', 'create'), async (req, res) => {
    try {
        const {
            title,
            description,
            videoType,
            videoUrl,
            videoPublicId,
            thumbnailUrl,
            thumbnailPublicId,
            duration,
            aspectRatio,
            isActive
        } = req.body;

        if (!title || !videoUrl) {
            return res.status(400).json({ message: 'Title and video URL are required' });
        }

        if (!videoType || !['upload', 'url'].includes(videoType)) {
            return res.status(400).json({ message: 'Valid video type (upload/url) is required' });
        }

        const count = await Reel.countDocuments();

        const reel = new Reel({
            title: title.trim(),
            description: description || '',
            videoType,
            videoUrl: videoUrl.trim(),
            videoPublicId: videoPublicId || '',
            thumbnailUrl: thumbnailUrl || '',
            thumbnailPublicId: thumbnailPublicId || '',
            duration: duration || 0,
            aspectRatio: aspectRatio || 'vertical',
            isActive: isActive !== false,
            order: count,
            createdBy: req.teamMember._id
        });

        await reel.save();
        res.status(201).json({ message: 'Reel created successfully', reel });
    } catch (error) {
        console.error('Create reel error:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== ✅ UPDATE REEL ==========
router.put('/reels/:id', teamAuth, hasPermission('reels', 'edit'), async (req, res) => {
    try {
        const {
            title,
            description,
            videoType,
            videoUrl,
            videoPublicId,
            thumbnailUrl,
            thumbnailPublicId,
            duration,
            aspectRatio,
            isActive
        } = req.body;

        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel not found' });

        // Agar video change hua, toh purani Cloudinary video delete karo
        if (videoPublicId && videoPublicId !== reel.videoPublicId && reel.videoPublicId) {
            try {
                await cloudinary.uploader.destroy(reel.videoPublicId, { resource_type: 'video' });
            } catch (err) {
                console.error('Cloudinary old video delete error:', err.message);
            }
        }

        // Agar thumbnail change hua, toh purani Cloudinary thumbnail delete karo
        if (thumbnailPublicId && thumbnailPublicId !== reel.thumbnailPublicId && reel.thumbnailPublicId) {
            try {
                await cloudinary.uploader.destroy(reel.thumbnailPublicId);
            } catch (err) {
                console.error('Cloudinary old thumbnail delete error:', err.message);
            }
        }

        if (title) reel.title = title.trim();
        if (description !== undefined) reel.description = description;
        if (videoType) reel.videoType = videoType;
        if (videoUrl) reel.videoUrl = videoUrl.trim();
        if (videoPublicId !== undefined) reel.videoPublicId = videoPublicId;
        if (thumbnailUrl !== undefined) reel.thumbnailUrl = thumbnailUrl;
        if (thumbnailPublicId !== undefined) reel.thumbnailPublicId = thumbnailPublicId;
        if (duration !== undefined) reel.duration = duration;
        if (aspectRatio) reel.aspectRatio = aspectRatio;
        if (isActive !== undefined) reel.isActive = isActive;

        reel.updatedBy = req.teamMember._id;
        reel.updatedAt = new Date();

        await reel.save();
        res.json({ message: 'Reel updated successfully', reel });
    } catch (error) {
        console.error('Update reel error:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== ✅ DELETE REEL ==========
router.delete('/reels/:id', teamAuth, hasPermission('reels', 'delete'), async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel not found' });

        // Cloudinary se video delete karo
        if (reel.videoPublicId && reel.videoType === 'upload') {
            try {
                await cloudinary.uploader.destroy(reel.videoPublicId, { resource_type: 'video' });
            } catch (err) {
                console.error('Cloudinary video delete error:', err.message);
            }
        }

        // Cloudinary se thumbnail delete karo
        if (reel.thumbnailPublicId) {
            try {
                await cloudinary.uploader.destroy(reel.thumbnailPublicId);
            } catch (err) {
                console.error('Cloudinary thumbnail delete error:', err.message);
            }
        }

        await Reel.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reel deleted successfully' });
    } catch (error) {
        console.error('Delete reel error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== ✅ REORDER REELS ==========
router.put('/reels-reorder/bulk', teamAuth, hasPermission('reels', 'edit'), async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Items array is required' });
        }

        for (let i = 0; i < items.length; i++) {
            await Reel.findByIdAndUpdate(items[i]._id, { order: i });
        }

        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== ✅ TOGGLE ACTIVE STATUS ==========
router.put('/reels/:id/toggle', teamAuth, hasPermission('reels', 'edit'), async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel not found' });

        reel.isActive = !reel.isActive;
        reel.updatedBy = req.teamMember._id;
        reel.updatedAt = new Date();

        await reel.save();
        res.json({ message: 'Status updated', reel });
    } catch (error) {
        console.error('Toggle error:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTES ==========

// Get active reels (public — homepage ke liye)
router.get('/public/reels', async (req, res) => {
    try {
        const reels = await Reel.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select('-createdBy -updatedBy -videoPublicId -thumbnailPublicId -__v');
        res.json(reels);
    } catch (error) {
        console.error('Public fetch reels error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;