const express = require("express");

const router = express.Router();

const {
    adminLogin,
    adminLogout,
    getAdminSession,
    customerRegister,
    customerLogin,
    customerLogout,
    getCurrentUser,
    updateCustomerProfile
} = require("../controllers/authController");

const loginRateLimiter = require("../middleware/loginRateLimiter");

const { requireCsrfToken } = require("../middleware/csrfMiddleware");

// Protect login and logout against CSRF.
router.post("/login", requireCsrfToken, loginRateLimiter, adminLogin);

router.post("/logout", requireCsrfToken, adminLogout);

router.get("/session", getAdminSession);

// Customer authentication
router.post(
    "/customer/register",
    requireCsrfToken,
    customerRegister
);

router.post(
    "/customer/login",
    requireCsrfToken,
    loginRateLimiter,
    customerLogin
);

router.post(
    "/customer/logout",
    requireCsrfToken,
    customerLogout
);

router.get("/current-user", getCurrentUser);

router.put("/profile", updateCustomerProfile);
module.exports = router;