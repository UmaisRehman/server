import express from "express";
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public
router.get("/", getAllProjects);
router.get("/:id", getProjectById);

// Admin only
router.post("/", authenticateAdmin, upload.single("thumbnail"), createProject);
router.put("/:id", authenticateAdmin, upload.single("thumbnail"), updateProject);
router.delete("/:id", authenticateAdmin, deleteProject);

export default router;
