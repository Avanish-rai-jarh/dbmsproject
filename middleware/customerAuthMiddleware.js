function requireCustomer(req, res, next) {
    if (!req.session || !req.session.customer) {
        return res.status(401).json({
            success: false,
            message: "Please log in to your customer account."
        });
    }

    next();
}

module.exports = {
    requireCustomer
};