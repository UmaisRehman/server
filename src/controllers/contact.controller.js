import Admin from "../models/admin.model.js";
import { sendOTPEmail } from "../utils/sendEmail.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nodemailer from "nodemailer";
import fs from "fs";

export const sendContactEmail = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { senderEmail, subject, message } = req.body;

    if (!senderEmail || !senderEmail.trim()) {
        throw new ApiError(400, "Your email address is required", "MISSING_SENDER_EMAIL");
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(senderEmail)) {
        throw new ApiError(400, "Please provide a valid email address", "INVALID_SENDER_EMAIL");
    }

    if (!subject || !subject.trim()) {
        throw new ApiError(400, "Subject is required", "MISSING_SUBJECT");
    }

    if (!message || !message.trim()) {
        throw new ApiError(400, "Message is required", "MISSING_MESSAGE");
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
        throw new ApiError(404, "Portfolio owner not found", "USER_NOT_FOUND");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        replyTo: senderEmail.trim(),
        subject: `[Portfolio Contact] ${subject.trim()}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px 30px; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0;">New Contact Message</h2>
                </div>
                <div style="background: #f8fafc; padding: 24px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #475569; margin: 0 0 8px;"><strong>From:</strong> ${senderEmail.trim()}</p>
                    <p style="color: #475569; margin: 0 0 8px;"><strong>Subject:</strong> ${subject.trim()}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                    <div style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</div>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
                    This email was sent from your portfolio contact form. Reply directly to respond to ${senderEmail.trim()}.
                </p>
            </div>
        `
    };

    if (req.file) {
        mailOptions.attachments = [
            {
                filename: req.file.originalname,
                path: req.file.path
            }
        ];
    }

    await transporter.sendMail(mailOptions);

    if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* temp cleanup */ }
    }

    res.json({
        success: true,
        message: "Your message has been sent successfully! The portfolio owner will receive it shortly."
    });
});
