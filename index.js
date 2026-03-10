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
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', process.env.ADMIN_URL || 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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
