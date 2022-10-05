class ApiError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.name = 'ApiError';
        this.statusCode = statusCode;
        Error.captureStackTrace(this, ApiError)
    }
}

module.exports = ApiError;
