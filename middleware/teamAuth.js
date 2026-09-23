const jwt = require('jsonwebtoken');
const TeamMember = require('../schemas/teamMember');

// Team member authentication middleware (OTP based)
const teamAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decoded = jwt.verify(token, process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET);
        const member = await TeamMember.findById(decoded.memberId).select('-password');
        
        if (!member) {
            return res.status(401).json({ message: 'Unauthorized: Member not found' });
        }
        
        if (!member.isActive) {
            return res.status(401).json({ message: 'Unauthorized: Account is disabled' });
        }
        
        req.teamMember = member;
        next();
    } catch (error) {
        console.error('Team auth error:', error);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

// Check if user is Super Admin (only super_admin — strict)
const isSuperAdmin = (req, res, next) => {
    if (req.teamMember.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    next();
};

// ✅ NEW: Check if user is Super Admin OR Super Admin 2 (for general admin access)
const isSuperAdminOrSuperAdmin2 = (req, res, next) => {
    if (req.teamMember.role !== 'super_admin' && req.teamMember.role !== 'super_admin_2') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    next();
};

// Check specific permission
const hasPermission = (module, action) => {
    return (req, res, next) => {
        const permissions = req.teamMember.permissions;
        
        // ✅ Super Admin — has ALL permissions
        if (req.teamMember.role === 'super_admin') {
            return next();
        }
        
        // ✅ Super Admin 2 — has ALL permissions EXCEPT teamManagement
        if (req.teamMember.role === 'super_admin_2') {
            if (module === 'teamManagement') {
                return res.status(403).json({ 
                    message: 'Access denied. Super Admin 2 cannot manage team.' 
                });
            }
            return next();
        }
        
        // Check permission for other roles
        if (permissions[module] && permissions[module][action] === true) {
            return next();
        }
        
        return res.status(403).json({ 
            message: `Access denied. You don't have permission to ${action} ${module}.` 
        });
    };
};

module.exports = { 
    teamAuth, 
    isSuperAdmin, 
    isSuperAdminOrSuperAdmin2,   // ✅ NEW
    hasPermission 
};