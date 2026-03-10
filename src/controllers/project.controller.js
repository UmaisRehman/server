import Project from "../models/project.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

// GET all projects (public)
export const getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ order: 1, createdAt: -1 });
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET single project (public)
export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.json({ project });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST create project (admin)
export const createProject = async (req, res) => {
    try {
        const { title, description, techStack, liveUrl, githubUrl, category, featured, order } = req.body;

        let thumbnail = "";
        let thumbnailPublicId = "";

        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, "portfolio/projects");
            thumbnail = result.url;
            thumbnailPublicId = result.publicId;
            // Clean up temp file
            fs.unlinkSync(req.file.path);
        }

        const project = await Project.create({
            title,
            description,
            techStack: techStack ? (typeof techStack === 'string' ? JSON.parse(techStack) : techStack) : [],
            liveUrl,
            githubUrl,
            thumbnail,
            thumbnailPublicId,
            category,
            featured: featured === 'true' || featured === true,
            order: order ? Number(order) : 0
        });

        res.status(201).json({ message: "Project created", project });
    } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT update project (admin)
export const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const { title, description, techStack, liveUrl, githubUrl, category, featured, order } = req.body;

        // Handle new thumbnail upload
        if (req.file) {
            // Delete old thumbnail from Cloudinary
            await deleteFromCloudinary(project.thumbnailPublicId);

            const result = await uploadToCloudinary(req.file.path, "portfolio/projects");
            project.thumbnail = result.url;
            project.thumbnailPublicId = result.publicId;
            fs.unlinkSync(req.file.path);
        }

        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (techStack !== undefined) project.techStack = typeof techStack === 'string' ? JSON.parse(techStack) : techStack;
        if (liveUrl !== undefined) project.liveUrl = liveUrl;
        if (githubUrl !== undefined) project.githubUrl = githubUrl;
        if (category !== undefined) project.category = category;
        if (featured !== undefined) project.featured = featured === 'true' || featured === true;
        if (order !== undefined) project.order = Number(order);

        await project.save();
        res.json({ message: "Project updated", project });
    } catch (error) {
        console.error("Update project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE project (admin)
export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Delete thumbnail from Cloudinary
        await deleteFromCloudinary(project.thumbnailPublicId);

        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: "Project deleted" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
