import express from "express";
import rateLimit from "express-rate-limit";
import { chatWithAi, extractGitHub, polishBio } from "../controllers/ai.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

const aiRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 60, // 60 AI interactions per 10 mins per user
    message: {
        success: false,
        message: "AI rate limit reached. Please wait a few minutes before sending more messages.",
        errorCode: "AI_RATE_LIMIT",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(authenticateAdmin);
router.use(aiRateLimiter);

router.post("/chat", chatWithAi);
router.post("/extract-github", extractGitHub);
router.post("/polish-bio", polishBio);

export default router;
