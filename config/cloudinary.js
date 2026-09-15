const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========== ✅ SEO Filename Generator ==========
function generateSeoFilename(name, suffix = '') {
    const cleanName = (name || 'c3-item')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')   // Special chars hatao
        .replace(/\s+/g, '-')            // Spaces → hyphen
        .replace(/-+/g, '-')             // Multiple hyphens → single
        .replace(/^-|-$/g, '')           // Trim hyphens
        .substring(0, 60);               // Max 60 chars (SEO best practice)
    
    const cleanSuffix = (suffix || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
    
    const timestamp = Date.now();
    
    // Format: name-suffix-c3-community-timestamp
    const parts = [cleanName];
    if (cleanSuffix) parts.push(cleanSuffix);
    parts.push('c3-community');
    parts.push(timestamp);
    
    return parts.join('-');
}

// ========== ✅ GALLERY STORAGE (SEO Name) ==========
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const title = req.body.title || 'gallery-image';
        const category = req.body.category || 'events';
        
        return {
            folder: 'c3-gallery',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg'],
            public_id: generateSeoFilename(title, category),  // ✅ SEO
            transformation: [
                { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
            ]
        };
    }
});

// ========== ✅ TEAM PUBLIC STORAGE (SEO Name) ==========
const teamStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const name = req.body.name || 'team-member';
        const position = req.body.position || 'member';
        
        return {
            folder: 'c3-team',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: generateSeoFilename(name, position),  // ✅ SEO
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }
            ]
        };
    }
});

// ========== ✅ ALUMNI STORAGE (SEO Name) ==========
const alumniStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const name = req.body.name || 'alumni';
        const batch = req.body.batch || 'batch';
        
        return {
            folder: 'c3-alumni',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: generateSeoFilename(name, `alumni-${batch}`),  // ✅ SEO
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }
            ]
        };
    }
});

// ========== ✅ WINNERS STORAGE (SEO Name) ==========
const winnersStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const name = req.body.name || 'winner';
        const rank = req.body.rank || 'winner';
        const eventName = req.body.eventName || 'event';
        
        return {
            folder: 'c3-winners',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: generateSeoFilename(name, `${rank}-${eventName}`),  // ✅ SEO
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }
            ]
        };
    }
});

// ========== ✅ CUSTOM SECTION STORAGE (NEW) ==========
const customSectionStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const title = req.body.title || 'section-image';
        return {
            folder: 'c3-custom-sections',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
            public_id: generateSeoFilename(title, 'custom-section'),
            transformation: [
                { width: 1400, height: 900, crop: 'limit', quality: 'auto' }
            ]
        };
    }
});

const uploadCustomSection = multer({
    storage: customSectionStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});
// ========== ✅ PDF STORAGE (Certificates) ==========
const pdfStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'c3-certificates',
        resource_type: 'raw',
        allowed_formats: ['pdf'],
        format: 'pdf'
    }
});

// ========== MULTER INSTANCES ==========
const upload = multer({ 
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadTeam = multer({ 
    storage: teamStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadAlumni = multer({ 
    storage: alumniStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadWinners = multer({ 
    storage: winnersStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadPDF = multer({ 
    storage: pdfStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ========== EXPORTS ==========
module.exports = { 
    cloudinary, 
    upload,          // Gallery
    uploadTeam,      // Team Public
    uploadAlumni,    // Alumni
    uploadWinners, 
     uploadCustomSection,  // Winners
    uploadPDF,
    
                 // Certificates
    generateSeoFilename
};