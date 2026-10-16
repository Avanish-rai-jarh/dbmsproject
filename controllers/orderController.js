const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

// POST: Track an order belonging to the logged-in customer.
async function trackOrder(req, res, next) {
    let connection;

    try {
        if (!req.session || !req.session.customer) {
            return res.status(401).json({
                success: false,
                message: "Please log in to track your order."
            });
        }

        const customerId = req.session.customer.customerId;
        const orderId = Number(req.body.order_id);
        const tokenNo = Number(req.body.token_no);

        if (
            !Number.isSafeInteger(orderId) ||
            orderId <= 0 ||
            !Number.isSafeInteger(tokenNo) ||
            tokenNo <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid Order ID and Token Number."
            });
        }

        connection = await getConnection();

        const orderResult = await connection.execute(
            `SELECT
                o.order_id,
                o.token_no,
                o.order_time,
                o.order_status,
                c.customer_name,
                p.payment_method,
                p.payment_status,
                p.amount,
                p.refund_amount
             FROM canteen_orders o
             JOIN customers c
               ON c.customer_id = o.customer_id
             LEFT JOIN payments p
               ON p.order_id = o.order_id
             WHERE o.order_id = :order_id
               AND o.token_no = :token_no
               AND o.customer_id = :customer_id`,
            {
                order_id: orderId,
                token_no: tokenNo,
                customer_id: customerId
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No order matches those details."
            });
        }

        const order = orderResult.rows[0];

        const itemsResult = await connection.execute(
            `SELECT
                oi.item_id,
                mi.item_name,
                oi.quantity,
                oi.unit_price,
                oi.quantity * oi.unit_price AS line_total
             FROM order_items oi
             JOIN menu_items mi
               ON mi.item_id = oi.item_id
             WHERE oi.order_id = :order_id
             ORDER BY mi.item_name`,
            { order_id: orderId },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        return res.json({
            success: true,
            order: {
                order_id: Number(order.ORDER_ID),
                token_no: Number(order.TOKEN_NO),
                order_time: order.ORDER_TIME,
                order_status: order.ORDER_STATUS,
                customer_name: order.CUSTOMER_NAME,
                payment_method: order.PAYMENT_METHOD,
                payment_status: order.PAYMENT_STATUS,
                total: Number(order.AMOUNT || 0),
                refund_amount: Number(order.REFUND_AMOUNT || 0),
                items: itemsResult.rows.map(item => ({
                    item_id: Number(item.ITEM_ID),
                    item_name: item.ITEM_NAME,
                    quantity: Number(item.QUANTITY),
                    unit_price: Number(item.UNIT_PRICE),
                    line_total: Number(item.LINE_TOTAL)
                }))
            }
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Error closing Oracle connection:",
                    error
                );
            }
        }
    }
}

async function getMyOrders(req, res, next) {
    let connection;

    try {
        if (!req.session || !req.session.customer) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your orders."
            });
        }

        const customerId = req.session.customer.customerId;

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                o.order_id,
                o.token_no,
                o.order_time,
                o.order_status,
                oi.item_id,
                mi.item_name,
                oi.quantity,
                oi.unit_price,
                p.amount AS payment_amount,
                p.payment_method,
                p.payment_status,
                p.refund_amount
             FROM canteen_orders o
             LEFT JOIN order_items oi
                ON oi.order_id = o.order_id
             LEFT JOIN menu_items mi
                ON mi.item_id = oi.item_id
             LEFT JOIN payments p
                ON p.order_id = o.order_id
             WHERE o.customer_id = :customerId
             ORDER BY o.order_time DESC, o.order_id DESC`,
            { customerId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const ordersById = new Map();

        for (const row of result.rows) {
            let order = ordersById.get(row.ORDER_ID);

            if (!order) {
                order = {
                    order_id: Number(row.ORDER_ID),
                    token_no: Number(row.TOKEN_NO),
                    order_time: row.ORDER_TIME,
                    order_status: row.ORDER_STATUS,
                    items: [],
                    total_amount: Number(row.PAYMENT_AMOUNT || 0),
                    payment_method: row.PAYMENT_METHOD,
                    payment_status: row.PAYMENT_STATUS,
                    refund_amount: Number(row.REFUND_AMOUNT || 0)
                };

                ordersById.set(row.ORDER_ID, order);
            }

            if (row.ITEM_ID !== null && row.ITEM_ID !== undefined) {
                order.items.push({
                    item_id: Number(row.ITEM_ID),
                    item_name: row.ITEM_NAME,
                    quantity: Number(row.QUANTITY),
                    unit_price: Number(row.UNIT_PRICE)
                });
            }
        }

        return res.json({
            success: true,
            orders: Array.from(ordersById.values())
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Order history connection close error:",
                    error.message
                );
            }
        }
    }
}



async function getMyOrderDetails(req, res, next) {
    let connection;

    try {
        if (!req.session || !req.session.customer) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your order."
            });
        }

        const customerId = req.session.customer.customerId;
        const orderId = Number(req.params.id);

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        connection = await getConnection();

        const orderResult = await connection.execute(
            `SELECT
                o.order_id,
                o.token_no,
                o.order_time,
                o.order_status,
                p.amount AS payment_amount,
                p.payment_method,
                p.payment_status,
                p.refund_amount
             FROM canteen_orders o
             LEFT JOIN payments p
                ON p.order_id = o.order_id
             WHERE o.order_id = :orderId
               AND o.customer_id = :customerId`,
            { orderId, customerId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const row = orderResult.rows[0];

        const itemsResult = await connection.execute(
            `SELECT
                oi.item_id,
                mi.item_name,
                oi.quantity,
                oi.unit_price,
                oi.quantity * oi.unit_price AS line_total
             FROM order_items oi
             LEFT JOIN menu_items mi
                ON mi.item_id = oi.item_id
             WHERE oi.order_id = :orderId
             ORDER BY mi.item_name`,
            { orderId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            order: {
                order_id: Number(row.ORDER_ID),
                token_no: Number(row.TOKEN_NO),
                order_time: row.ORDER_TIME,
                order_status: row.ORDER_STATUS,
                total_amount: Number(row.PAYMENT_AMOUNT || 0),
                payment_method: row.PAYMENT_METHOD,
                payment_status: row.PAYMENT_STATUS,
                refund_amount: Number(row.REFUND_AMOUNT || 0),
                items: itemsResult.rows.map(item => ({
                    item_id: Number(item.ITEM_ID),
                    item_name: item.ITEM_NAME,
                    quantity: Number(item.QUANTITY),
                    unit_price: Number(item.UNIT_PRICE),
                    line_total: Number(item.LINE_TOTAL)
                }))
            }
        });
    } catch (error) {
        return next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Customer order details connection close error:",
                    error.message
                );
            }
        }
    }
}

module.exports = {
    trackOrder,
    getMyOrders,
    getMyOrderDetails
};