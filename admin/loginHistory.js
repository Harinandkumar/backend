const express = require('express');
const router = express.Router();
const LoginHistory = require('../schemas/loginHistory');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');
const { userAuth } = require('../middleware/auth');

// ========== USER ROUTES (Normal User ke liye) ==========
router.get('/my', userAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID not found' });
        }
        
        const history = await LoginHistory.find({ 
            userId: userId,
            userModel: 'User'
        }).sort({ loginTime: -1 }).limit(100);
        
        res.json(history);
    } catch (error) {
        console.error('Error fetching user login history:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== TEAM MEMBER ROUTE ==========
router.get('/team/my', teamAuth, async (req, res) => {
    try {
        const userId = req.teamMember._id;
        
        const history = await LoginHistory.find({ 
            userId: userId,
            userModel: 'TeamMember'
        }).sort({ loginTime: -1 }).limit(100);
        
        res.json(history);
    } catch (error) {
        console.error('Error fetching team login history:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== ADMIN ROUTES (Super Admin only) ==========
router.get('/all', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { email, startDate, endDate, limit = 100 } = req.query;
        let query = {};
        
        if (email) {
            query.email = { $regex: email, $options: 'i' };
        }
        
        if (startDate) {
            query.loginTime = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
            query.loginTime = { ...query.loginTime, $lte: new Date(endDate) };
        }
        
        const history = await LoginHistory.find(query)
            .sort({ loginTime: -1 })
            .limit(parseInt(limit));
        
        const stats = {
            total: await LoginHistory.countDocuments(),
            today: await LoginHistory.countDocuments({
                loginTime: { $gte: new Date().setHours(0, 0, 0, 0) }
            }),
            thisWeek: await LoginHistory.countDocuments({
                loginTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        };
        
        res.json({ history, stats });
    } catch (error) {
        console.error('Error fetching all login history:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get login stats (Super Admin only)
router.get('/stats', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await LoginHistory.countDocuments({
                loginTime: { $gte: date, $lt: nextDate }
            });
            
            last7Days.push({
                date: date.toLocaleDateString(),
                count
            });
        }
        
        const topUsers = await LoginHistory.aggregate([
            { $group: { _id: '$email', name: { $first: '$name' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({ last7Days, topUsers });
    } catch (error) {
        console.error('Error fetching login stats:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;