import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    let errorCode = err.errorCode || "INTERNAL_ERROR";

    // Mongoose validation error
    if (err.name === "ValidationError") {
        statusCode = 400;
        const messages = Object.values(err.errors).map((e) => e.message);
        message = messages.join(", ");
        errorCode = "VALIDATION_ERROR";
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
        errorCode = "DUPLICATE_FIELD";
    }

    // Mongoose bad ObjectId
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 400;
        message = "Invalid ID format";
        errorCode = "INVALID_ID";
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token. Please login again";
        errorCode = "INVALID_TOKEN";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired. Please login again";
        errorCode = "TOKEN_EXPIRED";
    }

    // Multer file errors
    if (err.code === "LIMIT_FILE_SIZE") {
        statusCode = 413;
        message = "File too large. Maximum size is 10MB";
        errorCode = "FILE_TOO_LARGE";
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        statusCode = 400;
        message = "Unexpected file field";
        errorCode = "UNEXPECTED_FILE";
    }

    // Multer custom error (from fileFilter)
    if (err.message && err.message.includes("Invalid file type")) {
        statusCode = 400;
        errorCode = "INVALID_FILE_TYPE";
    }

    // Cloudinary errors
    if (err.http_code && err.message && err.name === "Error") {
        statusCode = 502;
        message = "Cloud storage error. Please try again later";
        errorCode = "CLOUDINARY_ERROR";
    }

    // Nodemailer / Email errors
    if (err.code === "EAUTH" || err.command === "API" || (err.message && err.message.includes("Missing credentials"))) {
        statusCode = 503;
        message = "Email service is not configured properly. Contact the administrator";
        errorCode = "EMAIL_SERVICE_ERROR";
    }

    if (err.code === "ECONNREFUSED") {
        statusCode = 503;
        message = "Service temporarily unavailable. Please try again later";
        errorCode = "SERVICE_UNAVAILABLE";
    }

    console.error(`[ERROR] ${errorCode}: ${message}`, process.env.NODE_ENV !== "production" ? err.stack : "");

    res.status(statusCode).json({
        success: false,
        message,
        errorCode,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
};

export default errorHandler;
