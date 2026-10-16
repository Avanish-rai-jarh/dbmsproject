const express = require("express");
const router = express.Router();

const { requireCsrfToken } = require("../middleware/csrfMiddleware");
const { requireCustomer } = require("../middleware/customerAuthMiddleware");
const { checkout } = require("../controllers/checkoutController");

router.use(requireCsrfToken);

router.post("/", requireCustomer, checkout);

module.exports = router;