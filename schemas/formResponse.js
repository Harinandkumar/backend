const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormBuilder', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: '' },
    responses: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    completionTime: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isPartial: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
});

formResponseSchema.index({ formId: 1, submittedAt: -1 });
formResponseSchema.index({ formId: 1, userId: 1 });

module.exports = mongoose.model('FormResponse', formResponseSchema);