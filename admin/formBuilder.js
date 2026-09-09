const express = require('express');
const router = express.Router();
const FormBuilder = require('../schemas/formBuilder');
const FormResponse = require('../schemas/formResponse');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');

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
        const { title, description, fields, expiryDate, maxSubmissions, password, sendEmailReceipt, googleSheetsSync } = req.body;
        
        if (!title) return res.status(400).json({ message: 'Title is required' });
        if (!fields || fields.length === 0) return res.status(400).json({ message: 'At least one field is required' });
        
        const form = new FormBuilder({
            title,
            description: description || '',
            fields,
            expiryDate: expiryDate || null,
            maxSubmissions: maxSubmissions || null,
            password: password || '',
            sendEmailReceipt: sendEmailReceipt || false,
            googleSheetsSync: googleSheetsSync || false,
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
        const { title, description, fields, expiryDate, maxSubmissions, password, sendEmailReceipt, googleSheetsSync, isPublished, isActive } = req.body;
        
        const form = await FormBuilder.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        
        if (title) form.title = title;
        if (description !== undefined) form.description = description;
        if (fields) form.fields = fields;
        if (expiryDate !== undefined) form.expiryDate = expiryDate;
        if (maxSubmissions !== undefined) form.maxSubmissions = maxSubmissions;
        if (password !== undefined) form.password = password;
        if (sendEmailReceipt !== undefined) form.sendEmailReceipt = sendEmailReceipt;
        if (googleSheetsSync !== undefined) form.googleSheetsSync = googleSheetsSync;
        if (isPublished !== undefined) form.isPublished = isPublished;
        if (isActive !== undefined) form.isActive = isActive;
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

// ========== RESPONSES ROUTES ==========

// Get form responses
router.get('/forms/:id/responses', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [responses, total] = await Promise.all([
            FormResponse.find({ formId: req.params.id })
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            FormResponse.countDocuments({ formId: req.params.id })
        ]);
        
        res.json({ responses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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
        
        // Calculate average time
        const avgTimeResult = await FormResponse.aggregate([
            { $match: { formId: req.params.id } },
            { $group: { _id: null, avg: { $avg: '$completionTime' } } }
        ]);
        const avgTime = avgTimeResult.length > 0 ? Math.round(avgTimeResult[0].avg) : 0;
        
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
        
        res.json({ totalResponses, completedResponses, partialResponses, avgTime, dailyStats });
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
router.post('/public/forms/:id/submit', async (req, res) => {
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
        
        // Check password
        if (form.password && form.password !== req.body.password) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        
        const response = new FormResponse({
            formId: form._id,
            userId: userId || null,
            email: email || '',
            responses: parsedResponses,
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            isPartial: false,
            completionTime: req.body.completionTime || 0
        });
        
        await response.save();
        
        res.status(201).json({
            message: 'Form submitted successfully',
            confirmationMessage: 'Thank you for your submission!'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;