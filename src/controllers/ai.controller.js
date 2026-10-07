import { processAiMessage, generatePolishedBio } from "../services/ai.service.js";
import { extractGitHubData } from "../services/githubImport.service.js";
import Profile from "../models/profile.model.js";
import Project from "../models/project.model.js";
import PortfolioConfig from "../models/portfolioConfig.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Handle conversational AI message from admin studio.
 */
export const chatWithAi = asyncHandler(async (req, res) => {
    const { message, history, currentConfig } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
        throw new ApiError(400, "Message cannot be empty", "EMPTY_MESSAGE");
    }

    const [profile, projects, configDoc] = await Promise.all([
        Profile.findOne({ userId: req.admin.id }),
        Project.find({ userId: req.admin.id }),
        PortfolioConfig.findOne({ userId: req.admin.id }),
    ]);

    const activeConfig = currentConfig || configDoc?.draft || undefined;

    const result = await processAiMessage({
        message: message.trim(),
        history: history || [],
        currentConfig: activeConfig,
        currentProfile: profile,
        currentProjects: projects,
    });

    res.json({
        success: true,
        ...result,
    });
});

/**
 * Extract public profile, technologies, and projects from a GitHub username or URL.
 */
export const extractGitHub = asyncHandler(async (req, res) => {
    const { urlOrUsername } = req.body;

    if (!urlOrUsername || typeof urlOrUsername !== "string") {
        throw new ApiError(400, "GitHub URL or username is required", "MISSING_GITHUB_TARGET");
    }

    try {
        const extracted = await extractGitHubData(urlOrUsername);
        res.json({
            success: true,
            message: `Successfully extracted GitHub profile for @${extracted.username}`,
            data: extracted,
        });
    } catch (err) {
        throw new ApiError(400, err.message || "Failed to extract GitHub data", "GITHUB_EXTRACT_FAILED");
    }
});

/**
 * Quick bio enhancer.
 */
export const polishBio = asyncHandler(async (req, res) => {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== "string") {
        throw new ApiError(400, "Text is required to polish", "EMPTY_TEXT");
    }

    const polished = generatePolishedBio(rawText);

    res.json({
        success: true,
        polishedBio: polished,
    });
});
