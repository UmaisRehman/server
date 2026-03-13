import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (filePath, folder = "portfolio") => {
    
    const isPDF = filePath.toLowerCase().endsWith('.pdf');
    console.log(`[Cloudinary] Uploading file: ${filePath}, isPDF: ${isPDF}`);

    
    let options;
    if (isPDF) {
        options = {
            folder,
            resource_type: "raw", 
        };
    } else {
        options = {
            folder,
            resource_type: "auto",
            format: "webp",       
            quality: "auto:eco",  
            fetch_format: "auto", 
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
