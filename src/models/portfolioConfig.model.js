import mongoose from "mongoose";

/**
 * One document per user. `draft` is what the admin studio edits (manually or via AI);
 * `published` is the only thing the public portfolio ever reads.
 * Both are validated with portfolioConfigSchema before being written.
 */
const portfolioConfigSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
            unique: true,
        },
        draft: { type: mongoose.Schema.Types.Mixed, default: null },
        published: { type: mongoose.Schema.Types.Mixed, default: null },
        draftUpdatedAt: { type: Date, default: null },
        publishedAt: { type: Date, default: null },
    },
    { timestamps: true, minimize: false }
);

export default mongoose.model("PortfolioConfig", portfolioConfigSchema);
