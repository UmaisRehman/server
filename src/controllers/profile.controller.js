import Profile from "../models/profile.model.js";
import Admin from "../models/admin.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import fs from "fs";

export const getProfile = asyncHandler(async (req, res) => {
    let profile = await Profile.findOne({ userId: req.admin.id });

    if (!profile) {
        profile = await Profile.create({ userId: req.admin.id });
    }

    res.json({ success: true, profile });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required", "MISSING_USERNAME");
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
        throw new ApiError(404, "Portfolio not found. This username does not exist.", "USER_NOT_FOUND");
    }

    const profile = await Profile.findOne({ userId: admin._id });
    if (!profile) {
        throw new ApiError(404, "Profile not set up yet", "PROFILE_NOT_FOUND");
    }

    res.json({ success: true, profile });
});

export const updateProfile = asyncHandler(async (req, res) => {
    let profile = await Profile.findOne({ userId: req.admin.id });

    if (!profile) {
        profile = new Profile({ userId: req.admin.id });
    }

    const { name, tagline, bio, email, phone, location, github, linkedin, website, skills } = req.body;

    if (name !== undefined) profile.name = name;
    if (tagline !== undefined) profile.tagline = tagline;
    if (bio !== undefined) profile.bio = bio;
    if (email !== undefined) profile.email = email;
    if (phone !== undefined) profile.phone = phone;
    if (location !== undefined) profile.location = location;
    if (github !== undefined) profile.github = github;
    if (linkedin !== undefined) profile.linkedin = linkedin;
    if (website !== undefined) profile.website = website;
    if (skills !== undefined) profile.skills = typeof skills === "string" ? JSON.parse(skills) : skills;

    if (req.files?.avatar?.[0]) {
        if (profile.avatarPublicId) {
            await deleteFromCloudinary(profile.avatarPublicId);
        }
        const result = await uploadToCloudinary(req.files.avatar[0].path, "portfolio/profile");
        profile.avatarUrl = result.url;
        profile.avatarPublicId = result.publicId;
        try { fs.unlinkSync(req.files.avatar[0].path); } catch (e) { /* temp file cleanup */ }
    }

    await profile.save();
    res.json({ success: true, message: "Profile updated", profile });
});

export const uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Resume file is required", "MISSING_RESUME");
    }

    let profile = await Profile.findOne({ userId: req.admin.id });
    if (!profile) {
        profile = new Profile({ userId: req.admin.id });
    }

    if (profile.resumePublicId) {
        await deleteFromCloudinary(profile.resumePublicId);
    }

    const result = await uploadToCloudinary(req.file.path, "portfolio/resume");
    profile.resumeUrl = result.url;
    profile.resumePublicId = result.publicId;
    try { fs.unlinkSync(req.file.path); } catch (e) { /* temp file cleanup */ }

    await profile.save();
    res.json({ success: true, message: "Resume uploaded", resumeUrl: profile.resumeUrl });
});
