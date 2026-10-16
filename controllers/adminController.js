const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

// GET: Retrieve all menu items
async function getAllMenuItems(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                m.item_id,
                m.item_name,
                m.category_id,
                c.category_name,
                m.price,
                m.is_available,
                m.image_url
             FROM menu_items m
             JOIN categories c
                ON m.category_id = c.category_id
             WHERE m.created_by_admin_id = :adminId
             ORDER BY m.item_id DESC`,
            { adminId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            items: result.rows
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

// POST: Add a new menu item
async function addMenuItem(req, res, next) {
    console.log("ADD MENU ITEM: Request received");
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const { item_name, category_id, price, image_url } = req.body;

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        if (
            typeof item_name !== "string" ||
            !item_name.trim() ||
            item_name.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a food name between 1 and 100 characters."
            });
        }

        const categoryId = Number(category_id);
        const itemPrice = Number(price);
        const imageUrl = typeof image_url === "string"
            ? image_url.trim()
            : "";

        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Select a valid category."
            });
        }

        if (
            !Number.isFinite(itemPrice) ||
            itemPrice < 0 ||
            Math.round(itemPrice * 100) !== itemPrice * 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid price with at most two decimal places."
            });
        }

        if (imageUrl.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Image URL must not exceed 1000 characters."
            });
        }

        if (imageUrl) {
            try {
                const parsedUrl = new URL(imageUrl);

                if (
                    parsedUrl.protocol !== "https:" &&
                    parsedUrl.protocol !== "http:"
                ) {
                    throw new Error("Invalid URL protocol");
                }
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Provide a valid HTTP or HTTPS image URL."
                });
            }
        }

        console.log("ADD MENU ITEM: Getting database connection");

        connection = await getConnection();

        console.log("ADD MENU ITEM: Database connection acquired");
        console.log("ADD MENU ITEM: Inserting menu item");
        const result = await connection.execute(
            `INSERT INTO menu_items (
                item_name,
                category_id,
                price,
                is_available,
                image_url,
                created_by_admin_id
             )
             VALUES (
                :item_name,
                :category_id,
                :price,
                'Y',
                :image_url,
                :adminId
             )
             RETURNING item_id INTO :new_item_id`,
            {
                item_name: item_name.trim(),
                category_id: categoryId,
                price: itemPrice,
                image_url: imageUrl || null,
                adminId,
                new_item_id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            {}
        );
        console.log("ADD MENU ITEM: Menu item inserted");

        const newItemId = result.outBinds.new_item_id[0];

        await connection.execute(
            `INSERT INTO menu_item_admins (item_id, admin_id)
     VALUES (:itemId, :adminId)`,
            {
                itemId: newItemId,
                adminId
            }
        );

        console.log("ADD MENU ITEM: Admin assignment inserted");

        await connection.commit();

        console.log("ADD MENU ITEM: Transaction committed");

        return res.status(201).json({
            success: true,
            message: "Food item added successfully.",
            item_id: newItemId
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Menu item creation rollback error:", rollbackError);
            }
        }
        if (error.errorNum === 1) {
            return res.status(409).json({
                success: false,
                message: "A food item with this name already exists."
            });
        }

        if (error.errorNum === 2291) {
            return res.status(400).json({
                success: false,
                message: "The selected category does not exist."
            });
        }

        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}
//get categories

async function getCategories(req, res, next) {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT category_id, category_name
             FROM categories
             ORDER BY category_name`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            success: true,
            categories: result.rows
        });

    } catch (error) {
        next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

//add categories
async function addCategory(req, res, next) {
    let connection;

    try {
        const { category_name } = req.body;

        if (
            typeof category_name !== "string" ||
            !category_name.trim() ||
            category_name.trim().length > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "Category name must contain 1–50 characters."
            });
        }

        connection = await getConnection();

        await connection.execute(
            `INSERT INTO categories (category_name)
             VALUES (:category_name)`,
            {
                category_name: category_name.trim()
            },
            {
                autoCommit: true
            }
        );

        res.status(201).json({
            success: true,
            message: "Category added successfully."
        });

    } catch (error) {
        if (error.errorNum === 1) {
            return res.status(409).json({
                success: false,
                message: "This category already exists."
            });
        }

        next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

async function updateMenuItem(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const itemId = Number(req.params.id);
        const { item_name, category_id, price, image_url } = req.body;

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid food item ID."
            });
        }

        if (
            typeof item_name !== "string" ||
            !item_name.trim() ||
            item_name.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Food name must contain 1–100 characters."
            });
        }

        const categoryId = Number(category_id);
        const itemPrice = Number(price);
        const imageUrl = typeof image_url === "string"
            ? image_url.trim()
            : "";

        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Select a valid category."
            });
        }

        if (
            !Number.isFinite(itemPrice) ||
            itemPrice < 0 ||
            Math.round(itemPrice * 100) !== itemPrice * 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid price with at most two decimal places."
            });
        }

        if (imageUrl.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Image URL must not exceed 1000 characters."
            });
        }

        if (imageUrl) {
            try {
                const parsedUrl = new URL(imageUrl);

                if (
                    parsedUrl.protocol !== "https:" &&
                    parsedUrl.protocol !== "http:"
                ) {
                    throw new Error("Invalid URL protocol");
                }
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Provide a valid HTTP or HTTPS image URL."
                });
            }
        }

        connection = await getConnection();

        const result = await connection.execute(
            `UPDATE menu_items
             SET item_name = :item_name,
                 category_id = :category_id,
                 price = :price,
                 image_url = :image_url
             WHERE item_id = :item_id
               AND created_by_admin_id = :adminId`,
            {
                item_name: item_name.trim(),
                category_id: categoryId,
                price: itemPrice,
                image_url: imageUrl || null,
                item_id: itemId,
                adminId
            },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found or you do not own it."
            });
        }

        return res.json({
            success: true,
            message: "Food item updated successfully."
        });

    } catch (error) {
        if (error.errorNum === 1) {
            return res.status(409).json({
                success: false,
                message: "A food item with this name already exists."
            });
        }

        if (error.errorNum === 2291) {
            return res.status(400).json({
                success: false,
                message: "The selected category does not exist."
            });
        }

        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

//update availability

async function toggleMenuAvailability(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const itemId = Number(req.params.id);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid food item ID."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `UPDATE menu_items
             SET is_available =
                 CASE
                     WHEN is_available = 'Y' THEN 'N'
                     ELSE 'Y'
                 END
             WHERE item_id = :itemId
               AND created_by_admin_id = :adminId`,
            {
                itemId,
                adminId
            },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found or you do not own it."
            });
        }

        return res.json({
            success: true,
            message: "Availability updated successfully."
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

async function getAllOrders(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                o.order_id,
                o.token_no,
                o.customer_id,
                c.customer_name,
                c.phone,
                o.order_time,
                o.order_status,
                o.assigned_admin_id,
                CASE
                    WHEN o.assigned_admin_id = :admin_id THEN 'Y'
                    ELSE 'N'
                END AS is_payment_admin,
                NVL(p.amount, 0) AS total_amount,
                NVL(p.refund_amount, 0) AS refund_amount,
                p.payment_method,
                p.payment_status
            FROM canteen_orders o
            JOIN customers c
                ON c.customer_id = o.customer_id
            LEFT JOIN payments p
                ON p.order_id = o.order_id
            WHERE EXISTS (
                SELECT 1
                FROM order_item_assignments oia
                WHERE oia.order_id = o.order_id
                  AND oia.admin_id = :admin_id
            )
            ORDER BY o.order_time DESC, o.order_id DESC`,
            { admin_id: adminId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {
        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Error closing database connection:", error);
            }
        }
    }
}


// PATCH: Direct order status updates disabled
async function updateOrderStatus(req, res) {
    return res.status(410).json({
        success: false,
        message: "Direct order status updates are disabled. Update individual assigned items instead."
    });
}


/// PATCH: Mark a pending cash payment as paid.
// Only the designated administrator can perform this operation.
async function markPaymentPaid(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const orderId = Number(req.params.id);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication is required."
            });
        }

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        connection = await getConnection();

        // Lock the order and verify payment authority.
        const orderResult = await connection.execute(
            `SELECT order_status, assigned_admin_id
             FROM canteen_orders
             WHERE order_id = :order_id
             FOR UPDATE`,
            {
                order_id: orderId
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        if (orderResult.rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const order = orderResult.rows[0];

        if (Number(order.ASSIGNED_ADMIN_ID) !== adminId) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: "Only the designated administrator can update this payment."
            });
        }

        if (order.ORDER_STATUS === "CANCELLED") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Payment cannot be marked as paid for a cancelled order."
            });
        }

        // Update only pending cash payments.
        const result = await connection.execute(
            `UPDATE payments
             SET payment_status = 'PAID'
             WHERE order_id = :order_id
               AND payment_status = 'PENDING'
               AND payment_method = 'CASH'`,
            {
                order_id: orderId
            }
        );

        if (result.rowsAffected === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "No pending cash payment exists for this order."
            });
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Cash payment marked as paid successfully.",
            order_id: orderId,
            payment_status: "PAID"
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Payment rollback error:", rollbackError);
            }
        }

        next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

// PATCH: Record a full or partial refund.
// Only the designated administrator can process refunds.
async function refundPayment(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const orderId = Number(req.params.id);
        const refundAmount = Number(req.body.refund_amount);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication is required."
            });
        }

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        if (
            !Number.isFinite(refundAmount) ||
            refundAmount <= 0 ||
            Math.round(refundAmount * 100) !== refundAmount * 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid refund amount greater than zero, with at most two decimal places."
            });
        }

        connection = await getConnection();

        // Lock the order first and verify designated-admin authorization.
        const orderResult = await connection.execute(
            `SELECT assigned_admin_id
             FROM canteen_orders
             WHERE order_id = :order_id
             FOR UPDATE`,
            {
                order_id: orderId
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        if (orderResult.rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const designatedAdminId =
            orderResult.rows[0].ASSIGNED_ADMIN_ID;

        if (
            designatedAdminId == null ||
            Number(designatedAdminId) !== adminId
        ) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: "Only the designated administrator can process refunds for this order."
            });
        }

        // Lock the payment row to prevent concurrent refunds.
        const paymentResult = await connection.execute(
            `SELECT
                payment_id,
                amount,
                payment_status,
                refund_amount
             FROM payments
             WHERE order_id = :order_id
             FOR UPDATE`,
            {
                order_id: orderId
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        if (paymentResult.rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        const payment = paymentResult.rows[0];

        const originalAmount = Number(payment.AMOUNT);
        const alreadyRefunded = Number(payment.REFUND_AMOUNT ?? 0);

        if (
            !Number.isFinite(originalAmount) ||
            originalAmount <= 0 ||
            !Number.isFinite(alreadyRefunded) ||
            alreadyRefunded < 0 ||
            alreadyRefunded > originalAmount
        ) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "The payment contains invalid refund data. Please review it before processing another refund."
            });
        }

        const remainingAmount = Math.round(
            (originalAmount - alreadyRefunded) * 100
        ) / 100;

        if (
            payment.PAYMENT_STATUS !== "PAID" &&
            payment.PAYMENT_STATUS !== "REFUNDED"
        ) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Only paid payments can be refunded."
            });
        }

        if (refundAmount > remainingAmount + 0.000001) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: `Refund cannot exceed the remaining refundable amount of ₹${remainingAmount.toFixed(2)}.`
            });
        }

        const newRefundAmount = Math.round(
            (alreadyRefunded + refundAmount) * 100
        ) / 100;

        const newPaymentStatus =
            newRefundAmount >= originalAmount
                ? "REFUNDED"
                : "PAID";

        // Update cumulative refund amount and payment status.
        await connection.execute(
            `UPDATE payments
             SET refund_amount = :refund_amount,
                 payment_status = :payment_status
             WHERE payment_id = :payment_id`,
            {
                refund_amount: newRefundAmount,
                payment_status: newPaymentStatus,
                payment_id: payment.PAYMENT_ID
            }
        );

        // Record this individual refund in refund_history.
        await connection.execute(
            `INSERT INTO refund_history (
                payment_id,
                order_id,
                refund_amount,
                refund_note
             )
             VALUES (
                :payment_id,
                :order_id,
                :refund_amount,
                :refund_note
             )`,
            {
                payment_id: payment.PAYMENT_ID,
                order_id: orderId,
                refund_amount: refundAmount,
                refund_note: "Refund recorded by administrator"
            }
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Refund recorded successfully.",
            order_id: orderId,
            refund_amount: newRefundAmount,
            payment_status: newPaymentStatus,
            remaining_amount: Math.round(
                (originalAmount - newRefundAmount) * 100
            ) / 100
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Refund rollback error:", rollbackError);
            }
        }

        next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error);
            }
        }
    }
}

// GET: Refund history for the logged-in admin's assigned orders
async function getRefundHistory(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                rh.refund_id,
                rh.payment_id,
                rh.order_id,
                rh.refund_amount,
                rh.refund_time,
                rh.refund_note
             FROM refund_history rh
             JOIN canteen_orders o
                ON o.order_id = rh.order_id
             WHERE o.assigned_admin_id = :adminId
             ORDER BY rh.refund_time DESC, rh.refund_id DESC`,
            { adminId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            refunds: result.rows
        });

    } catch (error) {
        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Error closing refund history connection:",
                    error
                );
            }
        }
    }
}

// GET: Retrieve only the logged-in admin's assigned order items.
async function getAssignedItems(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication is required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                o.order_id,
                oi.item_id,
                COALESCE(oia.admin_id, mia.admin_id) AS assigned_admin_id,
                o.assigned_admin_id AS payment_admin_id,

                CASE
                    WHEN o.assigned_admin_id = :admin_id THEN 'Y'
                    ELSE 'N'
                END AS is_payment_admin,

                o.token_no,
                o.customer_id,
                c.customer_name,
                c.phone,
                o.order_time,
                o.order_status,
                oi.quantity,
                oi.unit_price,
                oi.item_status,
                m.item_name,
                NVL(p.amount, 0) AS total_amount,
                p.payment_method,
                p.payment_status,
                NVL(p.refund_amount, 0) AS refund_amount

            FROM canteen_orders o

            JOIN order_items oi
                ON oi.order_id = o.order_id

            JOIN customers c
                ON c.customer_id = o.customer_id

            JOIN menu_items m
                ON m.item_id = oi.item_id

            LEFT JOIN payments p
                ON p.order_id = o.order_id

            LEFT JOIN order_item_assignments oia
                ON oia.order_id = oi.order_id
               AND oia.item_id = oi.item_id
               AND oia.admin_id = :admin_id

            LEFT JOIN menu_item_admins mia
                ON mia.item_id = oi.item_id
               AND mia.admin_id = :admin_id
               AND NOT EXISTS (
                    SELECT 1
                    FROM order_item_assignments existing_assignment
                    WHERE existing_assignment.order_id = oi.order_id
                      AND existing_assignment.item_id = oi.item_id
               )

            WHERE
                oia.admin_id = :admin_id
                OR (
                    oia.admin_id IS NULL
                    AND mia.admin_id = :admin_id
                    AND EXISTS (
                        SELECT 1
                        FROM admins a
                        WHERE a.admin_id = mia.admin_id
                          AND a.is_active = 'Y'
                    )
                )

            ORDER BY
                o.order_time DESC,
                o.order_id DESC,
                oi.item_id`,

            { admin_id: adminId },

            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            items: result.rows
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Order connection close error:",
                    error
                );
            }
        }
    }
}


// PATCH: Update the status of an item assigned to the logged-in admin.
async function updateAssignedItemStatus(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const orderId = Number(req.params.orderId);
        const itemId = Number(req.params.itemId);

        const itemStatus = String(req.body.item_status || "")
            .trim()
            .toUpperCase();

        const allowedStatuses = [
            "PENDING",
            "PREPARING",
            "READY",
            "COMPLETED",
            "CANCELLED"
        ];

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication is required."
            });
        }

        if (
            !Number.isSafeInteger(orderId) ||
            orderId <= 0 ||
            !Number.isSafeInteger(itemId) ||
            itemId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or item ID."
            });
        }

        if (!allowedStatuses.includes(itemStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid item status."
            });
        }

        connection = await getConnection();

        // Lock the parent order first to serialize updates to its items.
        const orderResult = await connection.execute(
            `SELECT order_id, order_status
             FROM canteen_orders
             WHERE order_id = :order_id
             FOR UPDATE`,
            { order_id: orderId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (orderResult.rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const currentOrderStatus = orderResult.rows[0].ORDER_STATUS;

        // Verify that this item belongs to the logged-in admin.
        const itemResult = await connection.execute(
            `SELECT oi.item_status
             FROM order_item_assignments oia
             JOIN order_items oi
               ON oi.order_id = oia.order_id
              AND oi.item_id = oia.item_id
             WHERE oia.order_id = :order_id
               AND oia.item_id = :item_id
               AND oia.admin_id = :admin_id
             FOR UPDATE OF oi.item_status`,
            {
                order_id: orderId,
                item_id: itemId,
                admin_id: adminId
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (itemResult.rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message:
                    "This item is not assigned to your account, or it does not exist."
            });
        }

        const currentItemStatus = itemResult.rows[0].ITEM_STATUS;

        if (
            currentOrderStatus === "CANCELLED" &&
            itemStatus !== "CANCELLED"
        ) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Items in a cancelled order cannot be reopened."
            });
        }

        // Completed and cancelled items are terminal.
        if (
            ["COMPLETED", "CANCELLED"].includes(currentItemStatus) &&
            itemStatus !== currentItemStatus
        ) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message:
                    `An item with status ${currentItemStatus} cannot be reopened or changed.`
            });
        }

        await connection.execute(
            `UPDATE order_items
             SET item_status = :item_status
             WHERE order_id = :order_id
               AND item_id = :item_id`,
            {
                item_status: itemStatus,
                order_id: orderId,
                item_id: itemId
            }
        );

        // Recalculate the parent order status from all its items.
        const statusesResult = await connection.execute(
            `SELECT item_status
             FROM order_items
             WHERE order_id = :order_id`,
            { order_id: orderId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const statuses = statusesResult.rows.map(
            row => row.ITEM_STATUS
        );

        if (statuses.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "The order has no items."
            });
        }

        let newOrderStatus;

        if (statuses.every(status => status === "CANCELLED")) {
            newOrderStatus = "CANCELLED";
        } else if (
            statuses.every(
                status =>
                    status === "COMPLETED" ||
                    status === "CANCELLED"
            )
        ) {
            newOrderStatus = "COMPLETED";
        } else if (statuses.some(status => status === "PREPARING")) {
            newOrderStatus = "PREPARING";
        } else if (statuses.some(status => status === "READY")) {
            newOrderStatus = "READY";
        } else {
            newOrderStatus = "PENDING";
        }

        await connection.execute(
            `UPDATE canteen_orders
             SET order_status = :order_status
             WHERE order_id = :order_id`,
            {
                order_status: newOrderStatus,
                order_id: orderId
            }
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Assigned item status updated successfully.",
            order_id: orderId,
            item_id: itemId,
            item_status: itemStatus,
            order_status: newOrderStatus
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Assigned item status rollback error:",
                    rollbackError
                );
            }
        }

        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Assigned item status connection close error:",
                    error
                );
            }
        }
    }
}

// GET: List active admins and menu-item assignments.
async function getMenuItemAssignments(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }
        connection = await getConnection();

        const [adminsResult, itemsResult, assignmentsResult] =
            await Promise.all([
                connection.execute(
                    `SELECT admin_id, admin_name, username
                     FROM admins
                     WHERE is_active = 'Y'
                     ORDER BY admin_name`,
                    [],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                ),

                connection.execute(
                    `SELECT item_id, item_name, is_available
                    FROM menu_items
                    WHERE created_by_admin_id = :adminId
                   ORDER BY item_name`,
                    { adminId },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                ),

                connection.execute(
                    `SELECT
                        mia.item_id,
                        mia.admin_id
                     FROM menu_item_admins mia
                     JOIN admins a
                       ON a.admin_id = mia.admin_id
                     WHERE a.is_active = 'Y'
                     ORDER BY mia.item_id, mia.admin_id`,
                    [],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                )
            ]);

        return res.json({
            success: true,
            admins: adminsResult.rows,
            items: itemsResult.rows,
            assignments: assignmentsResult.rows
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Assignment connection close error:", error);
            }
        }
    }
}


// PUT: Replace the eligible admins for one menu item.
async function updateMenuItemAssignments(req, res, next) {
    let connection;

    try {
        const adminId = Number(req.session?.admin?.adminId);
        const itemId = Number(req.params.id);
        const adminIds = req.body.admin_ids;

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }
        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID."
            });
        }

        if (
            !Array.isArray(adminIds) ||
            adminIds.length === 0 ||
            !adminIds.every(
                id => Number.isSafeInteger(Number(id)) &&
                    Number(id) > 0
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Select at least one valid administrator."
            });
        }

        const normalizedIds = adminIds.map(Number);

        if (new Set(normalizedIds).size !== normalizedIds.length) {
            return res.status(400).json({
                success: false,
                message: "Duplicate administrators are not allowed."
            });
        }

        connection = await getConnection();

        const itemResult = await connection.execute(
            `SELECT item_id
             FROM menu_items
             WHERE item_id = :itemId
             AND created_by_admin_id = :adminId`,
            { itemId, adminId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found or you do not own it."
            });
        }

        const adminsResult = await connection.execute(
            `SELECT admin_id
             FROM admins
             WHERE is_active = 'Y'
               AND admin_id IN (${normalizedIds.map((_, i) => `:id${i}`).join(", ")})`,
            Object.fromEntries(
                normalizedIds.map((id, i) => [`id${i}`, id])
            ),
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const validIds = new Set(
            adminsResult.rows.map(row => Number(row.ADMIN_ID))
        );

        if (normalizedIds.some(id => !validIds.has(id))) {
            return res.status(400).json({
                success: false,
                message: "All selected administrators must exist and be active."
            });
        }

        await connection.execute(
            `DELETE FROM menu_item_admins
             WHERE item_id = :itemId`,
            { itemId }
        );

        for (const adminId of normalizedIds) {
            await connection.execute(
                `INSERT INTO menu_item_admins (item_id, admin_id)
                 VALUES (:itemId, :adminId)`,
                { itemId, adminId }
            );
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Menu-item assignments updated successfully."
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Assignment rollback error:", rollbackError);
            }
        }

        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Assignment connection close error:", error);
            }
        }
    }
}

module.exports = {
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

    //Admin-specific item management
    getAssignedItems,
    updateAssignedItemStatus,
    getMenuItemAssignments,
    updateMenuItemAssignments

};