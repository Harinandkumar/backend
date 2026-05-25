const AdminActivityLog = require('../schemas/adminActivityLog');

const getDeviceInfo = (userAgent) => {
    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (userAgent?.includes('Mobile') || userAgent?.includes('Android') || userAgent?.includes('iPhone')) {
        device = 'Mobile';
    } else if (userAgent?.includes('iPad')) {
        device = 'Tablet';
    }
    
    if (userAgent?.includes('Chrome')) browser = 'Chrome';
    else if (userAgent?.includes('Firefox')) browser = 'Firefox';
    else if (userAgent?.includes('Safari')) browser = 'Safari';
    else if (userAgent?.includes('Edge')) browser = 'Edge';
    
    if (userAgent?.includes('Windows')) os = 'Windows';
    else if (userAgent?.includes('Mac')) os = 'Mac';
    else if (userAgent?.includes('Linux')) os = 'Linux';
    else if (userAgent?.includes('Android')) os = 'Android';
    else if (userAgent?.includes('iPhone') || userAgent?.includes('iOS')) os = 'iOS';
    
    return { device, browser, os };
};

const logActivity = (action, options = {}) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Get admin info from request
        const admin = req.teamMember;
        
        if (!admin) {
            return next();
        }
        
        // Get device info
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const { device, browser, os } = getDeviceInfo(userAgent);
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.headers['x-real-ip'] || 
                         req.socket.remoteAddress || 
                         'Unknown';
        
        // Helper to save log
        const saveLog = async (status, errorMessage = null, responseData = null) => {
            try {
                let targetId = options.targetId;
                let targetModel = options.targetModel;
                let targetName = options.targetName;
                
                // If targetId is a function, evaluate it with response data
                if (typeof options.targetId === 'function') {
                    targetId = options.targetId(req, responseData);
                }
                if (typeof options.targetName === 'function') {
                    targetName = options.targetName(req, responseData);
                }
                
                await AdminActivityLog.create({
                    adminId: admin._id,
                    adminName: admin.name,
                    adminEmail: admin.email,
                    adminRole: admin.role,
                    action: action,
                    actionDetails: options.details || {},
                    targetId: targetId || null,
                    targetModel: targetModel || null,
                    targetName: targetName || null,
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                    device: device,
                    browser: browser,
                    os: os,
                    status: status,
                    errorMessage: errorMessage
                });
            } catch (logError) {
                console.error('Failed to log admin activity:', logError);
            }
        };
        
        // Override res.json to capture response
        res.json = function(data) {
            const statusCode = res.statusCode;
            if (statusCode >= 200 && statusCode < 300) {
                saveLog('success', null, data).catch(console.error);
            } else if (statusCode >= 400) {
                saveLog('failed', data?.message || 'Request failed', data).catch(console.error);
            }
            return originalJson.call(this, data);
        };
        
        // Override res.send
        res.send = function(data) {
            const statusCode = res.statusCode;
            if (statusCode >= 200 && statusCode < 300) {
                saveLog('success', null, data).catch(console.error);
            } else if (statusCode >= 400) {
                saveLog('failed', 'Request failed', data).catch(console.error);
            }
            return originalSend.call(this, data);
        };
        
        next();
    };
};

// Simple log function for manual logging
const logAdminAction = async (req, action, options = {}) => {
    const admin = req.teamMember;
    if (!admin) return;
    
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { device, browser, os } = getDeviceInfo(userAgent);
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.socket.remoteAddress || 
                     'Unknown';
    
    try {
        await AdminActivityLog.create({
            adminId: admin._id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRole: admin.role,
            action: action,
            actionDetails: options.details || {},
            targetId: options.targetId || null,
            targetModel: options.targetModel || null,
            targetName: options.targetName || null,
            ipAddress: ipAddress,
            userAgent: userAgent,
            device: device,
            browser: browser,
            os: os,
            status: options.status || 'success',
            errorMessage: options.errorMessage || null
        });
    } catch (logError) {
        console.error('Failed to log admin action:', logError);
    }
};

module.exports = { logActivity, logAdminAction, getDeviceInfo };