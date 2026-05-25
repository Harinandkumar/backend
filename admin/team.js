const express = require('express');
const router = express.Router();
const TeamMember = require('../schemas/teamMember');
const { Event, User, Notification } = require('../schemas/schema');
const Gallery = require('../schemas/gallery');
const Category = require('../schemas/category');
const NavItem = require('../schemas/navItem');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');
const { sendWelcomeEmailToNewMember } = require('../mailer');
const { logAdminAction } = require('../middleware/logActivity');

router.get('/team-members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const members = await TeamMember.find({}).select('-__v').sort({ createdAt: -1 });
        res.json({ members, count: members.length });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/team-member/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id).select('-__v');
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        res.json(member);
    } catch (error) {
        console.error('Error fetching team member:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/team-members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { name, email, position, role, phone, profileImage, permissions } = req.body;
        
        if (!name || !email || !role) {
            return res.status(400).json({ message: 'Name, email and role are required' });
        }
        
        const existing = await TeamMember.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        let defaultPermissions = {
            events: { create: false, edit: false, delete: false },
            notifications: { create: false, delete: false },
            gallery: { upload: false, delete: false },
            members: { view: false, delete: false },
            categories: { create: false, edit: false, delete: false },
            navItems: { create: false, edit: false, delete: false },
            teamManagement: { view: false, edit: false },
            certificates: { upload: false, delete: false }
        };
        
        if (role === 'core_member') {
            defaultPermissions = {
                events: { create: true, edit: true, delete: true },
                notifications: { create: true, delete: true },
                gallery: { upload: true, delete: true },
                members: { view: true, delete: false },
                categories: { create: true, edit: true, delete: true },
                navItems: { create: true, edit: true, delete: true },
                teamManagement: { view: false, edit: false },
                certificates: { upload: true, delete: true }
            };
        } else if (role === 'coordinator') {
            defaultPermissions = {
                events: { create: false, edit: false, delete: false },
                notifications: { create: true, delete: false },
                gallery: { upload: true, delete: false },
                members: { view: true, delete: false },
                categories: { create: false, edit: false, delete: false },
                navItems: { create: false, edit: false, delete: false },
                teamManagement: { view: false, edit: false },
                certificates: { upload: true, delete: false }
            };
        } else if (role === 'sub_coordinator') {
            defaultPermissions = {
                events: { create: false, edit: false, delete: false },
                notifications: { create: false, delete: false },
                gallery: { upload: false, delete: false },
                members: { view: false, delete: false },
                categories: { create: false, edit: false, delete: false },
                navItems: { create: false, edit: false, delete: false },
                teamManagement: { view: false, edit: false },
                certificates: { upload: false, delete: false }
            };
        }
        
        const finalPermissions = permissions || defaultPermissions;
        
        const member = new TeamMember({
            name,
            email: email.toLowerCase(),
            position: position || (role === 'core_member' ? 'Core Member' : role === 'coordinator' ? 'Coordinator' : 'Sub-Coordinator'),
            role,
            phone: phone || '',
            profileImage: profileImage || '',
            permissions: finalPermissions,
            createdBy: req.teamMember._id,
            isActive: true
        });
        
        await member.save();
        
        await logAdminAction(req, 'team_member_added', {
            targetId: member._id,
            targetModel: 'TeamMember',
            targetName: member.name,
            details: { name: member.name, email: member.email, role: member.role }
        });
        
        try {
            await sendWelcomeEmailToNewMember(email, name, role, finalPermissions, req.teamMember.name);
            console.log('Welcome email sent to:', email);
        } catch (emailError) {
            console.error('Member added but email failed:', emailError.message);
        }
        
        res.status(201).json({ message: 'Team member added successfully. Welcome email sent!', member });
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/team-members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { name, position, role, phone, profileImage, isActive, permissions } = req.body;
        const member = await TeamMember.findById(req.params.id);
        
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        const oldData = { name: member.name, role: member.role, isActive: member.isActive };
        
        if (name) member.name = name;
        if (position) member.position = position;
        if (role) member.role = role;
        if (phone) member.phone = phone;
        if (profileImage) member.profileImage = profileImage;
        if (isActive !== undefined) member.isActive = isActive;
        if (permissions) member.permissions = permissions;
        
        await member.save();
        
        await logAdminAction(req, 'team_member_updated', {
            targetId: member._id,
            targetModel: 'TeamMember',
            targetName: member.name,
            details: { old: oldData, new: { name: member.name, role: member.role, isActive: member.isActive } }
        });
        
        res.json({ message: 'Member updated successfully', member });
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(400).json({ message: error.message });
    }
});

router.delete('/team-members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        if (member._id.toString() === req.teamMember._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }
        
        await logAdminAction(req, 'team_member_deleted', {
            targetId: member._id,
            targetModel: 'TeamMember',
            targetName: member.name,
            details: { name: member.name, email: member.email, role: member.role }
        });
        
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: error.message });
    }
});

router.put('/team-members/:id/permissions', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { permissions } = req.body;
        const member = await TeamMember.findById(req.params.id);
        
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        member.permissions = permissions;
        await member.save();
        
        await logAdminAction(req, 'permission_updated', {
            targetId: member._id,
            targetModel: 'TeamMember',
            targetName: member.name,
            details: { permissions: permissions }
        });
        
        res.json({ message: 'Permissions updated successfully', member });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(400).json({ message: error.message });
    }
});

router.get('/me', teamAuth, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.teamMember._id).select('-__v');
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/users', teamAuth, hasPermission('members', 'view'), async (req, res) => {
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
        const users = await User.find(query).select('-password').sort({ name: 1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message });
    }
});

router.delete('/users/:id', teamAuth, hasPermission('members', 'delete'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await logAdminAction(req, 'member_deleted', {
            targetId: user._id,
            targetModel: 'User',
            targetName: user.name,
            details: { name: user.name, email: user.email, rollno: user.rollno }
        });
        
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/events', teamAuth, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        
        await logAdminAction(req, 'event_created', {
            targetId: event._id,
            targetModel: 'Event',
            targetName: event.name,
            details: { name: event.name, date: event.date, location: event.location, prize: event.prize }
        });
        
        res.status(201).json({ message: "Event created successfully", event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/events/:id', teamAuth, hasPermission('events', 'edit'), async (req, res) => {
    try {
        const oldEvent = await Event.findById(req.params.id);
        if (!oldEvent) return res.status(404).json({ message: 'Event not found' });
        
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        
        await logAdminAction(req, 'event_updated', {
            targetId: event._id,
            targetModel: 'Event',
            targetName: event.name,
            details: { old: { name: oldEvent.name, isOpen: oldEvent.isOpen }, new: { name: event.name, isOpen: event.isOpen } }
        });
        
        res.json({ message: "Event updated successfully", event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/events/:id', teamAuth, hasPermission('events', 'delete'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        await logAdminAction(req, 'event_deleted', {
            targetId: event._id,
            targetModel: 'Event',
            targetName: event.name,
            details: { name: event.name, date: event.date }
        });
        
        await User.updateMany({ 'events.eventId': event._id }, { $pull: { events: { eventId: event._id } } });
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/notifications', teamAuth, async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ date: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        
        await logAdminAction(req, 'notification_created', {
            targetId: notification._id,
            targetModel: 'Notification',
            targetName: notification.title,
            details: { title: notification.title, isPriority: notification.isPriority, badge: notification.badge }
        });
        
        res.status(201).json({ message: "Notification created successfully", notification });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/notifications/:id', teamAuth, hasPermission('notifications', 'delete'), async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        
        await logAdminAction(req, 'notification_deleted', {
            targetId: notification._id,
            targetModel: 'Notification',
            targetName: notification.title,
            details: { title: notification.title }
        });
        
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/gallery', teamAuth, async (req, res) => {
    try {
        const images = await Gallery.find().sort({ uploadDate: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        
        await logAdminAction(req, 'image_uploaded', {
            targetId: galleryImage._id,
            targetModel: 'Gallery',
            targetName: galleryImage.title,
            details: { title: galleryImage.title, category: galleryImage.category, size: galleryImage.size }
        });
        
        res.status(201).json({ message: 'Image uploaded successfully', image: galleryImage });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/gallery/:id', teamAuth, hasPermission('gallery', 'upload'), async (req, res) => {
    try {
        const { title, category } = req.body;
        const oldImage = await Gallery.findById(req.params.id);
        if (!oldImage) return res.status(404).json({ message: 'Image not found' });
        
        const image = await Gallery.findByIdAndUpdate(req.params.id, { title, category }, { new: true });
        
        await logAdminAction(req, 'image_updated', {
            targetId: image._id,
            targetModel: 'Gallery',
            targetName: image.title,
            details: { old: { title: oldImage.title, category: oldImage.category }, new: { title: title, category: category } }
        });
        
        res.json({ message: 'Image updated successfully', image });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/gallery/:id', teamAuth, hasPermission('gallery', 'delete'), async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id);
        if (!image) return res.status(404).json({ message: 'Image not found' });
        
        await logAdminAction(req, 'image_deleted', {
            targetId: image._id,
            targetModel: 'Gallery',
            targetName: image.title,
            details: { title: image.title, category: image.category }
        });
        
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(image.publicId);
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/categories', teamAuth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/categories', teamAuth, hasPermission('categories', 'create'), async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });
        const existing = await Category.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Category already exists' });
        const category = new Category({ name, icon, color });
        await category.save();
        
        await logAdminAction(req, 'category_created', {
            targetId: category._id,
            targetModel: 'Category',
            targetName: category.name,
            details: { name: category.name, icon: category.icon, color: category.color }
        });
        
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/categories/:id', teamAuth, hasPermission('categories', 'edit'), async (req, res) => {
    try {
        const { name, icon, color, isActive } = req.body;
        const oldCategory = await Category.findById(req.params.id);
        if (!oldCategory) return res.status(404).json({ message: 'Category not found' });
        
        const category = await Category.findByIdAndUpdate(req.params.id, { name, icon, color, isActive }, { new: true });
        
        await logAdminAction(req, 'category_updated', {
            targetId: category._id,
            targetModel: 'Category',
            targetName: category.name,
            details: { old: { name: oldCategory.name }, new: { name: name, isActive: isActive } }
        });
        
        res.json({ message: 'Category updated', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/categories/:id', teamAuth, hasPermission('categories', 'delete'), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        const imagesUsing = await Gallery.countDocuments({ category: category.name });
        if (imagesUsing > 0) {
            return res.status(400).json({ message: `Cannot delete: ${imagesUsing} images are using this category` });
        }
        
        await logAdminAction(req, 'category_deleted', {
            targetId: category._id,
            targetModel: 'Category',
            targetName: category.name,
            details: { name: category.name }
        });
        
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/nav-items', teamAuth, async (req, res) => {
    try {
        const items = await NavItem.find().sort({ order: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        
        await logAdminAction(req, 'nav_created', {
            targetId: navItem._id,
            targetModel: 'NavItem',
            targetName: navItem.name,
            details: { name: navItem.name, link: navItem.link, badge: navItem.badge }
        });
        
        res.status(201).json({ message: 'Nav item created successfully', navItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/nav-items/:id', teamAuth, hasPermission('navItems', 'edit'), async (req, res) => {
    try {
        const { name, link, icon, badge, target, isActive } = req.body;
        const oldItem = await NavItem.findById(req.params.id);
        if (!oldItem) return res.status(404).json({ message: 'Nav item not found' });
        
        const item = await NavItem.findByIdAndUpdate(req.params.id, { name, link, icon, badge, target, isActive }, { new: true });
        
        await logAdminAction(req, 'nav_updated', {
            targetId: item._id,
            targetModel: 'NavItem',
            targetName: item.name,
            details: { old: { name: oldItem.name }, new: { name: name, isActive: isActive } }
        });
        
        res.json({ message: 'Nav item updated successfully', item });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/nav-items/:id', teamAuth, hasPermission('navItems', 'delete'), async (req, res) => {
    try {
        const item = await NavItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Nav item not found' });
        
        await logAdminAction(req, 'nav_deleted', {
            targetId: item._id,
            targetModel: 'NavItem',
            targetName: item.name,
            details: { name: item.name, link: item.link }
        });
        
        await NavItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Nav item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/nav-items/reorder', teamAuth, hasPermission('navItems', 'edit'), async (req, res) => {
    try {
        const { items } = req.body;
        for (let i = 0; i < items.length; i++) {
            await NavItem.findByIdAndUpdate(items[i]._id, { order: i });
        }
        
        await logAdminAction(req, 'nav_reordered', {
            details: { itemCount: items.length }
        });
        
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;