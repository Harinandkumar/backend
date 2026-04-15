const express = require('express');
const router = express.Router();
const { User } = require('../schemas/schema');
const { adminAuth } = require('../middleware/auth');

// Get all members (without passwords)
router.get('/', adminAuth, async (req, res) => {
    try {
        const { batch, search } = req.query;
        let query = {};
        
        if (batch) query.batch = batch;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { regno: { $regex: search, $options: 'i' } }
            ];
        }
        
        const members = await User.find(query).select('-password').sort({ name: 1 });
        res.json({ members, count: members.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// Get single member
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const member = await User.findById(req.params.id).select('-password');
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update member
router.put('/:id', adminAuth, async (req, res) => {
    try {
        // Prevent password update through this route
        const { password, ...updateData } = req.body;
        const member = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json({ message: 'Member updated successfully', member });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete member
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const member = await User.findByIdAndDelete(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get member stats
router.get('/stats/overview', adminAuth, async (req, res) => {
    try {
        const totalMembers = await User.countDocuments();
        const verifiedMembers = await User.countDocuments({ isverified: true });
        const batchStats = await User.aggregate([
            { $group: { _id: '$batch', count: { $sum: 1 } } }
        ]);
        
        res.json({ totalMembers, verifiedMembers, batchStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;