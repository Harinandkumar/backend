const express = require('express');
const router = express();
const { User } = require('../schemas/schema');
const { adminAuth } = require('../middleware/auth');

// Get all members
router.get('/members', adminAuth, async (req, res) => {
    try {
        const members = await User.find().sort({ name: 1 });
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/:id', adminAuth, async (req, res) => {
    try {
        const member = await User.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.put('/:id', adminAuth, async (req, res) => {
    try {
        const member = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(member);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.delete('/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
