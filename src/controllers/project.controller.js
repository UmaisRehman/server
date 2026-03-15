import Project from "../models/project.model.js";
import Admin from "../models/admin.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import fs from "fs";

export const getAllProjects = asyncHandler(async (req, res) => {
    const projects = await Project.find({ userId: req.admin.id }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, projects });
});

export const getPublicProjects = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required", "MISSING_USERNAME");
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
        throw new ApiError(404, "Portfolio not found. This username does not exist.", "USER_NOT_FOUND");
    }

    const projects = await Project.find({ userId: admin._id }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, projects });
});

export const getProjectById = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.admin.id });

    if (!project) {
        throw new ApiError(404, "Project not found", "PROJECT_NOT_FOUND");
    }

    res.json({ success: true, project });
});

export const createProject = asyncHandler(async (req, res) => {
    const { title, description, techStack, liveUrl, githubUrl, category, featured, order } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Project title is required", "MISSING_TITLE");
    }

    if (!description || !description.trim()) {
        throw new ApiError(400, "Project description is required", "MISSING_DESCRIPTION");
    }

    let thumbnail = "";
    let thumbnailPublicId = "";

    if (req.file) {
        const result = await uploadToCloudinary(req.file.path, "portfolio/projects");
        thumbnail = result.url;
        thumbnailPublicId = result.publicId;
        try { fs.unlinkSync(req.file.path); } catch (e) { /* temp file cleanup */ }
    }

    const project = await Project.create({
        userId: req.admin.id,
        title: title.trim(),
        description: description.trim(),
        techStack: techStack ? (typeof techStack === "string" ? JSON.parse(techStack) : techStack) : [],
        liveUrl: liveUrl || "",
        githubUrl: githubUrl || "",
        thumbnail,
        thumbnailPublicId,
        category: category || "Web App",
        featured: featured === "true" || featured === true,
        order: order ? Number(order) : 0
    });

    res.status(201).json({ success: true, message: "Project created", project });
});

export const updateProject = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.admin.id });

    if (!project) {
        throw new ApiError(404, "Project not found or you don't have permission to edit it", "PROJECT_NOT_FOUND");
    }

    const { title, description, techStack, liveUrl, githubUrl, category, featured, order } = req.body;

    if (req.file) {
        if (project.thumbnailPublicId) {
            await deleteFromCloudinary(project.thumbnailPublicId);
        }
        const result = await uploadToCloudinary(req.file.path, "portfolio/projects");
        project.thumbnail = result.url;
        project.thumbnailPublicId = result.publicId;
        try { fs.unlinkSync(req.file.path); } catch (e) { /* temp file cleanup */ }
    }

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (techStack !== undefined) project.techStack = typeof techStack === "string" ? JSON.parse(techStack) : techStack;
    if (liveUrl !== undefined) project.liveUrl = liveUrl;
    if (githubUrl !== undefined) project.githubUrl = githubUrl;
    if (category !== undefined) project.category = category;
    if (featured !== undefined) project.featured = featured === "true" || featured === true;
    if (order !== undefined) project.order = Number(order);

    await project.save();
    res.json({ success: true, message: "Project updated", project });
});

export const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.admin.id });

    if (!project) {
        throw new ApiError(404, "Project not found or you don't have permission to delete it", "PROJECT_NOT_FOUND");
    }

    if (project.thumbnailPublicId) {
        await deleteFromCloudinary(project.thumbnailPublicId);
    }

    await Project.findByIdAndDelete(project._id);
    res.json({ success: true, message: "Project deleted" });
});
