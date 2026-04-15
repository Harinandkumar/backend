const express = require('express');
const router = express.Router();
const { Notification, User } = require('../schemas/schema');
const { adminAuth } = require('../middleware/auth');

// Create new notification (also push to all users)
router.post('/create', adminAuth, async (req, res) => {
    try {
        const { title, message } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }
        
        const notification = new Notification({ title, message, date: new Date() });
        await notification.save();
        
        // Optional: Push to all users' personal notifications
        // await User.updateMany({}, { $push: { notifications: { title, message, date: new Date() } } });
        
        res.status(201).json({ message: "Notification created successfully", notification });
    } catch (error) {
        console.error(error);
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
        const notification = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: "Notification updated successfully", notification });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete notification
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;