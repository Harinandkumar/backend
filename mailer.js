const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo');
require('dotenv').config();

// ========== BREVO DEDICATED TRANSPORTER (API Key based) ==========
const transporter = nodemailer.createTransport(
    BrevoTransport({
        apiKey: process.env.BREVO_API_KEY  // API Key, NOT SMTP key!
    })
);

const FROM_EMAIL = process.env.BREVO_FROM || 'creativecodingcommunity.cs@gmail.com';

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Brevo connection FAILED:', error);
    } else {
        console.log('✅ Brevo connection SUCCESS! Ready to send emails.');
    }
});

// ========== Email Verification (Signup) ==========
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/email_verify.html?token=${token}`;
    
    const mailOptions = {
        from: FROM_EMAIL,
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
        console.log('Verification email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error.message);
        return false;
    }
};

// ========== OTP Email for Team Login ==========
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: '🔐 Your C3 Admin Login OTP - Creative Coding Community',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
                <h2 style="text-align: center; color: #00f0ff;">Creative Coding Community</h2>
                <h3 style="text-align: center;">Admin Portal Login OTP</h3>
                
                <div style="text-align: center; padding: 20px; margin: 20px 0;">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #f0f0f0; padding: 20px; border-radius: 12px; color: #00f0ff; font-family: monospace;">
                        ${otp}
                    </div>
                </div>
                
                <p style="text-align: center;">This OTP is valid for <strong>5 minutes</strong>.</p>
                <p style="text-align: center; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                
                <hr style="border-color: #00f0ff;">
                <p style="text-align: center; font-size: 11px;">C3 Community - GEC Samastipur</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent to:', email, 'Message ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error.message);
        return false;
    }
};

// ========== Work Assignment Email ==========
const sendWorkAssignedEmail = async (email, workDetails) => {
    const { title, description, dueDate, priority, assignedByName } = workDetails;
    const dashboardLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-dashboard.html`;
    const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#10b981';
    const priorityText = priority === 'high' ? '🔴 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low';
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: `📋 New Work Assigned: ${title} - C3 Community`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00f0ff; border-radius: 16px;">
                <h2 style="color: #00f0ff;">📋 New Task Assigned!</h2>
                
                <div style="padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #00f0ff;">${title}</h3>
                    <p>${description}</p>
                    
                    <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
                        <p><strong>Priority:</strong> <span style="color: ${priorityColor};">${priorityText}</span></p>
                        ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                        <p><strong>Assigned By:</strong> ${assignedByName}</p>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${dashboardLink}" 
                       style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">
                        View My Tasks
                    </a>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Work assigned email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending work assigned email:', error.message);
        return false;
    }
};

// ========== Work Completed Notification ==========
const sendWorkCompletedEmail = async (adminEmail, workDetails) => {
    const { title, completedByName, completedByEmail, remarks } = workDetails;
    const adminLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-super-dashboard.html`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `✅ Work Completed: ${title} - C3 Community`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 16px;">
                <h2 style="color: #10b981;">✅ Task Completed!</h2>
                
                <div style="padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #00f0ff;">${title}</h3>
                    
                    <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
                        <p><strong>Completed By:</strong> ${completedByName} (${completedByEmail})</p>
                        ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
                        <p><strong>Completed At:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${adminLink}" 
                       style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">
                        Go to Admin Dashboard
                    </a>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Work completed email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending work completed email:', error.message);
        return false;
    }
};

// ========== New Member Welcome Email ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-login.html`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: '🎉 Welcome to C3 Admin Team! - Creative Coding Community',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
                <h2 style="color: #00f0ff;">Welcome to the Team, ${name}! 🎉</h2>
                
                <div style="padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p>You have been added as a <strong style="color: #00f0ff;">${position}</strong> in the C3 Community Admin Team.</p>
                    <p>You can now access the admin portal using OTP login.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${loginLink}" 
                       style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">
                        Login to Admin Portal
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; margin-top: 20px;">
                    Use your email to receive OTP for login. No password needed!
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', email, 'Message ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
        return false;
    }
};

module.exports = { 
    sendVerificationEmail,
    sendOTPEmail,
    sendWorkAssignedEmail,
    sendWorkCompletedEmail,
    sendNewMemberEmail
};