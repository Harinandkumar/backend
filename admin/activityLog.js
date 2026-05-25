const express = require('express');
const router = express.Router();
const AdminActivityLog = require('../schemas/adminActivityLog');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');

// ========== SUPER ADMIN ROUTES ==========
// Get all admin activities
router.get('/all', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { adminId, action, startDate, endDate, limit = 100, page = 1 } = req.query;
        let query = {};
        
        if (adminId) query.adminId = adminId;
        if (action) query.action = action;
        if (startDate) query.createdAt = { $gte: new Date(startDate) };
        if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [logs, total] = await Promise.all([
            AdminActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            AdminActivityLog.countDocuments(query)
        ]);
        
        // Get stats
        const stats = {
            total: await AdminActivityLog.countDocuments(),
            today: await AdminActivityLog.countDocuments({
                createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
            }),
            thisWeek: await AdminActivityLog.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),
            byAction: await AdminActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        };
        
        res.json({ logs, stats, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get my own activity log (for any admin)
router.get('/my', teamAuth, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [logs, total] = await Promise.all([
            AdminActivityLog.find({ adminId: req.teamMember._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            AdminActivityLog.countDocuments({ adminId: req.teamMember._id })
        ]);
        
        res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Error fetching my activity log:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get activity stats (Super Admin only)
router.get('/stats', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        // Daily activity count
        const dailyActivity = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await AdminActivityLog.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });
            
            dailyActivity.push({
                date: date.toLocaleDateString(),
                count
            });
        }
        
        // Top active admins
        const topAdmins = await AdminActivityLog.aggregate([
            { $group: { 
                _id: '$adminId', 
                name: { $first: '$adminName' },
                email: { $first: '$adminEmail' },
                role: { $first: '$adminRole' },
                actionCount: { $sum: 1 }
            } },
            { $sort: { actionCount: -1 } },
            { $limit: 10 }
        ]);
        
        // Most common actions
        const topActions = await AdminActivityLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        
        res.json({ dailyActivity, topAdmins, topActions });
    } catch (error) {
        console.error('Error fetching activity stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// Cleanup old logs (Super Admin only)
router.delete('/cleanup', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { days = 90 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const result = await AdminActivityLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        
        res.json({ 
            message: `Deleted ${result.deletedCount} old activity logs older than ${days} days`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up activity logs:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;