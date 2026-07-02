import express from "express";
import 'dotenv/config';
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from './config/mongodb.js';
import authRouter from "./routes/authRoutes.js";
import inventoryRouter from "./routes/inventoryRoutes.js";
import donorRouter from "./routes/donorRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import publicRouter from "./routes/publicRoutes.js";
import hospitalRouter from "./routes/hospitalRoutes.js";
import organisationRouter from "./routes/organisationRoutes.js";
<<<<<<< HEAD
import transferRouter from "./routes/transferRoutes.js";
=======
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
import fs from 'fs';
import feedbackRouter from "./routes/feedbackRoutes.js";
import passport from "passport";
import "./config/passport.js";
import { checkExpiredBlood } from './services/expiryService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rest object
const app = express();

// PORT
const port = process.env.PORT || 7000;

// Connect to database
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(passport.initialize());

// Serve uploaded files statically
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(' Uploads directory created');
}
app.use('/uploads', express.static(uploadsDir));

// Routes / Endpoints
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: "LifeDrop API is running",
        version: "1.0.0"
    });
});

//Routes
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/donors', donorRouter);
app.use('/api/public', publicRouter);
app.use('/api/hospital', hospitalRouter);
app.use('/api/organisation', organisationRouter);
<<<<<<< HEAD
app.use('/api/transfer', transferRouter);
=======
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
app.use('/api/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Run expiry check every 24 hours
setInterval(async () => {
    console.log(' Running scheduled expiry check...');
    await checkExpiredBlood();
}, 24 * 60 * 60 * 1000);

setTimeout(async () => {
    console.log('Running initial expiry check...');
    await checkExpiredBlood();
}, 5000); // 5 seconds after server starts

// Start server
app.listen(port, () => {
    console.log('='.repeat(50));
    console.log('🩸 LifeDrop Blood Bank Management System');
    console.log('='.repeat(50));
    console.log(`✅ Server Started on PORT: ${port}`);
    console.log(`📡 API URL: http://localhost:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Uploads folder: ${uploadsDir}`);
    console.log(`⏰ Expiry check scheduled: Every 24 hours`);
    console.log('='.repeat(50));
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});