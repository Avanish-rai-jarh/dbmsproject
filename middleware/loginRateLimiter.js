const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    // Allow up to 5 login attempts per IP in 15 minutes.
    limit: 5,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

module.exports = loginRateLimiter;