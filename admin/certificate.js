const express = require('express');
const router = express.Router();
const Certificate = require('../schemas/certificate');
const { teamAuth, isSuperAdmin } = require('../middleware/teamAuth');
const { uploadPDF } = require('../config/cloudinary');

// ========== ADMIN ROUTES ==========

// Upload certificate (Super Admin only)
router.post('/upload', teamAuth, isSuperAdmin, uploadPDF.single('pdf'), async (req, res) => {
    try {
        const { title, description, identifier, identifierType, eventName } = req.body;
        
        if (!title || !identifier || !identifierType || !req.file) {
            return res.status(400).json({ 
                message: 'Missing required fields: title, identifier, identifierType, and PDF file are required' 
            });
        }
        
        const certificate = new Certificate({
            title,
            description: description || '',
            pdfUrl: req.file.path,
            publicId: req.file.filename,
            identifier: identifier.trim(),
            identifierType,
            eventName: eventName || '',
            uploadedBy: req.teamMember._id,
            isActive: true
        });
        
        await certificate.save();
        
        res.status(201).json({ 
            message: 'Certificate uploaded successfully', 
            certificate 
        });
    } catch (error) {
        console.error('Certificate upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all certificates (Super Admin only)
router.get('/all', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate('uploadedBy', 'name email')
            .sort({ issuedDate: -1 });
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete certificate (Super Admin only)
router.delete('/:id', teamAuth, isSuperAdmin, async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }
        
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(certificate.publicId, { resource_type: 'raw' });
        await Certificate.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Certificate deleted successfully' });
    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== PUBLIC USER ROUTES ==========

// Get certificates by identifier (rollno OR regno) - for user dashboard
router.get('/user/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        
        if (!identifier) {
            return res.status(400).json({ message: 'Identifier is required' });
        }
        
        const certificates = await Certificate.find({
            $or: [
                { identifier: identifier, identifierType: 'rollno' },
                { identifier: identifier, identifierType: 'regno' }
            ],
            isActive: true
        }).sort({ issuedDate: -1 });
        
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching user certificates:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;