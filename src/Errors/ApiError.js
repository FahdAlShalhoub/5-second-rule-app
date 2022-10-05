class ApiError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ApiError'
        Error.captureStackTrace(this, ApiError)
    }
}

module.exports = ApiError;
