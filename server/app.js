import express from "express";
import 'dotenv/config';
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';
import connectDB from './config/mongodb.js';
import authRouter from "./routes/authRoutes.js";
import inventoryRouter from "./routes/inventoryRoutes.js";
import donorRouter from "./routes/donorRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import publicRouter from "./routes/publicRoutes.js";
import hospitalRouter from "./routes/hospitalRoutes.js";
import organisationRouter from "./routes/organisationRoutes.js";
import feedbackRouter from "./routes/feedbackRoutes.js";
import passport from "passport";
import "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(passport.initialize());

const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: "LifeDrop API is running",
        version: "1.0.0"
    });
});

app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/donors', donorRouter);
app.use('/api/public', publicRouter);
app.use('/api/hospital', hospitalRouter);
app.use('/api/organisation', organisationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

export default app;
