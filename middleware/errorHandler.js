function errorHandler(err, req, res, next) {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "An internal server error occurred."
    });
}

module.exports = errorHandler;