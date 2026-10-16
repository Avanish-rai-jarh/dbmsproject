const express = require("express");
const router = express.Router();

const {
    trackOrder,
    getMyOrders,
    getMyOrderDetails
} = require("../controllers/orderController");

const {
    requireCustomer
} = require("../middleware/customerAuthMiddleware");

const {
    requireCsrfToken
} = require("../middleware/csrfMiddleware");

// Existing tracking route remains available.
router.post("/track", requireCustomer, requireCsrfToken, trackOrder);

// Customer-specific order history.
router.get("/my-orders", requireCustomer, getMyOrders);

router.get("/:id/details", requireCustomer, getMyOrderDetails);

module.exports = router;