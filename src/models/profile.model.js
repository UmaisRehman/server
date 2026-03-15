import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: [true, "User ID is required"],
            index: true
        },
        name: {
            type: String,
            default: "Your Name"
        },
        tagline: {
            type: String,
            default: "Full Stack Developer"
        },
        bio: {
            type: String,
            default: ""
        },
        email: {
            type: String,
            default: ""
        },
        phone: {
            type: String,
            default: ""
        },
        location: {
            type: String,
            default: ""
        },
        github: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: ""
        },
        website: {
            type: String,
            default: ""
        },
        skills: {
            type: [String],
            default: []
        },
        avatarUrl: {
            type: String,
            default: ""
        },
        avatarPublicId: {
            type: String,
            default: ""
        },
        resumeUrl: {
            type: String,
            default: ""
        },
        resumePublicId: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);
