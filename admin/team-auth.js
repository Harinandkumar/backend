const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TeamMember = require('../schemas/teamMember');
const { sendOTP, verifyOTP } = require('../services/otpService');
const LoginHistory = require('../schemas/loginHistory');
const { logAdminAction, generateSessionId } = require('../middleware/logActivity');

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
        
        await logAdminAction(req, 'admin_login', {
            details: { method: 'otp', sessionId: sessionId },
            sessionId: sessionId
        });
        
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
        console.error(error);
        res.status(500).json({ message: 'Server error' });
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
            } catch (e) {}
        }
        
        await logAdminAction(req, 'admin_logout', { details: { sessionId: sessionId } });
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;