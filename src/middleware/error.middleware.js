// Global Error Handler

const errorHandler = (
    err,
    req,
    res,
    next
) => {
    console.error(err.stack);

    return res.status(500).json({
        success: false,
        message:
            err.message ||
            "Internal Server Error",
    });
};


// Route Not Found Handler

const notFound = (
    req,
    res,
    next
) => {
    return res.status(404).json({
        success: false,
        message: `Route not found - ${req.originalUrl}`,
    });
};

module.exports = {
    errorHandler,
    notFound,
};

