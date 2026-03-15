import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./src/db/index.js";
import authRoutes from "./src/routes/auth.routes.js";
import projectRoutes from "./src/routes/project.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import contactRoutes from "./src/routes/contact.routes.js";
import errorHandler from "./src/middleware/errorHandler.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.CLIENT_URL,
            process.env.ADMIN_URL,
            'http://localhost:5173',
            'http://localhost:5174'
        ].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));

        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, origin);
        } else {
            console.log("Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Too many requests. Please try again after 15 minutes.",
        errorCode: "RATE_LIMIT_EXCEEDED"
    },
    standardHeaders: true,
    legacyHeaders: false
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many signup attempts. Please try again after 1 hour.",
        errorCode: "SIGNUP_RATE_LIMIT"
    },
    standardHeaders: true,
    legacyHeaders: false
});

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: "Too many contact messages. Please try again after 15 minutes.",
        errorCode: "CONTACT_RATE_LIMIT"
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/contact', contactLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Portfolio API is running 🚀' });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        errorCode: "ROUTE_NOT_FOUND"
    });
});

app.use(errorHandler);

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 5000, () => {
            console.log(`⚙️  Server is running at port : ${process.env.PORT || 5000}`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed!", err.message);
        process.exit(1);
    });
