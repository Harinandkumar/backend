const express = require('express');
const router = express();
const { Notification } = require('../schemas/schema');
const { adminAuth } = require('../middleware/auth');

// Create new notification
router.post('/create', adminAuth, async (req, res) => {
    try {
        const notification = new Notification(req.body);
        await notification.save();
        res.status(201).json(notification);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all notifications
router.get('/', adminAuth, async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ date: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update notification
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete notification
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
