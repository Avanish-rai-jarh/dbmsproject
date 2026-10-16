const express = require("express");
const router = express.Router();

const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

const { requireCsrfToken } = require("../middleware/csrfMiddleware");
const { requireCustomer } = require("../middleware/customerAuthMiddleware");

router.use(requireCustomer);
router.use(requireCsrfToken);

function formatCart(items) {
    const totalQuantity = items.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    return {
        items,
        totalQuantity,
        total: Number(total.toFixed(2))
    };
}

// GET /api/cart
// Return only the authenticated customer's cart.
router.get("/", async (req, res, next) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                ci.item_id,
                mi.item_name,
                mi.price,
                mi.is_available,
                ci.quantity
             FROM customer_cart_items ci
             JOIN menu_items mi
               ON mi.item_id = ci.item_id
             WHERE ci.customer_id = :customerId
             ORDER BY mi.item_name`,
            {
                customerId: req.session.customer.customerId
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        const items = result.rows.map(row => ({
            id: row.ITEM_ID,
            name: row.ITEM_NAME,
            price: Number(row.PRICE),
            quantity: Number(row.QUANTITY),
            available: row.IS_AVAILABLE === "Y"
        }));

        return res.json({
            success: true,
            cart: formatCart(items)
        });
    } catch (error) {
        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }
    }
});

// POST /api/cart/items
// Add an item to the authenticated customer's cart.
router.post("/items", async (req, res, next) => {
    let connection;

    try {
        const itemId = Number(req.body.item_id);
        const quantity = Number(req.body.quantity ?? 1);

        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID."
            });
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > 99
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be between 1 and 99."
            });
        }

        connection = await getConnection();

        const customerId = req.session.customer.customerId;

        const itemResult = await connection.execute(
            `SELECT item_id, item_name, price, is_available
             FROM menu_items
             WHERE item_id = :itemId`,
            { itemId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found."
            });
        }

        const dbItem = itemResult.rows[0];

        if (dbItem.IS_AVAILABLE !== "Y") {
            return res.status(409).json({
                success: false,
                message: "This item is currently unavailable."
            });
        }

        // Lock an existing cart row so concurrent updates cannot
        // silently overwrite its quantity.
        const existingResult = await connection.execute(
            `SELECT quantity
             FROM customer_cart_items
             WHERE customer_id = :customerId
               AND item_id = :itemId
             FOR UPDATE`,
            { customerId, itemId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const existingQuantity = existingResult.rows.length
            ? Number(existingResult.rows[0].QUANTITY)
            : 0;

        const newQuantity = existingQuantity + quantity;

        if (newQuantity > 99) {
            return res.status(400).json({
                success: false,
                message: "Maximum quantity per item is 99."
            });
        }

        if (existingResult.rows.length) {
            await connection.execute(
                `UPDATE customer_cart_items
                 SET quantity = :quantity,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE customer_id = :customerId
                   AND item_id = :itemId`,
                {
                    quantity: newQuantity,
                    customerId,
                    itemId
                }
            );
        } else {
            await connection.execute(
                `INSERT INTO customer_cart_items (
                    customer_id,
                    item_id,
                    quantity
                )
                VALUES (
                    :customerId,
                    :itemId,
                    :quantity
                )`,
                {
                    customerId,
                    itemId,
                    quantity: newQuantity
                }
            );
        }

        await connection.commit();

        const cartResult = await connection.execute(
            `SELECT
                ci.item_id,
                mi.item_name,
                mi.price,
                mi.is_available,
                ci.quantity
             FROM customer_cart_items ci
             JOIN menu_items mi
               ON mi.item_id = ci.item_id
             WHERE ci.customer_id = :customerId
             ORDER BY mi.item_name`,
            { customerId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const items = cartResult.rows.map(row => ({
            id: row.ITEM_ID,
            name: row.ITEM_NAME,
            price: Number(row.PRICE),
            quantity: Number(row.QUANTITY),
            available: row.IS_AVAILABLE === "Y"
        }));

        return res.json({
            success: true,
            message: "Item added to cart.",
            cart: formatCart(items)
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Cart rollback error:", rollbackError.message);
            }
        }

        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }
    }
});

// PATCH /api/cart/items/:id
// Update quantity. A quantity of zero removes the item.
router.patch("/items/:id", async (req, res, next) => {
    let connection;

    try {
        const itemId = Number(req.params.id);
        const quantity = Number(req.body.quantity);

        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID."
            });
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 0 ||
            quantity > 99
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be between 0 and 99."
            });
        }

        connection = await getConnection();

        const customerId = req.session.customer.customerId;

        const existing = await connection.execute(
            `SELECT item_id
             FROM customer_cart_items
             WHERE customer_id = :customerId
               AND item_id = :itemId
             FOR UPDATE`,
            { customerId, itemId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart."
            });
        }

        if (quantity === 0) {
            await connection.execute(
                `DELETE FROM customer_cart_items
                 WHERE customer_id = :customerId
                   AND item_id = :itemId`,
                { customerId, itemId }
            );
        } else {
            await connection.execute(
                `UPDATE customer_cart_items
                 SET quantity = :quantity,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE customer_id = :customerId
                   AND item_id = :itemId`,
                { customerId, itemId, quantity }
            );
        }

        await connection.commit();

        const result = await connection.execute(
            `SELECT
                ci.item_id,
                mi.item_name,
                mi.price,
                mi.is_available,
                ci.quantity
             FROM customer_cart_items ci
             JOIN menu_items mi
               ON mi.item_id = ci.item_id
             WHERE ci.customer_id = :customerId
             ORDER BY mi.item_name`,
            { customerId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const items = result.rows.map(row => ({
            id: row.ITEM_ID,
            name: row.ITEM_NAME,
            price: Number(row.PRICE),
            quantity: Number(row.QUANTITY),
            available: row.IS_AVAILABLE === "Y"
        }));

        return res.json({
            success: true,
            message: "Cart updated.",
            cart: formatCart(items)
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Cart rollback error:", rollbackError.message);
            }
        }

        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }
    }
});

// DELETE /api/cart/items/:id
router.delete("/items/:id", async (req, res, next) => {
    let connection;

    try {
        const itemId = Number(req.params.id);

        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID."
            });
        }

        connection = await getConnection();

        const customerId = req.session.customer.customerId;

        await connection.execute(
            `DELETE FROM customer_cart_items
             WHERE customer_id = :customerId
               AND item_id = :itemId`,
            { customerId, itemId }
        );

        await connection.commit();

        const result = await connection.execute(
            `SELECT
                ci.item_id,
                mi.item_name,
                mi.price,
                mi.is_available,
                ci.quantity
             FROM customer_cart_items ci
             JOIN menu_items mi
               ON mi.item_id = ci.item_id
             WHERE ci.customer_id = :customerId
             ORDER BY mi.item_name`,
            { customerId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const items = result.rows.map(row => ({
            id: row.ITEM_ID,
            name: row.ITEM_NAME,
            price: Number(row.PRICE),
            quantity: Number(row.QUANTITY),
            available: row.IS_AVAILABLE === "Y"
        }));

        return res.json({
            success: true,
            message: "Item removed.",
            cart: formatCart(items)
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Cart rollback error:", rollbackError.message);
            }
        }

        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }
    }
});

// DELETE /api/cart
router.delete("/", async (req, res, next) => {
    let connection;

    try {
        connection = await getConnection();

        await connection.execute(
            `DELETE FROM customer_cart_items
             WHERE customer_id = :customerId`,
            { customerId: req.session.customer.customerId }
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Cart cleared.",
            cart: formatCart([])
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Cart rollback error:", rollbackError.message);
            }
        }

        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }
    }
});

module.exports = router;