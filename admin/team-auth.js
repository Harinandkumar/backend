const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TeamMember = require('../schemas/teamMember');
const { sendOTP, verifyOTP } = require('../services/otpService');
const LoginHistory = require('../schemas/loginHistory');

const getDeviceInfo = (userAgent) => {
    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (userAgent) {
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
            device = 'Mobile';
        } else if (userAgent.includes('iPad')) {
            device = 'Tablet';
        }
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edg')) browser = 'Edge';
        
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac')) os = 'Mac';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iOS')) os = 'iOS';
    }
    
    return { device, browser, os };
};

const generateSessionId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Simple function to log admin action WITHOUT requiring req.teamMember
const logAdminActionSimple = async (adminData, action, options = {}) => {
    try {
        const AdminActivityLog = require('../schemas/adminActivityLog');
        await AdminActivityLog.create({
            adminId: adminData._id,
            adminName: adminData.name,
            adminEmail: adminData.email,
            adminRole: adminData.role,
            action: action,
            actionDetails: options.details || {},
            targetId: options.targetId || null,
            targetModel: options.targetModel || null,
            targetName: options.targetName || null,
            ipAddress: options.ipAddress || 'Unknown',
            userAgent: options.userAgent || 'Unknown',
            device: options.device || 'Desktop',
            browser: options.browser || 'Unknown',
            os: options.os || 'Unknown',
            status: options.status || 'success',
            errorMessage: options.errorMessage || null,
            sessionId: options.sessionId || null
        });
        return true;
    } catch (logError) {
        console.error('Failed to log admin action:', logError);
        return false;
    }
};

router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const member = await TeamMember.findOne({ email: email.toLowerCase(), isActive: true });
        if (!member) {
            return res.status(404).json({ message: 'Email not found in team members' });
        }
        
        const result = await sendOTP(email);
        
        if (result.success) {
            res.json({ message: 'OTP sent to your email', email: email });
        } else {
            res.status(500).json({ message: result.message });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }
        
        const result = await verifyOTP(email, otp);
        
        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }
        
        const member = await TeamMember.findOne({ email: email.toLowerCase(), isActive: true });
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const { device, browser, os } = getDeviceInfo(userAgent);
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const sessionId = generateSessionId();
        
        // Save login history
        try {
            await LoginHistory.create({
                userId: member._id,
                userModel: 'TeamMember',
                name: member.name,
                email: member.email,
                ipAddress: ipAddress,
                userAgent: userAgent,
                device: device,
                browser: browser,
                os: os,
                loginMethod: 'otp',
                status: 'success',
                sessionId: sessionId
            });
            console.log('✅ Team member login history saved for:', member.email);
        } catch (logError) {
            console.error('Failed to save login history:', logError);
        }
        
        // Log admin action - FIXED: Pass member data directly, not req
        try {
            await logAdminActionSimple(member, 'admin_login', {
                details: { method: 'otp', sessionId: sessionId },
                ipAddress: ipAddress,
                userAgent: userAgent,
                device: device,
                browser: browser,
                os: os,
                sessionId: sessionId
            });
            console.log('✅ Admin login activity logged for:', member.email);
        } catch (logError) {
            console.error('Failed to log admin activity:', logError);
        }
        
        member.lastLogin = new Date();
        await member.save();
        
        const token = jwt.sign(
            { memberId: member._id, email: member.email, role: member.role, sessionId: sessionId },
            process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            sessionId: sessionId,
            member: {
                id: member._id,
                name: member.name,
                email: member.email,
                position: member.position,
                role: member.role,
                permissions: member.permissions
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const member = await TeamMember.findOne({ email: email.toLowerCase(), isActive: true });
        if (!member) {
            return res.status(404).json({ message: 'Email not found' });
        }
        
        const result = await sendOTP(email);
        
        if (result.success) {
            res.json({ message: 'OTP resent successfully' });
        } else {
            res.status(500).json({ message: result.message });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let sessionId = null;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET);
                sessionId = decoded.sessionId;
                
                if (sessionId) {
                    await LoginHistory.updateOne(
                        { sessionId: sessionId, logoutTime: null },
                        { logoutTime: new Date() }
                    );
                }
            } catch (e) {
                console.error('Token decode error:', e);
            }
        }
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;