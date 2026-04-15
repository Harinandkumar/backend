const mongoose = require('mongoose');

const navItemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    link: { 
        type: String, 
        required: true 
    },
    icon: { 
        type: String, 
        default: 'fa-link' 
    },
    badge: { 
        type: String, 
        enum: ['none', 'live', 'new', 'upcoming'],
        default: 'none'
    },
    target: { 
        type: String, 
        enum: ['_self', '_blank'],
        default: '_self'
    },
    order: { 
        type: Number, 
        default: 0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('NavItem', navItemSchema);