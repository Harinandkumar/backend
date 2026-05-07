const nodemailer = require('nodemailer');
require('dotenv').config();

// ========== BREVO SMTP TRANSPORTER ==========
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_HOST || 'smtp-relay.sendinblue.com',
    port: parseInt(process.env.BREVO_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
    },
    tls: { ciphers: 'SSLv3' },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
});

const FROM_EMAIL = process.env.BREVO_FROM || process.env.BREVO_USER;

// ========== Email Verification ==========
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/email_verify.html?token=${token}`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: 'Verify Your Email - Creative Coding Community',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #00f0ff;">Welcome!</h2><p>Verify your email: <a href="${verificationLink}">Click here</a></p><p>${verificationLink}</p><p>Expires in 24 hours.</p></div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

// ========== OTP Email for Team Login ==========
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: '🔐 Your C3 Admin Login OTP',
        html: `<div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;"><h2 style="text-align: center; color: #00f0ff;">C3 Community</h2><h3 style="text-align: center;">Login OTP</h3><div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #f0f0f0; padding: 20px; border-radius: 12px;">${otp}</div><p style="text-align: center;">Valid for 5 minutes.</p><hr><p style="text-align: center; font-size: 11px;">C3 Community - GEC Samastipur</p></div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP email sent to:', email);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
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
        subject: `📋 New Work: ${title} - C3 Community`,
        html: `<div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #00f0ff;"><h2 style="color: #00f0ff;">📋 New Task!</h2><div><h3>${title}</h3><p>${description}</p><div><p><strong>Priority:</strong> <span style="color: ${priorityColor};">${priorityText}</span></p>${dueDate ? `<p><strong>Due:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}<p><strong>By:</strong> ${assignedByName}</p></div></div><div><a href="${dashboardLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">View Task</a></div></div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending work assigned email:', error);
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
        html: `<div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #10b981;"><h2 style="color: #10b981;">✅ Task Completed!</h2><div><h3>${title}</h3><div><p><strong>By:</strong> ${completedByName} (${completedByEmail})</p>${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}<p><strong>At:</strong> ${new Date().toLocaleString()}</p></div></div><div><a href="${adminLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">Go to Dashboard</a></div></div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending work completed email:', error);
        return false;
    }
};

// ========== New Member Welcome Email ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-login.html`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: '🎉 Welcome to C3 Admin Team!',
        html: `<div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 2px solid #00f0ff;"><h2 style="color: #00f0ff;">Welcome, ${name}! 🎉</h2><div><p>You are added as <strong>${position}</strong> in C3 Admin Team.</p><p>Login with OTP using your email.</p></div><div><a href="${loginLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">Login</a></div></div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
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