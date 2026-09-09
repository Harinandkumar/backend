const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['text', 'email', 'number', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'datetime', 'file', 'image', 'rating', 'slider', 'toggle', 'url', 'color', 'signature', 'section', 'html'],
        required: true 
    },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    validation: {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
        pattern: { type: String, default: '' },
        customError: { type: String, default: '' }
    },
    conditionalLogic: {
        fieldId: { type: String, default: '' },
        operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'], default: 'equals' },
        value: { type: String, default: '' }
    },
    defaultValue: { type: String, default: '' },
    helpText: { type: String, default: '' }
});

const formBuilderSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    fields: [fieldSchema],
    theme: { 
        type: String, 
        enum: ['default', 'dark', 'modern', 'gradient', 'minimal'],
        default: 'default' 
    },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    password: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    maxSubmissions: { type: Number, default: null },
    uniqueResponse: { type: Boolean, default: false },
    sendEmailReceipt: { type: Boolean, default: false },
    confirmationMessage: { type: String, default: 'Thank you for your submission!' },
    redirectUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FormBuilder', formBuilderSchema);