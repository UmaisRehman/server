import PortfolioConfig from "../models/portfolioConfig.model.js";
import ConfigVersion from "../models/configVersion.model.js";
import Admin from "../models/admin.model.js";
import {
    DEFAULT_PORTFOLIO_CONFIG,
    validatePortfolioConfig,
} from "../schemas/portfolioConfig.schema.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Public endpoint: Get published portfolio config for a given username.
 * If user has no custom published config, returns the platform DEFAULT_PORTFOLIO_CONFIG.
 */
export const getPublicPortfolioConfig = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username) {
        throw new ApiError(400, "Username is required", "MISSING_USERNAME");
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
        throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    }

    const doc = await PortfolioConfig.findOne({ userId: admin._id });
    if (!doc || !doc.published) {
        return res.json({
            success: true,
            config: DEFAULT_PORTFOLIO_CONFIG,
            isDefault: true,
            publishedAt: null,
        });
    }

    res.json({
        success: true,
        config: doc.published,
        isDefault: false,
        publishedAt: doc.publishedAt,
    });
});

/**
 * Authenticated: Get current draft and published status for the logged-in admin.
 */
export const getMyPortfolioConfig = asyncHandler(async (req, res) => {
    let doc = await PortfolioConfig.findOne({ userId: req.admin.id });
    if (!doc) {
        doc = await PortfolioConfig.create({
            userId: req.admin.id,
            draft: DEFAULT_PORTFOLIO_CONFIG,
            published: null,
            draftUpdatedAt: new Date(),
        });
    }

    res.json({
        success: true,
        draft: doc.draft || DEFAULT_PORTFOLIO_CONFIG,
        published: doc.published,
        draftUpdatedAt: doc.draftUpdatedAt,
        publishedAt: doc.publishedAt,
    });
});

/**
 * Authenticated: Save updated draft config.
 * Runs strict zod validation before persisting.
 */
export const saveDraftPortfolioConfig = asyncHandler(async (req, res) => {
    const rawConfig = req.body.config || req.body;
    const validation = validatePortfolioConfig(rawConfig);

    if (!validation.ok) {
        return res.status(400).json({
            success: false,
            message: "Portfolio configuration validation failed",
            errorCode: "INVALID_CONFIG",
            issues: validation.issues,
        });
    }

    let doc = await PortfolioConfig.findOne({ userId: req.admin.id });
    if (!doc) {
        doc = new PortfolioConfig({ userId: req.admin.id });
    }

    doc.draft = validation.config;
    doc.draftUpdatedAt = new Date();
    await doc.save();

    res.json({
        success: true,
        message: "Draft saved successfully",
        draft: doc.draft,
        draftUpdatedAt: doc.draftUpdatedAt,
    });
});

/**
 * Authenticated: Promote draft to published.
 * Creates an immutable snapshot in ConfigVersion collection.
 */
export const publishPortfolioConfig = asyncHandler(async (req, res) => {
    let doc = await PortfolioConfig.findOne({ userId: req.admin.id });
    const targetConfig = doc?.draft || DEFAULT_PORTFOLIO_CONFIG;

    const validation = validatePortfolioConfig(targetConfig);
    if (!validation.ok) {
        return res.status(400).json({
            success: false,
            message: "Cannot publish invalid configuration",
            errorCode: "INVALID_CONFIG",
            issues: validation.issues,
        });
    }

    if (!doc) {
        doc = new PortfolioConfig({ userId: req.admin.id });
    }

    doc.draft = validation.config;
    doc.published = validation.config;
    doc.publishedAt = new Date();
    await doc.save();

    // Create version snapshot
    const version = await ConfigVersion.create({
        userId: req.admin.id,
        config: doc.published,
        note: (req.body.note || "Published portfolio configuration").slice(0, 200),
        source: req.body.source || "manual",
    });

    res.json({
        success: true,
        message: "Portfolio configuration published live! 🚀",
        published: doc.published,
        publishedAt: doc.publishedAt,
        versionId: version._id,
    });
});

/**
 * Authenticated: List past version snapshots (up to 20).
 */
export const getVersionHistory = asyncHandler(async (req, res) => {
    const versions = await ConfigVersion.find({ userId: req.admin.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("_id note source createdAt");

    res.json({
        success: true,
        versions,
    });
});

/**
 * Authenticated: Rollback draft (or live) to a historical snapshot.
 */
export const rollbackToVersion = asyncHandler(async (req, res) => {
    const { versionId } = req.params;
    const { applyLive } = req.body;

    const versionDoc = await ConfigVersion.findOne({
        _id: versionId,
        userId: req.admin.id,
    });

    if (!versionDoc) {
        throw new ApiError(404, "Version snapshot not found", "VERSION_NOT_FOUND");
    }

    const validation = validatePortfolioConfig(versionDoc.config);
    if (!validation.ok) {
        throw new ApiError(400, "Historical snapshot failed current schema validation", "CORRUPT_VERSION");
    }

    let doc = await PortfolioConfig.findOne({ userId: req.admin.id });
    if (!doc) {
        doc = new PortfolioConfig({ userId: req.admin.id });
    }

    doc.draft = validation.config;
    doc.draftUpdatedAt = new Date();

    if (applyLive) {
        doc.published = validation.config;
        doc.publishedAt = new Date();
    }

    await doc.save();

    res.json({
        success: true,
        message: applyLive ? "Snapshot rolled back and published live!" : "Snapshot restored to draft preview",
        draft: doc.draft,
        published: doc.published,
    });
});

/**
 * Authenticated: Reset draft back to DEFAULT_PORTFOLIO_CONFIG.
 */
export const resetDraftToDefault = asyncHandler(async (req, res) => {
    let doc = await PortfolioConfig.findOne({ userId: req.admin.id });
    if (!doc) {
        doc = new PortfolioConfig({ userId: req.admin.id });
    }

    doc.draft = DEFAULT_PORTFOLIO_CONFIG;
    doc.draftUpdatedAt = new Date();
    await doc.save();

    res.json({
        success: true,
        message: "Draft reset to platform default",
        draft: doc.draft,
    });
});
