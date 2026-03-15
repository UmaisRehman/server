import multer from "multer";
import path from "path";
import fs from "fs";

import os from 'os';



const uploadsDir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "uploads");


if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Images
        "image/jpeg", "image/png", "image/webp", "image/gif",
        // Documents
        "application/pdf", 
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "text/plain" // .txt
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only images (JPG/PNG/GIF/WEBP) and docs (PDF/DOC/DOCX/TXT) are allowed."), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 } // 25 MB limit
});
