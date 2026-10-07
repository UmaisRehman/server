import express from "express";
import {
    getPublicPortfolioConfig,
    getMyPortfolioConfig,
    saveDraftPortfolioConfig,
    publishPortfolioConfig,
    getVersionHistory,
    rollbackToVersion,
    resetDraftToDefault,
} from "../controllers/portfolioConfig.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public route for portfolio visitors
router.get("/public/:username", getPublicPortfolioConfig);

// Authenticated routes for admin portfolio studio
router.get("/draft", authenticateAdmin, getMyPortfolioConfig);
router.put("/draft", authenticateAdmin, saveDraftPortfolioConfig);
router.post("/publish", authenticateAdmin, publishPortfolioConfig);
router.get("/versions", authenticateAdmin, getVersionHistory);
router.post("/rollback/:versionId", authenticateAdmin, rollbackToVersion);
router.post("/reset", authenticateAdmin, resetDraftToDefault);

export default router;
