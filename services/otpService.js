const OTP = require('../schemas/otp');
const { sendOTPEmail } = require('../mailer');

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
const sendOTP = async (email) => {
    try {
        // Delete any existing unused OTPs for this email
        await OTP.deleteMany({ email: email.toLowerCase(), isUsed: false });
        
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        const otpDoc = new OTP({
            email: email.toLowerCase(),
            otp: otp,
            expiresAt: expiresAt
        });
        
        await otpDoc.save();
        
        // Send email
        const emailSent = await sendOTPEmail(email, otp);
        
        if (!emailSent) {
            throw new Error('Failed to send OTP email');
        }
        
        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Send OTP error:', error);
        return { success: false, message: error.message };
    }
};

// Verify OTP
const verifyOTP = async (email, otp) => {
    try {
        const otpRecord = await OTP.findOne({
            email: email.toLowerCase(),
            otp: otp,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });
        
        if (!otpRecord) {
            return { success: false, message: 'Invalid or expired OTP' };
        }
        
        // Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save();
        
        return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
        console.error('Verify OTP error:', error);
        return { success: false, message: error.message };
    }
};

module.exports = { sendOTP, verifyOTP };