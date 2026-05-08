const https = require('https');
require('dotenv').config();

// ========== BREVO API DIRECT ==========
const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.BREVO_API_KEY;
        
        if (!apiKey) {
            console.error('❌ BREVO_API_KEY not found');
            return reject(new Error('BREVO_API_KEY missing'));
        }
        
        // ✅ CORRECT JSON FORMAT as per Brevo API v3
        const postData = JSON.stringify({
            sender: {
                name: 'C3 Community',
                email: process.env.BREVO_FROM || 'creativecodingcommunity.cs@gmail.com'
            },
            to: [{
                email: toEmail
            }],
            subject: subject,
            htmlContent: htmlContent
        });
        
        console.log('📧 Sending email to:', toEmail);
        console.log('📧 Using API Key:', apiKey.substring(0, 15) + '...');
        
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📧 Brevo Response Status:', res.statusCode);
                
                if (res.statusCode === 201 || res.statusCode === 200) {
                    console.log('✅ Email sent successfully to:', toEmail);
                    resolve(true);
                } else {
                    console.error('❌ Brevo API error:', res.statusCode, data);
                    reject(new Error(`Brevo API error: ${res.statusCode} - ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Brevo request error:', error);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
};

// ========== Email Verification ==========
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/email_verify.html?token=${token}`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00f0ff;">Welcome to Creative Coding Community!</h2>
            <p>Please verify your email address to complete your registration.</p>
            <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #00f0ff; color: #000000; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Now</a>
            <p>Or copy this link: ${verificationLink}</p>
            <p>This link expires in 24 hours.</p>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, 'Verify Your Email - Creative Coding Community', html);
        return true;
    } catch (error) {
        console.error('❌ sendVerificationEmail failed:', error.message);
        return false;
    }
};

// ========== OTP Email ==========
const sendOTPEmail = async (email, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
            <h2 style="text-align: center; color: #00f0ff;">Creative Coding Community</h2>
            <h3 style="text-align: center;">Admin Login OTP</h3>
            <div style="text-align: center; padding: 20px; margin: 20px 0;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #f0f0f0; padding: 20px; border-radius: 12px; color: #00f0ff;">
                    ${otp}
                </div>
            </div>
            <p style="text-align: center;">Valid for <strong>5 minutes</strong>.</p>
            <hr>
            <p style="text-align: center; font-size: 11px;">C3 Community - GEC Samastipur</p>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, '🔐 Your C3 Admin Login OTP', html);
        return true;
    } catch (error) {
        console.error('❌ sendOTPEmail failed:', error.message);
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00f0ff;">
            <h2 style="color: #00f0ff;">📋 New Task Assigned!</h2>
            <h3>${title}</h3>
            <p>${description}</p>
            <p><strong>Priority:</strong> <span style="color: ${priorityColor};">${priorityText}</span></p>
            ${dueDate ? `<p><strong>Due:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
            <p><strong>Assigned By:</strong> ${assignedByName}</p>
            <a href="${dashboardLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">View Task</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, `📋 New Work: ${title}`, html);
        return true;
    } catch (error) {
        console.error('❌ sendWorkAssignedEmail failed:', error.message);
        return false;
    }
};

// ========== Work Completed Notification ==========
const sendWorkCompletedEmail = async (adminEmail, workDetails) => {
    const { title, completedByName, completedByEmail, remarks } = workDetails;
    const adminLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-super-dashboard.html`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981;">
            <h2 style="color: #10b981;">✅ Task Completed!</h2>
            <h3>${title}</h3>
            <p><strong>Completed By:</strong> ${completedByName} (${completedByEmail})</p>
            ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
            <a href="${adminLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">Go to Dashboard</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(adminEmail, `✅ Work Completed: ${title}`, html);
        return true;
    } catch (error) {
        console.error('❌ sendWorkCompletedEmail failed:', error.message);
        return false;
    }
};

// ========== New Member Welcome ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-team-login.html`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff;">
            <h2 style="color: #00f0ff;">Welcome to the Team, ${name}! 🎉</h2>
            <p>You have been added as <strong>${position}</strong> in the C3 Admin Team.</p>
            <p>Login with OTP using your email.</p>
            <a href="${loginLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none;">Login to Portal</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, `🎉 Welcome to C3 Admin Team!`, html);
        return true;
    } catch (error) {
        console.error('❌ sendNewMemberEmail failed:', error.message);
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