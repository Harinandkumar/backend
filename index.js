const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dbconnect = require("./dbconn");
const { User } = require("./schemas/schema");
const { Event } = require("./schemas/schema");
const {Notification} = require('./schemas/schema')
const {Admin} = require('./schemas/schema')
const bcrypt = require("bcrypt")
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodmailer = require('nodemailer')
const { sendVerificationEmail } = require('./mailer');
const { userAuth, adminAuth } = require('./middleware/auth');
const adminRoutes = require('./admin/events');
const notificationRoutes = require('./admin/notification');
require('dotenv').config();

dbconnect();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.post("/",(req,res)=>{
    res.send("test api endpoint executed");
})

app.get("/",(req,res)=>{
    res.send("test api endpoint executed");
})


app.get("/events", async (req, res) => {
    try {
        const events = await Event.find({ isOpen: true })
            .sort({ date: 1 }) 
            .limit(3); 
        
        res.status(200).json({
            message: "Events fetched successfully",
            events
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(3000,()=>{
    console.log("app is running on server 3000");
})

app.post("/signup", async (req, res) => {
    const { name, email, password, branch, batch, regno, mobileno } = req.body;
   
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already in use" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            branch, 
            batch, 
            regno, 
            mobileno,
            isverified: false
        });

        // Create verification token
        const verificationToken = jwt.sign(
            { email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        await newUser.save();
        
        // Send verification email
        sendVerificationEmail(email, verificationToken);

        res.status(201).json({ 
            message: "User registered successfully. Please check your email to verify your account." 
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error", error });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Check if user is verified
        if (!user.isverified) {
            // Create new verification token
            const verificationToken = jwt.sign(
                { email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Resend verification email
            sendVerificationEmail(email, verificationToken);

            return res.status(401).json({ 
                message: "Account not verified. A new verification email has been sent." 
            });
        }

        // If user is verified, generate login token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const events = await Event.find({});

        res.status(200).json({ 
            message: "Login successful", 
            token,
            user: {
                name: user.name,
                email: user.email
            },
            events 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/admin-login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: "Admin not found" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

       
        const token = jwt.sign(
            { adminId: admin._id, email: admin.email },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: "Admin login successful", 
            token,
            admin: {
                email: admin.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/verify-email", async (req, res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isverified) {
            return res.status(400).json({ message: "Email already verified" });
        }

        user.isverified = true;
        await user.save();

        res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

// Check verification status
app.get('/check-verification', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ isVerified: user.isverified });
    } catch ( error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


app.post('/resend-verification', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.isverified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        const verificationToken = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        sendVerificationEmail(user.email, verificationToken);
        res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Example protected user route
app.get('/protected-user-route', userAuth, (req, res) => {
    res.json({ message: 'Access granted to user', user: req.user });
});

// Example protected admin route
app.get('/protected-admin-route', adminAuth, (req, res) => {
    res.json({ message: 'Access granted to admin', admin: req.admin });
});

// Add this after your other middleware
app.use('/admin', adminRoutes);

// Add notification routes
app.use('/admin/notifications', notificationRoutes);

// Add this endpoint to verify admin token
app.get('/admin/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify the token using the admin secret
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        
        // Check if admin still exists in database
        const admin = await Admin.findOne({ email: decoded.email });
        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        // Return success response
        res.status(200).json({ 
            message: 'Token is valid',
            admin: {
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// Get a specific event by ID
app.get("/api/events/:id", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get user's joined events
app.get("/api/user/events", userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Join an event
app.post("/api/events/:id/join", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user already joined this event
        const alreadyJoined = user.events.some(e => e.eventId.toString() === event._id.toString());
        if (alreadyJoined) {
            return res.status(400).json({ message: "You have already joined this event" });
        }

        // Add event to user's events
        user.events.push({
            eventId: event._id,
            eventName: event.name,
            eventImage: event.imagelink,
            date: event.date,
            isOpen: event.isOpen,
            isResultAnnounced: event.isResultAnnounced,
            winners: event.winners,
            participants: event.participants
        });

        // Initialize participants array if it doesn't exist
        if (!event.participants) {
            event.participants = [];
        }

        // Add user to event's participants
        if (!event.participants.includes(user._id)) {
            event.participants.push(user._id);
            event.participantsCount = event.participants.length;
        }

        await Promise.all([user.save(), event.save()]);
        
        res.status(200).json({ 
            message: "Event joined successfully",
            event: user.events[user.events.length - 1]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get event participants
app.get("/api/events/:id/participants", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('participants', 'name email branch batch');
        
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json(event.participants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/allevents",async(req,res)=>{
    const events = await Event.find({});
    res.status(200).json(events);
})

// Get all notifications (public endpoint)
app.get("/api/notifications", async (req, res) => {
    try {
        // Fetch all notifications, sorted by date (newest first)
        const notifications = await Notification.find()
            .sort({ date: -1 })
            .limit(50); // Limit to most recent 50
        
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin notification creation endpoint directly in index.js as a backup
app.post("/admin/notifications/create", adminAuth, async (req, res) => {
    try {
        const { title, message } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }
        
        const newNotification = new Notification({
            title,
            message,
            date: new Date()
        });
        
        await newNotification.save();
        
        res.status(201).json({ 
            message: "Notification created successfully",
            notification: newNotification
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
