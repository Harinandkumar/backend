const express = require('express');
const router = express.Router();
const TeamMember = require('../schemas/teamMember');
const { Event, User, Notification } = require('../schemas/schema');
const Gallery = require('../schemas/gallery');
const Category = require('../schemas/category');
const NavItem = require('../schemas/navItem');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');

// ========== TEAM MEMBERS MANAGEMENT ==========
// Get all team members (Super Admin only)
router.get('/members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const members = await TeamMember.find({}).select('-__v').sort({ createdAt: -1 });
        res.json({ members, count: members.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new team member (Super Admin only)
router.post('/members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { name, email, position, role, phone, profileImage, permissions } = req.body;
        const existing = await TeamMember.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'Email already exists' });
        
        let defaultPermissions = {
            events: { create: false, edit: false, delete: false },
            notifications: { create: false, delete: false },
            gallery: { upload: false, delete: false },
            members: { view: false, delete: false },
            categories: { create: false, edit: false, delete: false },
            navItems: { create: false, edit: false, delete: false },
            teamManagement: { view: false, edit: false }
        };
        
        if (role === 'core_member') {
            defaultPermissions = {
                events: { create: true, edit: true, delete: true },
                notifications: { create: true, delete: true },
                gallery: { upload: true, delete: true },
                members: { view: true, delete: false },
                categories: { create: true, edit: true, delete: true },
                navItems: { create: true, edit: true, delete: true },
                teamManagement: { view: false, edit: false }
            };
        } else if (role === 'coordinator') {
            defaultPermissions = {
                events: { create: false, edit: false, delete: false },
                notifications: { create: true, delete: false },
                gallery: { upload: true, delete: false },
                members: { view: true, delete: false },
                categories: { create: false, edit: false, delete: false },
                navItems: { create: false, edit: false, delete: false },
                teamManagement: { view: false, edit: false }
            };
        }
        
        const finalPermissions = permissions || defaultPermissions;
        const member = new TeamMember({
            name, email: email.toLowerCase(),
            position: position || (role === 'core_member' ? 'Core Member' : role === 'coordinator' ? 'Coordinator' : 'Sub-Coordinator'),
            role, phone: phone || '', profileImage: profileImage || '',
            permissions: finalPermissions, createdBy: req.teamMember._id, isActive: true
        });
        await member.save();
        res.status(201).json({ message: 'Team member added successfully', member });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update team member
router.put('/members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { name, position, role, phone, profileImage, isActive, permissions } = req.body;
        const member = await TeamMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        if (name) member.name = name;
        if (position) member.position = position;
        if (role) member.role = role;
        if (phone) member.phone = phone;
        if (profileImage) member.profileImage = profileImage;
        if (isActive !== undefined) member.isActive = isActive;
        if (permissions) member.permissions = permissions;
        await member.save();
        res.json({ message: 'Member updated successfully', member });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete team member
router.delete('/members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        if (member._id.toString() === req.teamMember._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current team member profile
router.get('/me', teamAuth, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.teamMember._id).select('-__v');
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== EVENTS MANAGEMENT (For Dashboard) ==========
// Get all events
router.get('/events', teamAuth, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create event (requires permission)
router.post('/events/create', teamAuth, hasPermission('events', 'create'), async (req, res) => {
    try {
        const { name, imagelink, date, location, prize, pdflink, description, isOpen } = req.body;
        if (!name || !imagelink || !date || !location || !prize || !pdflink || !description) {
            return res.status(400).json({ message: "All required fields must be filled" });
        }
        const event = new Event({
            name, imagelink, date, location, prize, pdflink, description,
            isOpen: isOpen !== undefined ? isOpen : true, participants: [], participantsCount: 0
        });
        await event.save();
        res.status(201).json({ message: "Event created successfully", event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update event (requires permission)
router.put('/events/:id', teamAuth, hasPermission('events', 'edit'), async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: "Event updated successfully", event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete event (requires permission)
router.delete('/events/:id', teamAuth, hasPermission('events', 'delete'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        await User.updateMany({ 'events.eventId': event._id }, { $pull: { events: { eventId: event._id } } });
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== MEMBERS MANAGEMENT (User CRUD) ==========
// Get all members (requires permission)
router.get('/members-list', teamAuth, hasPermission('members', 'view'), async (req, res) => {
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
        res.status(500).json({ message: error.message });
    }
});

// Delete member (regular user) - requires permission
router.delete('/members/:id', teamAuth, hasPermission('members', 'delete'), async (req, res) => {
    try {
        const member = await User.findByIdAndDelete(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== NOTIFICATIONS MANAGEMENT ==========
// Get all notifications
router.get('/notifications', teamAuth, async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ date: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create notification (requires permission)
router.post('/notifications/create', teamAuth, hasPermission('notifications', 'create'), async (req, res) => {
    try {
        const { title, message, isPriority, badge, button1Text, button1Link, button2Text, button2Link } = req.body;
        if (!title || !message) return res.status(400).json({ message: "Title and message are required" });
        const notification = new Notification({
            title, message, date: new Date(), isPriority: isPriority || false,
            badge: badge || 'none', button1Text: button1Text || '', button1Link: button1Link || '',
            button2Text: button2Text || '', button2Link: button2Link || ''
        });
        await notification.save();
        res.status(201).json({ message: "Notification created successfully", notification });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete notification (requires permission)
router.delete('/notifications/:id', teamAuth, hasPermission('notifications', 'delete'), async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== GALLERY MANAGEMENT ==========
// Get all gallery images
router.get('/gallery', teamAuth, async (req, res) => {
    try {
        const images = await Gallery.find().sort({ uploadDate: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Upload image (requires permission)
const { upload } = require('../config/cloudinary');
router.post('/gallery/upload', teamAuth, hasPermission('gallery', 'upload'), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const galleryImage = new Gallery({
            title: req.body.title || 'Untitled', cloudinaryUrl: req.file.path, publicId: req.file.filename,
            category: req.body.category || 'events', format: req.file.format, size: req.file.size,
            width: req.file.width, height: req.file.height
        });
        await galleryImage.save();
        res.status(201).json({ message: 'Image uploaded successfully', image: galleryImage });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update image (requires permission)
router.put('/gallery/:id', teamAuth, hasPermission('gallery', 'upload'), async (req, res) => {
    try {
        const { title, category } = req.body;
        const image = await Gallery.findByIdAndUpdate(req.params.id, { title, category }, { new: true });
        if (!image) return res.status(404).json({ message: 'Image not found' });
        res.json({ message: 'Image updated successfully', image });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete image (requires permission)
router.delete('/gallery/:id', teamAuth, hasPermission('gallery', 'delete'), async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id);
        if (!image) return res.status(404).json({ message: 'Image not found' });
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(image.publicId);
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== CATEGORIES MANAGEMENT ==========
// Get all categories
router.get('/categories', teamAuth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create category (requires permission)
router.post('/categories', teamAuth, hasPermission('categories', 'create'), async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });
        const existing = await Category.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Category already exists' });
        const category = new Category({ name, icon, color });
        await category.save();
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update category (requires permission)
router.put('/categories/:id', teamAuth, hasPermission('categories', 'edit'), async (req, res) => {
    try {
        const { name, icon, color, isActive } = req.body;
        const category = await Category.findByIdAndUpdate(req.params.id, { name, icon, color, isActive }, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category updated', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete category (requires permission)
router.delete('/categories/:id', teamAuth, hasPermission('categories', 'delete'), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        const imagesUsing = await Gallery.countDocuments({ category: category.name });
        if (imagesUsing > 0) {
            return res.status(400).json({ message: `Cannot delete: ${imagesUsing} images are using this category` });
        }
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== NAVIGATION ITEMS MANAGEMENT ==========
// Get all nav items
router.get('/nav-items', teamAuth, async (req, res) => {
    try {
        const items = await NavItem.find().sort({ order: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create nav item (requires permission)
router.post('/nav-items', teamAuth, hasPermission('navItems', 'create'), async (req, res) => {
    try {
        const { name, link, icon, badge, target } = req.body;
        if (!name || !link) return res.status(400).json({ message: 'Name and link are required' });
        const count = await NavItem.countDocuments();
        const navItem = new NavItem({
            name, link, icon: icon || 'fa-link', badge: badge || 'none',
            target: target || '_self', order: count
        });
        await navItem.save();
        res.status(201).json({ message: 'Nav item created successfully', navItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update nav item (requires permission)
router.put('/nav-items/:id', teamAuth, hasPermission('navItems', 'edit'), async (req, res) => {
    try {
        const { name, link, icon, badge, target, isActive } = req.body;
        const item = await NavItem.findByIdAndUpdate(req.params.id, { name, link, icon, badge, target, isActive }, { new: true });
        if (!item) return res.status(404).json({ message: 'Nav item not found' });
        res.json({ message: 'Nav item updated successfully', item });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete nav item (requires permission)
router.delete('/nav-items/:id', teamAuth, hasPermission('navItems', 'delete'), async (req, res) => {
    try {
        const item = await NavItem.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Nav item not found' });
        res.json({ message: 'Nav item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reorder nav items
router.put('/nav-items/reorder', teamAuth, hasPermission('navItems', 'edit'), async (req, res) => {
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

module.exports = router;