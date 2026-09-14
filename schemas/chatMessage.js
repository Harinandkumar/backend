const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    // User/Visitor info
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },
    visitorId: { 
        type: String, 
        required: true  // Unique ID for anonymous users
    },
    userName: { 
        type: String, 
        default: 'Guest' 
    },
    userEmail: { 
        type: String, 
        default: '' 
    },
    
    // Message content
    message: { 
        type: String, 
        required: true 
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    
    // Sender
    sender: {
        type: String,
        enum: ['user', 'bot', 'admin'],
        required: true
    },
    senderName: {
        type: String,
        default: ''
    },
    
    // Reply tracking (for bot messages)
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
        default: null
    },
    
    // Status
    isRead: {
        type: Boolean,
        default: false
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    
    // Metadata
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    pageUrl: { type: String, default: '' },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
chatMessageSchema.index({ visitorId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ isRead: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);