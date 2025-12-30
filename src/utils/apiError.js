class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = []
    ) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true;
        // any error that will go through this error class then it's a operational error.
        this.success = false;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export { ApiError };
