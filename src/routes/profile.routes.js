import express from "express";
import { getProfile, updateProfile, uploadResume } from "../controllers/profile.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public
router.get("/", getProfile);

// Admin only
router.put("/", authenticateAdmin, upload.fields([{ name: "avatar", maxCount: 1 }]), updateProfile);
router.post("/resume", authenticateAdmin, upload.single("resume"), uploadResume);

export default router;
