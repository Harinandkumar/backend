const express = require('express');
const router = express.Router();
const { Event, User } = require('../schemas/schema');
const { adminAuth } = require('../middleware/auth');

// Create new event
router.post('/events/create', adminAuth, async (req, res) => {
    try {
        const { name, imagelink, date, pdflink, prize, location, description, isOpen } = req.body;
        
        // Validation
        if (!name || !imagelink || !date || !pdflink || !prize || !location || !description) {
            return res.status(400).json({ message: "All required fields must be filled" });
        }
        
        const event = new Event({
            name, imagelink, date, pdflink, prize, location, description,
            isOpen: isOpen !== undefined ? isOpen : true,
            participants: [],
            participantsCount: 0
        });
        
        await event.save();
        res.status(201).json({ message: "Event created successfully", event });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

// Get all events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single event
router.get('/events/:id', adminAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('participants', 'name email branch');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update event
router.put('/events/:id', adminAuth, async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: "Event updated successfully", event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete event (also remove from users' events)
router.delete('/events/:id', adminAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        // Remove event from all users' events array
        await User.updateMany(
            { 'events.eventId': event._id },
            { $pull: { events: { eventId: event._id } } }
        );
        
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// Declare winners for an event
router.post('/events/:id/winners', adminAuth, async (req, res) => {
    try {
        const { winners } = req.body; // winners array of user IDs
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        event.winners = winners;
        event.isResultAnnounced = true;
        await event.save();
        
        res.json({ message: 'Winners declared successfully', event });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;