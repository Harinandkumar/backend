const mongoose = require("mongoose");

// Joined Event Schema (for user's joined events)
const joinedEventSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    eventName: { type: String, required: true },
    eventImage: { type: String },
    joinedAt: { type: Date, default: Date.now }
});

// Notification Schema - UPDATED with priority, badge, and buttons
const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isPriority: { type: Boolean, default: false },
    badge: { type: String, enum: ['none', 'live', 'new', 'upcoming'], default: 'none' },
    button1Text: { type: String, default: '' },
    button1Link: { type: String, default: '' },
    button2Text: { type: String, default: '' },
    button2Link: { type: String, default: '' }
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    branch: { type: String, required: true },
    batch: { type: String, enum: ["22-26", "23-27", "24-28"], required: true },
    regno: { type: String, required: true, unique: true },
    mobileno: { type: String, required: true, unique: true },
    isverified: { type: Boolean, default: false },
    events: [joinedEventSchema],
    createdAt: { type: Date, default: Date.now },
     // ✅ NEW: Forgot password fields
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpires: { type: Date, default: null }
});

// Event Model Schema
const eventModelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imagelink: { type: String, required: true },
    date: { type: Date, required: true },
    pdflink: { type: String, required: true },
    isOpen: { type: Boolean, default: true },
    isResultAnnounced: { type: Boolean, default: false },
    winners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    prize: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    participantsCount: { type: Number, default: 0 }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);
const Event = mongoose.model("Event", eventModelSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Admin = mongoose.model("Admin", adminSchema);

module.exports = { User, Event, Notification, Admin };