import Admin from "../models/admin.model.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, generateOTP } from "../utils/sendEmail.js";

const generateAccessToken = (admin) => {
    return jwt.sign({ id: admin._id, email: admin.email }, process.env.ACCESS_JWT_SECRET, {
        expiresIn: "6h"
    });
};

const generateRefreshToken = (admin) => {
    return jwt.sign({ id: admin._id, email: admin.email }, process.env.REFRESH_JWT_SECRET, {
        expiresIn: "7d"
    });
};

// Step 1: Validate email (password optional) → Send OTP
export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const inputEmail = email.toLowerCase();
        const allowedEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase() : null;

        // Security Check: Only allow the ONE specific admin email defined in .env
        if (!allowedEmail || inputEmail !== allowedEmail) {
            // Send back a generic message to prevent attackers from knowing if the email exists
            return res.status(401).json({ message: "Unauthorized: You are not the admin of this portfolio." });
        }

        let admin = await Admin.findOne({ email: inputEmail });

        if (!admin) {
            // First time login: Auto-create the admin account since it matches the .env allowed email
            const randomPassword = Math.random().toString(36).slice(-10);
            admin = new Admin({
                email: inputEmail,
                password: password || randomPassword
            });
            await admin.save();
        } else if (password) {
            // If they provided a password, verify it
            const isPasswordValid = await admin.comparePassword(password);
            if (!isPasswordValid) return res.status(401).json({ message: "Invalid password" });
        }

        // Generate OTP and save
        const otpCode = generateOTP();
        admin.otpCode = otpCode;
        admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await admin.save();

        // Send OTP email
        await sendOTPEmail(email, otpCode);

        res.json({ message: "OTP sent to your email", email });
    } catch (error) {
        console.error("Login error:", error);
        if (error.code === 'EAUTH' || error.command === 'API' || (error.message && error.message.includes('Missing credentials'))) {
            return res.status(500).json({ message: "Email format error: Please set valid EMAIL_USER and EMAIL_PASS in your backend .env file to receive OTP." });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// Step 2: Verify OTP → Return tokens
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    try {
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) return res.status(401).json({ message: "Invalid credentials" });

        // Check OTP
        if (admin.otpCode !== otp) return res.status(401).json({ message: "Invalid OTP" });
        if (admin.otpExpiry < new Date()) return res.status(401).json({ message: "OTP expired" });

        // Clear OTP
        admin.otpCode = null;
        admin.otpExpiry = null;
        await admin.save();

        // Generate tokens
        const accessToken = generateAccessToken(admin);
        const refreshToken = generateRefreshToken(admin);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: "Login successful",
            accessToken,
            admin: { id: admin._id, email: admin.email }
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Logout
export const logoutAdmin = async (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
};

// Refresh token
export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token found" });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) return res.status(401).json({ message: "Invalid token" });

        const accessToken = generateAccessToken(admin);
        res.json({ message: "Token refreshed", accessToken });
    } catch (error) {
        res.status(403).json({ message: "Invalid or expired refresh token" });
    }
};

// Check auth status
export const checkAuth = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select("-password -otpCode -otpExpiry");
        if (!admin) return res.status(404).json({ message: "Admin not found" });
        res.json({ admin: { id: admin._id, email: admin.email } });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update password
export const updatePassword = async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        admin.password = newPassword;
        await admin.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Update password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
