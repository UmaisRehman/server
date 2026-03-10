import dotenv from "dotenv";
import mongoose from "mongoose";
import Admin from "../models/admin.model.js";

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (existing) {
            console.log("Admin already exists:", existing.email);
            process.exit(0);
        }

        const admin = await Admin.create({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        });

        console.log("✅ Admin created:", admin.email);
        process.exit(0);
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
};

seedAdmin();
