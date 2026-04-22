const mongoose = require('mongoose');

const workAssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', required: true },
    category: { 
        type: String, 
        enum: ['design', 'development', 'content', 'social', 'event', 'other'],
        default: 'other'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'rejected'],
        default: 'pending'
    },
    dueDate: { type: Date },
    attachments: [{ type: String }],
    remarks: { type: String, default: '' },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkAssignment', workAssignmentSchema);