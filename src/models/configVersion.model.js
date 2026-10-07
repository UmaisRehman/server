import mongoose from "mongoose";

/**
 * Immutable snapshot created every time a user PUBLISHES.
 * Only approved states are stored (not every chat message) to keep storage bounded.
 */
const configVersionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        config: { type: mongoose.Schema.Types.Mixed, required: true },
        note: { type: String, default: "", maxlength: 200 },
        source: { type: String, enum: ["manual", "ai", "restore"], default: "manual" },
    },
    { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);

configVersionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("ConfigVersion", configVersionSchema);
