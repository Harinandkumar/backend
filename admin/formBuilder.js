const express = require('express');
const router = express.Router();
const FormBuilder = require('../schemas/formBuilder');
const FormResponse = require('../schemas/formResponse');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');
const { upload } = require('../config/cloudinary');

// ========== ADMIN ROUTES ==========

// Get all forms
router.get('/forms', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const forms = await FormBuilder.find().sort({ createdAt: -1 });
        res.json(forms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single form
router.get('/forms/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const form = await FormBuilder.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        res.json(form);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create form
router.post('/forms', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { title, description, eventId, fields, theme, password, expiryDate, maxSubmissions, uniqueResponse, sendEmailReceipt, confirmationMessage, redirectUrl } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        
        const form = new FormBuilder({
            title,
            description: description || '',
            eventId: eventId || null,
            fields: fields || [],
            theme: theme || 'default',
            password: password || '',
            expiryDate: expiryDate || null,
            maxSubmissions: maxSubmissions || null,
            uniqueResponse: uniqueResponse || false,
            sendEmailReceipt: sendEmailReceipt || false,
            confirmationMessage: confirmationMessage || 'Thank you for your submission!',
            redirectUrl: redirectUrl || '',
            isPublished: false,
            isActive: true
        });
        
        await form.save();
        res.status(201).json({ message: 'Form created successfully', form });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update form
router.put('/forms/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { title, description, fields, theme, password, expiryDate, maxSubmissions, uniqueResponse, sendEmailReceipt, confirmationMessage, redirectUrl, isActive, isPublished } = req.body;
        
        const form = await FormBuilder.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        
        if (title) form.title = title;
        if (description !== undefined) form.description = description;
        if (fields) form.fields = fields;
        if (theme) form.theme = theme;
        if (password !== undefined) form.password = password;
        if (expiryDate !== undefined) form.expiryDate = expiryDate;
        if (maxSubmissions !== undefined) form.maxSubmissions = maxSubmissions;
        if (uniqueResponse !== undefined) form.uniqueResponse = uniqueResponse;
        if (sendEmailReceipt !== undefined) form.sendEmailReceipt = sendEmailReceipt;
        if (confirmationMessage) form.confirmationMessage = confirmationMessage;
        if (redirectUrl !== undefined) form.redirectUrl = redirectUrl;
        if (isActive !== undefined) form.isActive = isActive;
        if (isPublished !== undefined) form.isPublished = isPublished;
        form.updatedAt = new Date();
        
        await form.save();
        res.json({ message: 'Form updated successfully', form });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete form
router.delete('/forms/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const form = await FormBuilder.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        
        await FormBuilder.findByIdAndDelete(req.params.id);
        await FormResponse.deleteMany({ formId: req.params.id });
        
        res.json({ message: 'Form deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get form responses
router.get('/forms/:id/responses', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let query = { formId: req.params.id };
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { 'responses': { $regex: search, $options: 'i' } }
            ];
        }
        
        const [responses, total] = await Promise.all([
            FormResponse.find(query)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            FormResponse.countDocuments(query)
        ]);
        
        res.json({ 
            responses, 
            total, 
            page: parseInt(page), 
            pages: Math.ceil(total / parseInt(limit)) 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get form stats
router.get('/forms/:id/stats', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const totalResponses = await FormResponse.countDocuments({ formId: req.params.id });
        const completedResponses = await FormResponse.countDocuments({ formId: req.params.id, isPartial: false });
        const partialResponses = await FormResponse.countDocuments({ formId: req.params.id, isPartial: true });
        
        // Daily stats for last 7 days
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await FormResponse.countDocuments({
                formId: req.params.id,
                submittedAt: { $gte: date, $lt: nextDate }
            });
            
            dailyStats.push({
                date: date.toLocaleDateString(),
                count
            });
        }
        
        res.json({ totalResponses, completedResponses, partialResponses, dailyStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Export responses as CSV
router.get('/forms/:id/export', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const form = await FormBuilder.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        
        const responses = await FormResponse.find({ formId: req.params.id });
        
        // Build CSV
        const headers = ['#', 'Submitted At', 'Email', ...form.fields.map(f => f.label)];
        let csv = headers.join(',') + '\n';
        
        responses.forEach((response, index) => {
            const row = [
                index + 1,
                new Date(response.submittedAt).toLocaleString(),
                response.email || '',
                ...form.fields.map(f => {
                    const value = response.responses.get(f.id) || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
            ];
            csv += row.join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=form_${form.title}_responses.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== PUBLIC ROUTES ==========

// Get published form
router.get('/public/forms/:id', async (req, res) => {
    try {
        const form = await FormBuilder.findOne({
            _id: req.params.id,
            isPublished: true,
            isActive: true
        });
        
        if (!form) return res.status(404).json({ message: 'Form not found or not published' });
        
        // Check expiry
        if (form.expiryDate && new Date() > form.expiryDate) {
            return res.status(400).json({ message: 'Form has expired' });
        }
        
        // Check max submissions
        if (form.maxSubmissions) {
            const count = await FormResponse.countDocuments({ formId: form._id });
            if (count >= form.maxSubmissions) {
                return res.status(400).json({ message: 'Form has reached maximum submissions' });
            }
        }
        
        res.json(form);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit form response
router.post('/public/forms/:id/submit', upload.any(), async (req, res) => {
    try {
        const form = await FormBuilder.findOne({
            _id: req.params.id,
            isPublished: true,
            isActive: true
        });
        
        if (!form) return res.status(404).json({ message: 'Form not found' });
        
        // Check expiry
        if (form.expiryDate && new Date() > form.expiryDate) {
            return res.status(400).json({ message: 'Form has expired' });
        }
        
        // Check max submissions
        if (form.maxSubmissions) {
            const count = await FormResponse.countDocuments({ formId: form._id });
            if (count >= form.maxSubmissions) {
                return res.status(400).json({ message: 'Form has reached maximum submissions' });
            }
        }
        
        const { responses, email, userId } = req.body;
        const parsedResponses = typeof responses === 'string' ? JSON.parse(responses) : responses;
        
        // Check unique response
        if (form.uniqueResponse && userId) {
            const existing = await FormResponse.findOne({ formId: form._id, userId });
            if (existing) {
                return res.status(400).json({ message: 'You have already submitted this form' });
            }
        }
        
        // Process file uploads
        const processedResponses = { ...parsedResponses };
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                processedResponses[file.fieldname] = file.path;
            });
        }
        
        const response = new FormResponse({
            formId: form._id,
            userId: userId || null,
            email: email || '',
            responses: processedResponses,
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            isPartial: false
        });
        
        await response.save();
        
        // Send email receipt if enabled
        if (form.sendEmailReceipt && email) {
            // Email logic here
        }
        
        res.status(201).json({ 
            message: 'Form submitted successfully',
            confirmationMessage: form.confirmationMessage,
            redirectUrl: form.redirectUrl
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;