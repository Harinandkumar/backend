const https = require('https');
require('dotenv').config();

// ========== BREVO API DIRECT (WORKING VERSION) ==========
const sendBrevoEmail = async (toEmail, subject, htmlContent, retryCount = 0) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.BREVO_API_KEY;
        
        if (!apiKey) {
            console.error('❌ BREVO_API_KEY not found');
            return reject(new Error('BREVO_API_KEY missing'));
        }
        
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
        
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
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
                    
                    // Retry once if failed
                    if (retryCount === 0) {
                        console.log('🔄 Retrying...');
                        setTimeout(() => {
                            sendBrevoEmail(toEmail, subject, htmlContent, retryCount + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 2000);
                    } else {
                        reject(new Error(`Brevo API error: ${res.statusCode}`));
                    }
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Brevo request error:', error);
            
            // Retry once if failed
            if (retryCount === 0) {
                console.log('🔄 Retrying...');
                setTimeout(() => {
                    sendBrevoEmail(toEmail, subject, htmlContent, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                }, 2000);
            } else {
                reject(error);
            }
        });
        
        req.on('timeout', () => {
            req.destroy();
            console.error('❌ Request timeout');
            
            if (retryCount === 0) {
                console.log('🔄 Retrying...');
                setTimeout(() => {
                    sendBrevoEmail(toEmail, subject, htmlContent, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                }, 2000);
            } else {
                reject(new Error('Request timeout'));
            }
        });
        
        req.write(postData);
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

// ========== OTP Email for Team Login ==========
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
    const dashboardLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-dashboard.html`;
    const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#10b981';
    const priorityText = priority === 'high' ? '🔴 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00f0ff; border-radius: 16px;">
            <h2 style="color: #00f0ff;">📋 New Task Assigned to You!</h2>
            <h3>${title}</h3>
            <p>${description}</p>
            <p><strong>Priority:</strong> <span style="color: ${priorityColor};">${priorityText}</span></p>
            ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
            <p><strong>Assigned By:</strong> ${assignedByName}</p>
            <a href="${dashboardLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, `📋 New Work Assigned: ${title} - C3 Community`, html);
        return true;
    } catch (error) {
        console.error('❌ sendWorkAssignedEmail failed:', error.message);
        return false;
    }
};

// ========== Work Completed Notification ==========
const sendWorkCompletedEmail = async (adminEmail, workDetails) => {
    const { title, completedByName, completedByEmail, remarks } = workDetails;
    const adminLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-dashboard.html`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 16px;">
            <h2 style="color: #10b981;">✅ Task Completed!</h2>
            <h3>${title}</h3>
            <p><strong>Completed By:</strong> ${completedByName} (${completedByEmail})</p>
            ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
            <a href="${adminLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(adminEmail, `✅ Work Completed: ${title} - C3 Community`, html);
        return true;
    } catch (error) {
        console.error('❌ sendWorkCompletedEmail failed:', error.message);
        return false;
    }
};

// ========== New Member Welcome (Simple) ==========
const sendNewMemberEmail = async (email, name, position) => {
    const loginLink = `${process.env.FRONTEND_URL || 'https://c3community.netlify.app'}/admin-login.html`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 16px;">
            <h2 style="color: #00f0ff;">Welcome to the Team, ${name}! 🎉</h2>
            <p>You have been added as <strong>${position}</strong> in the C3 Admin Team.</p>
            <p>Login with OTP using your email.</p>
            <a href="${loginLink}" style="display: inline-block; padding: 12px 30px; background: #00f0ff; color: black; text-decoration: none; border-radius: 8px;">Login to Portal</a>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, `🎉 Welcome to C3 Admin Team, ${name}!`, html);
        return true;
    } catch (error) {
        console.error('❌ sendNewMemberEmail failed:', error.message);
        return false;
    }
};

// ========== Welcome Email for Team Member with Full Details ==========
const sendWelcomeEmailToNewMember = async (email, name, role, permissions, addedBy) => {
    const loginUrl = 'https://c3community.netlify.app/admin-login.html';
    const dashboardUrl = 'https://c3community.netlify.app/admin-dashboard.html';
    
    let roleDisplay = '';
    if (role === 'super_admin') roleDisplay = '👑 Super Admin';
    else if (role === 'core_member') roleDisplay = '⭐ Core Member';
    else if (role === 'coordinator') roleDisplay = '📋 Coordinator';
    else roleDisplay = '🟢 Sub-Coordinator';
    
    const getPermIcon = (value) => value ? '✅' : '❌';
    
    const permissionsHtml = `
        <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border-radius: 12px; color: #333;">
            <h4 style="color: #00f0ff; margin-bottom: 12px;">📋 Your Access Rights:</h4>
            <div style="margin-bottom: 8px;"><strong>📅 Events:</strong> ${getPermIcon(permissions.events?.create)} Create | ${getPermIcon(permissions.events?.edit)} Edit | ${getPermIcon(permissions.events?.delete)} Delete</div>
            <div style="margin-bottom: 8px;"><strong>🔔 Notifications:</strong> ${getPermIcon(permissions.notifications?.create)} Create | ${getPermIcon(permissions.notifications?.delete)} Delete</div>
            <div style="margin-bottom: 8px;"><strong>📸 Gallery:</strong> ${getPermIcon(permissions.gallery?.upload)} Upload | ${getPermIcon(permissions.gallery?.delete)} Delete</div>
            <div style="margin-bottom: 8px;"><strong>👥 Members:</strong> ${getPermIcon(permissions.members?.view)} View | ${getPermIcon(permissions.members?.delete)} Delete</div>
            <div style="margin-bottom: 8px;"><strong>🏷️ Categories:</strong> ${getPermIcon(permissions.categories?.create)} Create | ${getPermIcon(permissions.categories?.edit)} Edit | ${getPermIcon(permissions.categories?.delete)} Delete</div>
            <div style="margin-bottom: 8px;"><strong>📋 Nav Items:</strong> ${getPermIcon(permissions.navItems?.create)} Create | ${getPermIcon(permissions.navItems?.edit)} Edit | ${getPermIcon(permissions.navItems?.delete)} Delete</div>
        </div>
    `;
    
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 2px solid #00f0ff; border-radius: 20px; background: #fff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #00f0ff;">
                <h2 style="color: #00f0ff;">Creative Coding Community</h2>
                <p style="color: #666;">GEC Samastipur</p>
            </div>
            
            <div style="text-align: center; padding: 20px 0;">
                <h1 style="color: #333;">Welcome ${name}! 🎉</h1>
                <p style="color: #666;">You've been added to the C3 Admin Team</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #00f0ff20, #ff2d7520); padding: 15px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 18px;">Your Role: <strong style="color: #00f0ff;">${roleDisplay}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Added by: ${addedBy || 'Super Admin'}</p>
            </div>
            
            ${permissionsHtml}
            
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #00f0ff; margin-top: 0;">🔐 How to Login</h3>
                <ol style="margin-left: 20px; line-height: 1.8;">
                    <li>Go to: <strong>${loginUrl}</strong></li>
                    <li>Click on <strong>"📧 OTP Login"</strong> tab</li>
                    <li>Enter your email: <strong>${email}</strong></li>
                    <li>Click <strong>"Send OTP"</strong></li>
                    <li>Enter the OTP and click <strong>"Verify & Login"</strong></li>
                </ol>
            </div>
            
            <div style="text-align: center; padding: 15px;">
                <a href="${loginUrl}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00f0ff, #ff2d75); color: white; text-decoration: none; border-radius: 50px;">🔐 Login Now</a>
            </div>
            
            <div style="text-align: center; padding-top: 20px; font-size: 12px; color: #999;">
                <p>Creative Coding Community - GEC Samastipur</p>
                <p>Support: creativecodingcommunity.cs@gmail.com</p>
            </div>
        </div>
    `;
    
    try {
        await sendBrevoEmail(email, `🎉 Welcome to C3 Admin Team, ${name}!`, html);
        console.log('✅ Welcome email sent to:', email);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        return false;
    }
};

// ========== EXPORT ALL FUNCTIONS ==========
module.exports = { 
    sendVerificationEmail,
    sendOTPEmail,
    sendWorkAssignedEmail,
    sendWorkCompletedEmail,
    sendNewMemberEmail,
    sendWelcomeEmailToNewMember
};