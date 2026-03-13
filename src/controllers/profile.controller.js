import Profile from "../models/profile.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";


export const getProfile = async (req, res) => {
    try {
        let profile = await Profile.findOne();
        if (!profile) {
            profile = await Profile.create({});
        }
        res.json({ profile });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};


export const updateProfile = async (req, res) => {
    try {
        let profile = await Profile.findOne();
        if (!profile) profile = new Profile();

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
        if (skills !== undefined) profile.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;

        
        if (req.files?.avatar?.[0]) {
            await deleteFromCloudinary(profile.avatarPublicId);
            const result = await uploadToCloudinary(req.files.avatar[0].path, "portfolio/profile");
            profile.avatarUrl = result.url;
            profile.avatarPublicId = result.publicId;
            fs.unlinkSync(req.files.avatar[0].path);
        }

        await profile.save();
        res.json({ message: "Profile updated", profile });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const uploadResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Resume file is required" });

        let profile = await Profile.findOne();
        if (!profile) profile = new Profile();

        
        await deleteFromCloudinary(profile.resumePublicId);

        
        console.log("Resume file path:", req.file.path);
        console.log("Resume original name:", req.file.originalname);
        const result = await uploadToCloudinary(req.file.path, "portfolio/resume");
        console.log("Cloudinary resume upload result URL:", result.url);
        profile.resumeUrl = result.url;
        profile.resumePublicId = result.publicId;
        fs.unlinkSync(req.file.path);

        await profile.save();
        res.json({ message: "Resume uploaded", resumeUrl: profile.resumeUrl });
    } catch (error) {
        console.error("Upload resume error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
