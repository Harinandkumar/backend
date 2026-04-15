const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/email_verify.html?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email - Creative Coding Community',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00f0ff;">Welcome to Creative Coding Community!</h2>
                <p>Please verify your email address to complete your registration.</p>
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #00f0ff; 
                          color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                    Verify Now
                </a>
                <p>If the button doesn't work, copy and paste this link in your browser:</p>
                <p>${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = { sendVerificationEmail };