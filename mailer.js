const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendVerificationEmail = (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL}/email_verify.html?token=${token}`;
    
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
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

const socket = new WebSocket('ws://localhost:3000');

module.exports = { sendVerificationEmail }; 