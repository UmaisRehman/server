import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/db/index.js";
import authRoutes from "./src/routes/auth.routes.js";
import projectRoutes from "./src/routes/project.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        
        const allowedOrigins = [
            process.env.CLIENT_URL,
            process.env.ADMIN_URL,
            'http://localhost:5173',
            'http://localhost:5174'
        ].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));

        // Allow if origin matches env vars, or if it's running on Vercel
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/profile', profileRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Portfolio API is running 🚀' });
});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 5000, () => {
            console.log(`⚙️  Server is running at port : ${process.env.PORT || 5000}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed!", err);
    });
