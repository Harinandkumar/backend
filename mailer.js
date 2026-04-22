const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ========== EXISTING - Email Verification ==========
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
        console.log('Verification email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

// ========== NEW - OTP Email for Team Login ==========
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Your C3 Admin Login OTP - Creative Coding Community',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://c3community.netlify.app/assets/img/logowithoutname.png" alt="C3 Logo" style="width: 60px; height: 60px;">
                    <h2 style="color: #00f0ff; margin-top: 10px;">Creative Coding Community</h2>
                </div>
                
                <h3 style="text-align: center; color: #ffffff;">Admin Portal Login OTP</h3>
                
                <div style="text-align: center; padding: 20px; margin: 20px 0;">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #1a1f2d; padding: 20px; border-radius: 12px; color: #00f0ff; font-family: monospace;">
                        ${otp}
                    </div>
                </div>
                
                <p style="text-align: center; color: #a0a0b0;">This OTP is valid for <strong style="color: #00f0ff;">5 minutes</strong>.</p>
                <p style="text-align: center; color: #a0a0b0; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                
                <hr style="border-color: #00f0ff; margin: 20px 0;">
                
                <p style="text-align: center; font-size: 12px; color: #666;">C3 Community - GEC Samastipur</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

// ========== NEW - Work Assignment Email Notification ==========
const sendWorkAssignedEmail = async (email, workDetails) => {
    const { title, description, dueDate, priority, assignedByName } = workDetails;
    
    const dashboardLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-dashboard.html`;
    
    const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#10b981';
    const priorityText = priority === 'high' ? '🔴 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low';
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `📋 New Work Assigned: ${title} - C3 Community`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00f0ff; border-radius: 16px;">
                <div style="text-align: center;">
                    <h2 style="color: #00f0ff;">📋 New Task Assigned!</h2>
                </div>
                
                <div style="background: #1a1f2d; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #00f0ff; margin-bottom: 15px;">${title}</h3>
                    
                    <p style="color: #ffffff; line-height: 1.6;">${description}</p>
                    
                    <div style="margin: 15px 0; padding: 10px; background: #0a0e17; border-radius: 8px;">
                        <p><strong style="color: #00f0ff;">Priority:</strong> <span style="color: ${priorityColor};">${priorityText}</span></p>
                        ${dueDate ? `<p><strong style="color: #00f0ff;">Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                        <p><strong style="color: #00f0ff;">Assigned By:</strong> ${assignedByName}</p>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${dashboardLink}" 
                       style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00f0ff, #ff2d75); 
                              color: #ffffff; text-decoration: none; border-radius: 8px; margin: 10px 0;">
                        View My Tasks
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
                    Login to your dashboard to update task status.
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Work assigned email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending work assigned email:', error);
        return false;
    }
};

// ========== NEW - Work Completed Notification (to Super Admin) ==========
const sendWorkCompletedEmail = async (adminEmail, workDetails) => {
    const { title, completedByName, completedByEmail, remarks } = workDetails;
    
    const adminLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-super-dashboard.html`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `✅ Work Completed: ${title} - C3 Community`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 16px;">
                <div style="text-align: center;">
                    <h2 style="color: #10b981;">✅ Task Completed!</h2>
                </div>
                
                <div style="background: #1a1f2d; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #00f0ff;">${title}</h3>
                    
                    <div style="margin: 15px 0; padding: 10px; background: #0a0e17; border-radius: 8px;">
                        <p><strong style="color: #00f0ff;">Completed By:</strong> ${completedByName} (${completedByEmail})</p>
                        ${remarks ? `<p><strong style="color: #00f0ff;">Remarks:</strong> ${remarks}</p>` : ''}
                        <p><strong style="color: #00f0ff;">Completed At:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${adminLink}" 
                       style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00f0ff, #ff2d75); 
                              color: #ffffff; text-decoration: none; border-radius: 8px; margin: 10px 0;">
                        Go to Admin Dashboard
                    </a>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Work completed email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending work completed email:', error);
        return false;
    }
};

// ========== NEW - New Member Added Notification ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-login.html`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🎉 Welcome to C3 Admin Team! - Creative Coding Community',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
                <div style="text-align: center;">
                    <img src="https://c3community.netlify.app/assets/img/logowithoutname.png" alt="C3 Logo" style="width: 60px; height: 60px;">
                    <h2 style="color: #00f0ff;">Welcome to the Team, ${name}! 🎉</h2>
                </div>
                
                <div style="background: #1a1f2d; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p>You have been added as a <strong style="color: #00f0ff;">${position}</strong> in the C3 Community Admin Team.</p>
                    <p>You can now access the admin portal using OTP login.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${loginLink}" 
                       style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00f0ff, #ff2d75); 
                              color: #ffffff; text-decoration: none; border-radius: 8px; margin: 10px 0;">
                        Login to Admin Portal
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
                    Use your email to receive OTP for login. No password needed!
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('New member welcome email sent:', info.response);
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