const express = require('express');
const router = express.Router();
const WorkAssignment = require('../schemas/workAssignment');
const TeamMember = require('../schemas/teamMember');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');

// Get all works (Super Admin only)
router.get('/all', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { status, priority, assignedTo } = req.query;
        let query = {};
        
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assignedTo = assignedTo;
        
        const works = await WorkAssignment.find(query)
            .populate('assignedTo', 'name email position')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({ works, count: works.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get my works (Team member)
router.get('/my', teamAuth, async (req, res) => {
    try {
        const works = await WorkAssignment.find({ assignedTo: req.teamMember._id })
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });
        
        // Get counts
        const pending = works.filter(w => w.status === 'pending').length;
        const inProgress = works.filter(w => w.status === 'in_progress').length;
        const completed = works.filter(w => w.status === 'completed').length;
        
        res.json({ works, stats: { pending, inProgress, completed, total: works.length } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Assign work (Super Admin only)
router.post('/assign', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { title, description, assignedTo, category, priority, dueDate, remarks, attachments } = req.body;
        
        if (!title || !description || !assignedTo) {
            return res.status(400).json({ message: 'Title, description and assignedTo are required' });
        }
        
        // Check if assigned member exists
        const member = await TeamMember.findById(assignedTo);
        if (!member) {
            return res.status(404).json({ message: 'Assigned member not found' });
        }
        
        const work = new WorkAssignment({
            title,
            description,
            assignedTo,
            assignedBy: req.teamMember._id,
            category: category || 'other',
            priority: priority || 'medium',
            dueDate: dueDate || null,
            remarks: remarks || '',
            attachments: attachments || [],
            status: 'pending'
        });
        
        await work.save();
        
        // TODO: Send email notification to assigned member
        // await sendWorkAssignedEmail(member.email, work);
        
        res.status(201).json({ message: 'Work assigned successfully', work });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update work status (Team member can update own assigned work)
router.put('/:id/status', teamAuth, async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const work = await WorkAssignment.findById(req.params.id);
        
        if (!work) return res.status(404).json({ message: 'Work not found' });
        
        // Check if member is assigned to this work or is super admin
        if (work.assignedTo.toString() !== req.teamMember._id.toString() && req.teamMember.role !== 'super_admin') {
            return res.status(403).json({ message: 'You are not authorized to update this work' });
        }
        
        work.status = status || work.status;
        if (remarks) work.remarks = remarks;
        if (status === 'completed') work.completedAt = new Date();
        work.updatedAt = new Date();
        
        await work.save();
        res.json({ message: 'Work status updated', work });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update work (Super Admin only)
router.put('/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { title, description, category, priority, dueDate, remarks, attachments } = req.body;
        const work = await WorkAssignment.findById(req.params.id);
        
        if (!work) return res.status(404).json({ message: 'Work not found' });
        
        if (title) work.title = title;
        if (description) work.description = description;
        if (category) work.category = category;
        if (priority) work.priority = priority;
        if (dueDate) work.dueDate = dueDate;
        if (remarks) work.remarks = remarks;
        if (attachments) work.attachments = attachments;
        work.updatedAt = new Date();
        
        await work.save();
        res.json({ message: 'Work updated successfully', work });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete work (Super Admin only)
router.delete('/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const work = await WorkAssignment.findById(req.params.id);
        if (!work) return res.status(404).json({ message: 'Work not found' });
        
        await WorkAssignment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Work deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get work statistics (Super Admin only)
router.get('/stats/overview', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const total = await WorkAssignment.countDocuments();
        const pending = await WorkAssignment.countDocuments({ status: 'pending' });
        const inProgress = await WorkAssignment.countDocuments({ status: 'in_progress' });
        const completed = await WorkAssignment.countDocuments({ status: 'completed' });
        const highPriority = await WorkAssignment.countDocuments({ priority: 'high', status: { $ne: 'completed' } });
        
        // Member-wise stats
        const memberStats = await WorkAssignment.aggregate([
            { $group: {
                _id: '$assignedTo',
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
            }},
            { $lookup: { from: 'teammembers', localField: '_id', foreignField: '_id', as: 'member' } },
            { $unwind: '$member' },
            { $project: { memberName: '$member.name', memberEmail: '$member.email', total: 1, completed: 1, pending: 1 } }
        ]);
        
        res.json({ total, pending, inProgress, completed, highPriority, memberStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;