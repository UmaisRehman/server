class ApiError extends Error {
    constructor(statusCode, message, errorCode = "UNKNOWN_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;
