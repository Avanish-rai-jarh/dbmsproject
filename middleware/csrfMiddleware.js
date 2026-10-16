const crypto = require("crypto");

function getCsrfToken(req, res) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    res.json({
        success: true,
        csrfToken: req.session.csrfToken
    });
}

function requireCsrfToken(req, res, next) {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(req.method)) {
        return next();
    }
    const sessionToken = req.session?.csrfToken;
    const requestToken = req.get("X-CSRF-Token");

    if (
        typeof sessionToken !== "string" ||
        typeof requestToken !== "string"
    ) {
        return res.status(403).json({
            success: false,
            message: "Invalid or missing CSRF token."
        });
    }

    const sessionBuffer = Buffer.from(sessionToken);
    const requestBuffer = Buffer.from(requestToken);

    // Check lengths before calling timingSafeEqual().
    if (sessionBuffer.length !== requestBuffer.length) {
        return res.status(403).json({
            success: false,
            message: "Invalid or missing CSRF token."
        });
    }

    if (!crypto.timingSafeEqual(sessionBuffer, requestBuffer)) {
        return res.status(403).json({
            success: false,
            message: "Invalid or missing CSRF token."
        });
    }

    next();
}

module.exports = {
    getCsrfToken,
    requireCsrfToken
};