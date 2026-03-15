import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: [true, "User ID is required"],
            index: true
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },
        description: {
            type: String,
            required: [true, "Description is required"]
        },
        techStack: {
            type: [String],
            default: []
        },
        liveUrl: {
            type: String,
            default: ""
        },
        githubUrl: {
            type: String,
            default: ""
        },
        thumbnail: {
            type: String,
            default: ""
        },
        thumbnailPublicId: {
            type: String,
            default: ""
        },
        category: {
            type: String,
            default: "Web App"
        },
        featured: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
