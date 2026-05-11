const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for images (Gallery)
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'c3-gallery',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg'],
        transformation: [
            { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
        ]
    }
});

// ✅ NEW: Configure storage for PDF certificates
const pdfStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'c3-certificates',
        resource_type: 'raw',  // Important for PDF files
        allowed_formats: ['pdf'],
        format: 'pdf'
    }
});

// Image upload for gallery
const upload = multer({ 
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ✅ NEW: PDF upload for certificates
const uploadPDF = multer({ 
    storage: pdfStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for PDFs
});

module.exports = { cloudinary, upload, uploadPDF };