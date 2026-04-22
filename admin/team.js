const express = require('express');
const router = express.Router();
const TeamMember = require('../schemas/teamMember');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');

// Get all team members (Super Admin only)
router.get('/members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const members = await TeamMember.find({})
            .select('-__v')
            .sort({ createdAt: -1 });
        res.json({ members, count: members.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single team member
router.get('/members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id).select('-__v');
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new team member (Super Admin only)
router.post('/members', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { name, email, position, role, phone, profileImage, permissions } = req.body;
        
        // Check if email already exists
        const existing = await TeamMember.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Default permissions based on role
        let defaultPermissions = {
            events: { create: false, edit: false, delete: false },
            notifications: { create: false, delete: false },
            gallery: { upload: false, delete: false },
            members: { view: false, delete: false },
            categories: { create: false, edit: false, delete: false },
            navItems: { create: false, edit: false, delete: false },
            teamManagement: { view: false, edit: false }
        };
        
        // Set default permissions based on role
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
        
        // Merge with provided permissions
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
        res.status(201).json({ message: 'Team member added successfully', member });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

// Update team member (Super Admin only)
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

// Delete team member (Super Admin only)
router.delete('/members/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        
        // Prevent deleting self
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

// Update own profile (limited fields)
router.put('/me', teamAuth, async (req, res) => {
    try {
        const { phone, profileImage } = req.body;
        const member = await TeamMember.findById(req.teamMember._id);
        
        if (phone) member.phone = phone;
        if (profileImage) member.profileImage = profileImage;
        
        await member.save();
        res.json({ message: 'Profile updated successfully', member });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;