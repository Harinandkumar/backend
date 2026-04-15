const mongoose = require("mongoose");

// Event Schema (for user's joined events - simplified)
const joinedEventSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    eventName: { type: String, required: true },
    eventImage: { type: String },
    joinedAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now }
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
    createdAt: { type: Date, default: Date.now }
});

// Event Model Schema (Fixed - added participants)
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