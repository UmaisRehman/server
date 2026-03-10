import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (filePath, folder = "portfolio") => {
    // Check if the file is a PDF
    const isPDF = filePath.toLowerCase().endsWith('.pdf');
    console.log(`[Cloudinary] Uploading file: ${filePath}, isPDF: ${isPDF}`);

    // For PDFs, we just upload them as raw files without image transformations
    let options;
    if (isPDF) {
        options = {
            folder,
            resource_type: "raw", // CRITICAL for PDFs so they get '/raw/upload/' URL
        };
    } else {
        options = {
            folder,
            resource_type: "auto",
            format: "webp",       // Convert everything to WebP for smaller size
            quality: "auto:eco",  // Aggressive compression that looks good
            fetch_format: "auto", // Delivery optimization
        };
    }

    console.log(`[Cloudinary] Upload options:`, JSON.stringify(options));
    const result = await cloudinary.uploader.upload(filePath, options);
    console.log(`[Cloudinary] Result URL: ${result.secure_url}`);
    
    return { url: result.secure_url, publicId: result.public_id };
};

export const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
