

class ApiError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.name = 'ApiError';
        this.statusCode = statusCode;
        Error.captureStackTrace(this, ApiError)
    }

    static toProblemDetails(err) {
        return {
            type: "about:blank",
            title: err.message,
            details: err.message,
            instance: ""
        }
    }
}

module.exports = ApiError;
