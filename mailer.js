const nodemailer = require('nodemailer');
const https = require('https');
require('dotenv').config();

// ========== BREVO API DIRECT (NO SMTP, NO EXTRA PACKAGE) ==========
const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.BREVO_API_KEY;
        
        if (!apiKey) {
            console.error('❌ BREVO_API_KEY not found in environment');
            return reject(new Error('BREVO_API_KEY missing'));
        }
        
        const data = JSON.stringify({
            sender: { email: process.env.BREVO_FROM || 'creativecodingcommunity.cs@gmail.com', name: 'C3 Community' },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: htmlContent
        });
        
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode === 201 || res.statusCode === 200) {
                    console.log('✅ Email sent successfully to:', toEmail);
                    resolve(true);
                } else {
                    console.error('❌ Brevo API error:', res.statusCode, responseData);
                    reject(new Error(`Brevo API error: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Brevo API request error:', error);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
};

// ========== Email Verification (Signup) ==========
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/email_verify.html?token=${token}`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00f0ff;">Welcome to Creative Coding Community!</h2>
            <p>Please verify your email address to complete your registration.</p>
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #00f0ff; 
                      color: #000000; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                Verify Now
            </a>
            <p>If the button doesn't work, copy and paste this link in your browser:</p>
            <p>${verificationLink}</p>
            <p>This link will expire in 24 hours.</p>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, 'Verify Your Email - Creative Coding Community', html);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error.message);
        return false;
    }
};

// ========== OTP Email for Team Login ==========
const sendOTPEmail = async (email, otp) => {
    const html = `
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
    `;
    
    try {
        await sendBrevoEmail(email, '🔐 Your C3 Admin Login OTP - Creative Coding Community', html);
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
    
    const html = `
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
    `;
    
    try {
        await sendBrevoEmail(email, `📋 New Work Assigned: ${title} - C3 Community`, html);
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
    
    const html = `
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
    `;
    
    try {
        await sendBrevoEmail(adminEmail, `✅ Work Completed: ${title} - C3 Community`, html);
        return true;
    } catch (error) {
        console.error('Error sending work completed email:', error.message);
        return false;
    }
};

// ========== New Member Welcome Email ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-login.html`;
    
    const html = `
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
    `;
    
    try {
        await sendBrevoEmail(email, '🎉 Welcome to C3 Admin Team! - Creative Coding Community', html);
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