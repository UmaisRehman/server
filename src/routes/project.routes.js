import express from "express";
import { getAllProjects, getPublicProjects, getProjectById, createProject, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/public/:username", getPublicProjects);

router.get("/", authenticateAdmin, getAllProjects);
router.get("/:id", authenticateAdmin, getProjectById);

router.post("/", authenticateAdmin, upload.single("thumbnail"), createProject);
router.put("/:id", authenticateAdmin, upload.single("thumbnail"), updateProject);
router.delete("/:id", authenticateAdmin, deleteProject);

export default router;
