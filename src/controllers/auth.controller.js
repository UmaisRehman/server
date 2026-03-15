import Admin from "../models/admin.model.js";
import Profile from "../models/profile.model.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, generateOTP } from "../utils/sendEmail.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const generateAccessToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email, username: admin.username },
        process.env.ACCESS_JWT_SECRET,
        { expiresIn: "6h" }
    );
};

const generateRefreshToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email, username: admin.username },
        process.env.REFRESH_JWT_SECRET,
        { expiresIn: "7d" }
    );
};

export const signupAdmin = asyncHandler(async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
        throw new ApiError(400, "All fields are required (name, username, email, password)", "MISSING_FIELDS");
    }

    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters", "WEAK_PASSWORD");
    }

    const usernameRegex = /^[a-z0-9-]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
        throw new ApiError(400, "Username can only contain lowercase letters, numbers, and hyphens", "INVALID_USERNAME");
    }

    if (username.length < 3 || username.length > 30) {
        throw new ApiError(400, "Username must be between 3 and 30 characters", "INVALID_USERNAME_LENGTH");
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Please provide a valid email address", "INVALID_EMAIL");
    }

    const existingEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
        throw new ApiError(409, "An account with this email already exists", "DUPLICATE_EMAIL");
    }

    const existingUsername = await Admin.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
        throw new ApiError(409, "This username is already taken", "DUPLICATE_USERNAME");
    }

    const admin = await Admin.create({
        name: name.trim(),
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password
    });

    await Profile.create({
        userId: admin._id,
        name: name.trim(),
        email: email.toLowerCase().trim()
    });

    res.status(201).json({
        success: true,
        message: "Account created successfully! Please login to continue."
    });
});

// Login — direct email + password, no OTP
export const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required", "MISSING_EMAIL");
    }

    if (!password) {
        throw new ApiError(400, "Password is required", "MISSING_PASSWORD");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
        throw new ApiError(401, "No account found with this email. Please sign up first.", "ACCOUNT_NOT_FOUND");
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password. Please try again.", "INVALID_PASSWORD");
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
        success: true,
        message: "Login successful",
        accessToken,
        admin: {
            id: admin._id,
            email: admin.email,
            username: admin.username,
            name: admin.name
        }
    });
});

// Forgot Password — send OTP to email
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required", "MISSING_EMAIL");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
        throw new ApiError(404, "No account found with this email", "ACCOUNT_NOT_FOUND");
    }

    const otpCode = generateOTP();
    admin.otpCode = otpCode;
    admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await admin.save();

    await sendOTPEmail(email, otpCode);

    res.json({
        success: true,
        message: "OTP sent to your email. Please check your inbox.",
        email
    });
});

// Reset Password — verify OTP and set new password
export const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required", "MISSING_FIELDS");
    }

    if (newPassword.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters", "WEAK_PASSWORD");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
        throw new ApiError(404, "No account found with this email", "ACCOUNT_NOT_FOUND");
    }

    if (!admin.otpCode) {
        throw new ApiError(400, "No OTP was generated. Please request a new one.", "NO_OTP_GENERATED");
    }

    if (admin.otpCode !== otp) {
        throw new ApiError(401, "Invalid OTP. Please check and try again.", "INVALID_OTP");
    }

    if (admin.otpExpiry < new Date()) {
        throw new ApiError(401, "OTP has expired. Please request a new one.", "OTP_EXPIRED");
    }

    admin.otpCode = null;
    admin.otpExpiry = null;
    admin.password = newPassword;
    await admin.save();

    res.json({
        success: true,
        message: "Password reset successfully! You can now login with your new password."
    });
});

export const logoutAdmin = asyncHandler(async (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logged out successfully" });
});

export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
        throw new ApiError(401, "No refresh token found. Please login again.", "NO_REFRESH_TOKEN");
    }

    const decoded = jwt.verify(token, process.env.REFRESH_JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
        throw new ApiError(401, "Account not found. Token may be invalid.", "INVALID_REFRESH_TOKEN");
    }

    const accessToken = generateAccessToken(admin);
    res.json({ success: true, message: "Token refreshed", accessToken });
});

export const checkAuth = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin.id).select("-password -otpCode -otpExpiry");

    if (!admin) {
        throw new ApiError(404, "Account not found", "ADMIN_NOT_FOUND");
    }

    res.json({
        success: true,
        admin: {
            id: admin._id,
            email: admin.email,
            username: admin.username,
            name: admin.name
        }
    });
});

export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
        throw new ApiError(400, "Current password is required", "MISSING_CURRENT_PASSWORD");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new ApiError(400, "New password must be at least 6 characters long", "WEAK_NEW_PASSWORD");
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
        throw new ApiError(404, "Account not found", "ADMIN_NOT_FOUND");
    }

    const isPasswordValid = await admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: "Password updated successfully" });
});

export const updateUsername = asyncHandler(async (req, res) => {
    const { username } = req.body;

    if (!username) {
        throw new ApiError(400, "Username is required", "MISSING_USERNAME");
    }

    const cleanUsername = username.toLowerCase().trim();

    const usernameRegex = /^[a-z0-9-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
        throw new ApiError(400, "Username can only contain lowercase letters, numbers, and hyphens", "INVALID_USERNAME");
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        throw new ApiError(400, "Username must be between 3 and 30 characters", "INVALID_USERNAME_LENGTH");
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
        throw new ApiError(404, "Account not found", "ADMIN_NOT_FOUND");
    }

    // Check if same as current
    if (admin.username === cleanUsername) {
        return res.json({ success: true, message: "Username unchanged", username: cleanUsername });
    }

    // Check uniqueness
    const existing = await Admin.findOne({ username: cleanUsername, _id: { $ne: admin._id } });
    if (existing) {
        throw new ApiError(409, "This username is already taken", "DUPLICATE_USERNAME");
    }

    admin.username = cleanUsername;
    await admin.save();

    // Return new tokens with updated username
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
        success: true,
        message: "Username updated successfully",
        username: cleanUsername,
        accessToken,
        admin: {
            id: admin._id,
            email: admin.email,
            username: cleanUsername,
            name: admin.name
        }
    });
});
