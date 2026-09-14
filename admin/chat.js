const express = require('express');
const router = express.Router();
const ChatMessage = require('../schemas/chatMessage');
const { teamAuth, isSuperAdmin, hasPermission } = require('../middleware/teamAuth');
const { User } = require('../schemas/schema');

// ========== ADMIN ROUTES ==========

// Get all chat sessions (grouped by visitor)
router.get('/sessions', teamAuth, async (req, res) => {
    try {
        const { status = 'all', search = '', page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build query
        let matchStage = {};
        
        // Group by visitor to get latest message per visitor
        const sessions = await ChatMessage.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$visitorId',
                    lastMessage: { $first: '$message' },
                    lastMessageTime: { $first: '$createdAt' },
                    lastSender: { $first: '$sender' },
                    userName: { $first: '$userName' },
                    userEmail: { $first: '$userEmail' },
                    userId: { $first: '$userId' },
                    totalMessages: { $sum: 1 },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$sender', 'user'] },
                                    { $eq: ['$isRead', false] }
                                ]},
                                1,
                                0
                            ]
                        }
                    },
                    isResolved: { $first: '$isResolved' }
                }
            },
            { $sort: { lastMessageTime: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ]);
        
        // Filter by status
        let filteredSessions = sessions;
        if (status === 'unread') {
            filteredSessions = sessions.filter(s => s.unreadCount > 0);
        } else if (status === 'resolved') {
            filteredSessions = sessions.filter(s => s.isResolved);
        } else if (status === 'unresolved') {
            filteredSessions = sessions.filter(s => !s.isResolved);
        }
        
        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            filteredSessions = filteredSessions.filter(s => 
                (s.userName && s.userName.toLowerCase().includes(searchLower)) ||
                (s.userEmail && s.userEmail.toLowerCase().includes(searchLower)) ||
                (s.lastMessage && s.lastMessage.toLowerCase().includes(searchLower))
            );
        }
        
        // Stats
        const stats = {
            totalSessions: await ChatMessage.distinct('visitorId').then(ids => ids.length),
            totalMessages: await ChatMessage.countDocuments(),
            unreadCount: await ChatMessage.countDocuments({ sender: 'user', isRead: false }),
            todayMessages: await ChatMessage.countDocuments({
                createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
            }),
            activeToday: await ChatMessage.distinct('visitorId', {
                createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
            }).then(ids => ids.length)
        };
        
        res.json({ sessions: filteredSessions, stats });
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get messages for a specific visitor
router.get('/messages/:visitorId', teamAuth, async (req, res) => {
    try {
        const { visitorId } = req.params;
        const { page = 1, limit = 100 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const messages = await ChatMessage.find({ visitorId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        // Mark as read
        await ChatMessage.updateMany(
            { visitorId, sender: 'user', isRead: false },
            { $set: { isRead: true } }
        );
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: error.message });
    }
});

// Send admin reply
router.post('/reply/:visitorId', teamAuth, async (req, res) => {
    try {
        const { visitorId } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }
        
        const chatMessage = new ChatMessage({
            visitorId,
            message: message.trim(),
            sender: 'admin',
            senderName: req.teamMember.name,
            isRead: true
        });
        
        await chatMessage.save();
        
        // ✅ Emit via Socket.io (real-time)
        const io = req.app.get('io');
        if (io) {
            io.to(visitorId).emit('admin-message', {
                message: message.trim(),
                sender: 'admin',
                senderName: req.teamMember.name,
                timestamp: chatMessage.createdAt
            });
        }
        
        res.status(201).json({ 
            message: 'Reply sent successfully', 
            chatMessage 
        });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: error.message });
    }
});

// Mark session as resolved
router.put('/resolve/:visitorId', teamAuth, async (req, res) => {
    try {
        const { visitorId } = req.params;
        const { isResolved } = req.body;
        
        await ChatMessage.updateMany(
            { visitorId },
            { $set: { isResolved: isResolved !== false } }
        );
        
        res.json({ message: 'Session updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete entire chat session
router.delete('/session/:visitorId', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { visitorId } = req.params;
        
        await ChatMessage.deleteMany({ visitorId });
        
        res.json({ message: 'Chat session deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chat analytics
router.get('/analytics', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        // Daily chat counts
        const dailyChats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await ChatMessage.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });
            
            dailyChats.push({
                date: date.toLocaleDateString(),
                count
            });
        }
        
        // Top questions (most common words)
        const botMessages = await ChatMessage.find({ sender: 'bot' }).limit(100);
        
        // Hourly distribution
        const hourlyStats = await ChatMessage.aggregate([
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({ dailyChats, hourlyStats, totalMessages: botMessages.length });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;