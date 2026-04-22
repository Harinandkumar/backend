const express = require("express");
const app = express();
const dbconnect = require("./dbconn");
const { User, Event, Notification, Admin } = require("./schemas/schema");
const bcrypt = require("bcrypt");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendNewMemberEmail } = require('./mailer');
const { userAuth, adminAuth } = require('./middleware/auth');
const adminRoutes = require('./admin/events');
const memberRoutes = require('./admin/member');
const notificationRoutes = require('./admin/notification');
const navRoutes = require('./admin/nav');
const galleryRoutes = require('./admin/gallery');
const categoryRoutes = require('./admin/category');

// ========== NEW TEAM MANAGEMENT ROUTES ==========
const teamAuthRoutes = require('./admin/team-auth');
const teamManagementRoutes = require('./admin/team');
const workRoutes = require('./admin/work');

// ========== SCHEMAS FOR SEEDING ==========
const TeamMember = require('./schemas/teamMember');

require('dotenv').config();

// ========== CORS ==========
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== CONNECT DATABASE ==========
dbconnect();

// ========== SEED SUPER ADMIN (Run once) ==========
const seedSuperAdmin = async () => {
    try {
        const existingSuperAdmin = await TeamMember.findOne({ role: 'super_admin' });
        if (!existingSuperAdmin) {
            const superAdmin = new TeamMember({
                name: 'Super Admin',
                email: 'creativecodingcommunity.cs@gmail.com',  // ✅ CORRECT EMAIL
                position: 'Super Admin',
                role: 'super_admin',
                phone: '0000000000',
                profileImage: '',
                isActive: true,
                permissions: {
                    events: { create: true, edit: true, delete: true },
                    notifications: { create: true, delete: true },
                    gallery: { upload: true, delete: true },
                    members: { view: true, delete: true },
                    categories: { create: true, edit: true, delete: true },
                    navItems: { create: true, edit: true, delete: true },
                    teamManagement: { view: true, edit: true }
                }
            });
            await superAdmin.save();
            console.log('✅ Super Admin created!');
            console.log('📧 Email: creativecodingcommunity.cs@gmail.com');
            console.log('🔐 Use OTP login - no password needed');
            console.log('🌐 Login URL: https://c3community.netlify.app/admin-team-login.html');
        } else {
            console.log('✅ Super Admin already exists');
            // Update existing super admin email if different
            const existing = await TeamMember.findOne({ role: 'super_admin' });
            if (existing && existing.email !== 'creativecodingcommunity.cs@gmail.com') {
                existing.email = 'creativecodingcommunity.cs@gmail.com';
                await existing.save();
                console.log('✅ Super Admin email updated to: creativecodingcommunity.cs@gmail.com');
            }
        }
    } catch (error) {
        console.error('Seed error:', error);
    }
};

// ========== HEALTH CHECK ==========
app.get("/", (req, res) => {
    res.json({ message: "C3 Community API is running!", status: "active" });
});

// ========== PUBLIC ROUTES ==========
app.get("/allevents", async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: -1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/events", async (req, res) => {
    try {
        const events = await Event.find({ isOpen: true }).sort({ date: 1 }).limit(3);
        res.status(200).json({ message: "Events fetched successfully", events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/notifications", async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ date: -1 }).limit(50);
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// ========== AUTH ROUTES (USER) ==========
app.post("/signup", async (req, res) => {
    const { name, email, password, branch, batch, regno, mobileno } = req.body;
    if (!name || !email || !password || !branch || !batch || !regno || !mobileno) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { regno }, { mobileno }] });
        if (existingUser) {
            if (existingUser.email === email) return res.status(400).json({ message: "Email already in use" });
            if (existingUser.regno === regno) return res.status(400).json({ message: "Registration number already exists" });
            if (existingUser.mobileno === mobileno) return res.status(400).json({ message: "Mobile number already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name, email, password: hashedPassword, branch, batch, regno, mobileno, isverified: false
        });
        const verificationToken = jwt.sign(
            { email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        await newUser.save();
        await sendVerificationEmail(email, verificationToken);
        res.status(201).json({ message: "User registered successfully. Please check your email to verify your account." });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
        if (!user.isverified) {
            const verificationToken = jwt.sign(
                { email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            await sendVerificationEmail(email, verificationToken);
            return res.status(401).json({ message: "Account not verified. A new verification email has been sent." });
        }
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        const events = await Event.find({});
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                branch: user.branch,
                batch: user.batch,
                regno: user.regno,
                mobileno: user.mobileno
            },
            events
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// ========== OLD ADMIN LOGIN (Keep for backward compatibility) ==========
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
            { expiresIn: '7d' }
        );
        res.status(200).json({ message: "Admin login successful", token, admin: { id: admin._id, email: admin.email } });
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
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isverified) return res.status(400).json({ message: "Email already verified" });
        user.isverified = true;
        await user.save();
        res.status(200).json({ message: "Email verified successfully! You can now login." });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

app.get('/check-verification', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ isVerified: user.isverified, user: { name: user.name, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isverified) return res.status(400).json({ message: 'User is already verified' });
        const verificationToken = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        await sendVerificationEmail(user.email, verificationToken);
        res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== PROTECTED USER ROUTES ==========
app.get('/api/user/profile', userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/user/events', userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('events.eventId');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/events/:id", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('participants', 'name email');
        if (!event) return res.status(404).json({ message: "Event not found" });
        res.status(200).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/events/:id/join", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (!event.isOpen) return res.status(400).json({ message: "Event registration is closed" });
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const alreadyJoined = user.events.some(e => e.eventId.toString() === event._id.toString());
        if (alreadyJoined) return res.status(400).json({ message: "You have already joined this event" });
        user.events.push({
            eventId: event._id,
            eventName: event.name,
            eventImage: event.imagelink,
            joinedAt: new Date()
        });
        if (!event.participants.includes(user._id)) {
            event.participants.push(user._id);
            event.participantsCount = event.participants.length;
        }
        await Promise.all([user.save(), event.save()]);
        res.status(200).json({ message: "Event joined successfully", event: user.events[user.events.length - 1] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/events/:id/participants", userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('participants', 'name email branch batch regno');
        if (!event) return res.status(404).json({ message: "Event not found" });
        res.status(200).json(event.participants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// ========== ADMIN ROUTES (Existing) ==========
app.use('/admin', adminRoutes);
app.use('/admin/members', memberRoutes);
app.use('/admin/notifications', notificationRoutes);
app.use('/admin', navRoutes);
app.use('/api', navRoutes);
app.use('/admin', galleryRoutes);
app.use('/api', galleryRoutes);
app.use('/admin', categoryRoutes);
app.use('/api', categoryRoutes);

// ========== NEW TEAM MANAGEMENT ROUTES ==========
// OTP Login Routes (for all team members including super admin)
app.use('/api/team', teamAuthRoutes);

// Team Management Routes (Super Admin only)
app.use('/api/team', teamManagementRoutes);

// Work Assignment Routes
app.use('/api/work', workRoutes);

// ========== ADMIN VERIFY ENDPOINT (Existing) ==========
app.get('/admin/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findOne({ email: decoded.email }).select('-password');
        if (!admin) return res.status(401).json({ message: 'Admin not found' });
        res.status(200).json({ message: 'Token is valid', admin });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    
    // Seed super admin after database connection
    setTimeout(async () => {
        await seedSuperAdmin();
    }, 3000);
});