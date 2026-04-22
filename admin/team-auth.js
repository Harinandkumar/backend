const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TeamMember = require('../schemas/teamMember');
const { sendOTP, verifyOTP } = require('../services/otpService');

// Send OTP for login
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Check if email exists in team members
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

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }
        
        // Verify OTP
        const result = await verifyOTP(email, otp);
        
        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }
        
        // Get team member
        const member = await TeamMember.findOne({ email: email.toLowerCase(), isActive: true });
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        // Update last login
        member.lastLogin = new Date();
        await member.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { memberId: member._id, email: member.email, role: member.role },
            process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
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

// Resend OTP
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

// Logout
router.post('/logout', (req, res) => {
    // Client side will remove token
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;