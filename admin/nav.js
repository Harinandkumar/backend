const express = require('express');
const router = express.Router();
const NavItem = require('../schemas/navItem');
const { adminAuth } = require('../middleware/auth');

// Get all nav items (Admin)
router.get('/nav-items', adminAuth, async (req, res) => {
    try {
        const items = await NavItem.find().sort({ order: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create nav item (Admin)
router.post('/nav-items', adminAuth, async (req, res) => {
    try {
        const { name, link, icon, badge, target } = req.body;
        
        if (!name || !link) {
            return res.status(400).json({ message: 'Name and link are required' });
        }
        
        const count = await NavItem.countDocuments();
        const navItem = new NavItem({
            name,
            link,
            icon: icon || 'fa-link',
            badge: badge || 'none',
            target: target || '_self',
            order: count
        });
        
        await navItem.save();
        res.status(201).json({ message: 'Nav item created successfully', navItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update nav item (Admin)
router.put('/nav-items/:id', adminAuth, async (req, res) => {
    try {
        const { name, link, icon, badge, target, isActive } = req.body;
        const item = await NavItem.findByIdAndUpdate(
            req.params.id,
            { name, link, icon, badge, target, isActive },
            { new: true }
        );
        if (!item) return res.status(404).json({ message: 'Nav item not found' });
        res.json({ message: 'Nav item updated successfully', item });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete nav item (Admin)
router.delete('/nav-items/:id', adminAuth, async (req, res) => {
    try {
        const item = await NavItem.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Nav item not found' });
        res.json({ message: 'Nav item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reorder nav items (Admin)
router.put('/nav-items/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body;
        for (let i = 0; i < items.length; i++) {
            await NavItem.findByIdAndUpdate(items[i]._id, { order: i });
        }
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Public route - get active nav items (No auth required)
router.get('/public/nav-items', async (req, res) => {
    try {
        const items = await NavItem.find({ isActive: true }).sort({ order: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;