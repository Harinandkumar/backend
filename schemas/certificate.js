const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        default: '' 
    },
    pdfUrl: { 
        type: String, 
        required: true 
    },
    publicId: { 
        type: String, 
        required: true 
    },
    identifier: { 
        type: String, 
        required: true 
    },
    identifierType: { 
        type: String, 
        enum: ['rollno', 'regno'], 
        required: true 
    },
    eventName: { 
        type: String, 
        default: '' 
    },
    issuedDate: { 
        type: Date, 
        default: Date.now 
    },
    uploadedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TeamMember' 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
});

module.exports = mongoose.model('Certificate', certificateSchema);