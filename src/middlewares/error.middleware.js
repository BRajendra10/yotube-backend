const errorHandler = (err, req, res, next) => {
    // Defaults (for unknown errors)
    let statusCode = 500;
    let message = "Internal Server Error";
    let errors = [];

    // ✅ Operational error → safe to expose
    if (err.isOperational) {
        statusCode = err.statusCode;
        message = err.message;
        errors = err.errors;
    }
    // ❌ Programmer / unknown error → log fully
    else {
        console.error("🔥 PROGRAMMER ERROR:", err);
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors
    });
};

export { errorHandler };
