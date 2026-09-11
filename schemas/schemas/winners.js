const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    rollno: { type: String, required: true, trim: true },
    eventName: { type: String, required: true, trim: true },
    rank: { type: String, enum: ['1st', '2nd', '3rd', 'special'], default: '1st' },
    photo: { type: String, required: true },
    publicId: { type: String, required: true },
    order: { type: Number, default: 0 }
});

const winnersSchema = new mongoose.Schema({
    heading: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    winners: [winnerSchema],
    showOnHomepage: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

winnersSchema.index({ showOnHomepage: 1, isPublished: 1, order: 1 });

module.exports = mongoose.model('Winners', winnersSchema);