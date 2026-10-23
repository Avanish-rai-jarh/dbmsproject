const express = require("express");

const router = express.Router();

const { requireAdmin } = require("../middleware/authMiddleware");
const { requireCsrfToken } = require("../middleware/csrfMiddleware");

const {
    getAllMenuItems,
    addMenuItem,
    getCategories,
    addCategory,
    updateMenuItem,
    toggleMenuAvailability,
    getAllOrders,
    updateOrderStatus,
    markPaymentPaid,
    refundPayment,
    getRefundHistory,
    getAssignedItems,
    updateAssignedItemStatus,
    getMenuItemAssignments,
    updateMenuItemAssignments,
    deleteMenuItem,
    getRevenueAnalytics
} = require("../controllers/adminController");

// Require admin authentication for every admin API route.
router.use(requireAdmin);

// Require CSRF tokens for state-changing requests.
// GET, HEAD, and OPTIONS bypass validation in the middleware.
router.use(requireCsrfToken);

// Categories
router.get("/categories", getCategories);
router.post("/categories", addCategory);

// Menu items
router.get("/items", getAllMenuItems);
router.post("/items", addMenuItem);
router.put("/items/:id", updateMenuItem);
router.patch("/items/:id/availability", toggleMenuAvailability);

// Existing order management
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/payment/paid", markPaymentPaid);
router.patch("/orders/:id/payment/refund", refundPayment);

// Existing refund history
router.get("/refund-history", getRefundHistory);

// New item-level admin management
router.get("/assigned-items", getAssignedItems);

router.patch(
    "/assigned-items/:orderId/:itemId/status",
    updateAssignedItemStatus
);

router.get("/assignments", getMenuItemAssignments);

router.put("/items/:id/admins", updateMenuItemAssignments);

router.delete("/items/:id", deleteMenuItem);
// CFO financial analytics
router.get("/revenue-analytics", getRevenueAnalytics);

module.exports = router;