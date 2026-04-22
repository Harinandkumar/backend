const TeamMember = require('../schemas/teamMember');

// Generic permission checker for admin routes
const checkTeamPermission = (requiredModule, requiredAction) => {
    return async (req, res, next) => {
        try {
            // Get token from header
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET);
            const member = await TeamMember.findById(decoded.memberId);
            
            if (!member || !member.isActive) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            // Super admin has all permissions
            if (member.role === 'super_admin') {
                req.teamMember = member;
                return next();
            }
            
            // Check specific permission
            const permissions = member.permissions;
            if (permissions[requiredModule] && permissions[requiredModule][requiredAction] === true) {
                req.teamMember = member;
                return next();
            }
            
            return res.status(403).json({ 
                message: `Access denied. You don't have permission to ${requiredAction} ${requiredModule}.` 
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(401).json({ message: 'Unauthorized' });
        }
    };
};

module.exports = { checkTeamPermission };