const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const menuRoutes = require("./routes/menuRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middleware/errorHandler");
const {
    getCsrfToken,
    requireCsrfToken
} = require("./middleware/csrfMiddleware");

const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const { requireAdminPage } = require("./middleware/adminPageMiddleware");

const {
    initializePool,
    closePool
} = require("./config/db");

const app = express();
const PORT = process.env.PORT || 2005;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProduction = process.env.NODE_ENV === "production";

app.use(session({
    name: "campusbite.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 3
    }
}));


// Generate a CSRF token for the current session.
app.get("/api/csrf-token", getCsrfToken);

// Protect the admin dashboard before serving static files.
app.get("/admin.html", requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Serve other public files normally.
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Smart Canteen API is running!"
    });
});

app.use("/api/menu", menuRoutes);
app.use("/api/admin", adminRoutes);

// Cart routes will be registered here
app.use("/api/cart", cartRoutes);

//for checkout
app.use("/api/checkout", checkoutRoutes);

//track order
app.use("/api/orders", orderRoutes);

//admin
app.use("/api/auth", authRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        if (!process.env.SESSION_SECRET) {
            throw new Error("SESSION_SECRET is missing from .env");
        }

        await initializePool();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Unable to start the server:", error.message);
        process.exitCode = 1;
    }
}

async function shutdown() {
    try {
        await closePool();
    } catch (error) {
        console.error("Error closing Oracle pool:", error);
    } finally {
        process.exit();
    }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();