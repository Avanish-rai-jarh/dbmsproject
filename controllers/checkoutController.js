const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

async function checkout(req, res, next) {
  let connection;
  let transactionStarted = false;

  try {
    // Customer authentication is mandatory.
    if (!req.session || !req.session.customer) {
      return res.status(401).json({
        success: false,
        message: "Please log in before placing an order."
      });
    }

    const customerId = req.session.customer.customerId;

    const paymentMethod = String(
      req.body.payment_method || ""
    ).toUpperCase();

    const allowedMethods = ["CASH", "UPI", "CARD"];

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Choose CASH, UPI, or CARD."
      });
    }

    connection = await getConnection();


    const diagnostic = await connection.execute(
    `SELECT
        SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS current_schema,
        SYS_CONTEXT('USERENV', 'DB_NAME') AS db_name,
        SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS service_name
     FROM dual`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

console.log("Checkout database:", diagnostic.rows[0]);

const assignmentCheck = await connection.execute(
    `SELECT
        mia.item_id,
        mia.admin_id,
        a.admin_name,
        a.is_active
     FROM menu_item_admins mia
     JOIN admins a
       ON a.admin_id = mia.admin_id
     WHERE mia.item_id = :itemId
       AND a.is_active = 'Y'`,
    { itemId: 41 },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

console.log("Active Slice assignments:", assignmentCheck.rows);

    // Verify the customer account and retrieve trusted details.
    const customerResult = await connection.execute(
      `SELECT customer_id, customer_name, phone
             FROM customers
             WHERE customer_id = :customerId
               AND email IS NOT NULL
               AND password_hash IS NOT NULL`,
      { customerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (customerResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Customer account not found. Please log in again."
      });
    }

    const customer = customerResult.rows[0];

    // Lock the customer's cart rows while creating the order.
    const cartResult = await connection.execute(
      `SELECT
                ci.item_id,
                ci.quantity
             FROM customer_cart_items ci
             WHERE ci.customer_id = :customerId
             ORDER BY ci.item_id
             FOR UPDATE`,
      { customerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    transactionStarted = true;

    // Verify item availability and prices directly in Oracle.
    const verifiedItems = [];
    let total = 0;

    for (const cartRow of cartResult.rows) {
      const itemId = Number(cartRow.ITEM_ID);
      const quantity = Number(cartRow.QUANTITY);

      if (
        !Number.isSafeInteger(itemId) ||
        itemId <= 0 ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        throw new Error(
          "The cart contains invalid item details."
        );
      }

      const result = await connection.execute(
        `SELECT item_id, item_name, price, is_available
                 FROM menu_items
                 WHERE item_id = :itemId
                 FOR UPDATE`,
        { itemId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows.length === 0) {
        throw new Error(
          "A menu item in your cart no longer exists."
        );
      }

      const item = result.rows[0];

      if (item.IS_AVAILABLE !== "Y") {
        throw new Error(
          `${item.ITEM_NAME} is currently unavailable.`
        );
      }

      const price = Number(item.PRICE);
      const lineTotal = Number(
        (price * quantity).toFixed(2)
      );

      verifiedItems.push({
        itemId: Number(item.ITEM_ID),
        itemName: item.ITEM_NAME,
        quantity,
        price
      });

      total = Number((total + lineTotal).toFixed(2));
    }

    // Generate a unique token using the Oracle sequence.
    const tokenResult = await connection.execute(
      `SELECT canteen_token_seq.NEXTVAL AS token_no
             FROM dual`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const tokenNo = Number(tokenResult.rows[0].TOKEN_NO);

    // Create the order for the authenticated customer.
    const orderResult = await connection.execute(
      `INSERT INTO canteen_orders (
                token_no,
                customer_id,
                order_status
            )
            VALUES (
                :tokenNo,
                :customerId,
                'PENDING'
            )
            RETURNING order_id INTO :orderId`,
      {
        tokenNo,
        customerId,
        orderId: {
          type: oracledb.NUMBER,
          dir: oracledb.BIND_OUT
        }
      }
    );

    const orderId = orderResult.outBinds.orderId[0];
    const adminItemCounts = new Map();
    let designatedAdminId = null;
    // Save order items and assign each item to an eligible admin.
    for (const item of verifiedItems) {

      // First, save the order item.
      await connection.execute(
        `INSERT INTO order_items (
            order_id,
            item_id,
            quantity,
            unit_price
        )
        VALUES (
            :orderId,
            :itemId,
            :quantity,
            :unitPrice
        )`,
        {
          orderId,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.price
        }
      );

      // Find active admins eligible for this menu item.
      // Prefer the admin with the fewest active assigned orders.
      const adminResult = await connection.execute(
        `SELECT admin_id
         FROM (
             SELECT
                 a.admin_id,
                 (
                     SELECT COUNT(DISTINCT oia.order_id)
                     FROM order_item_assignments oia
                     JOIN canteen_orders co
                     ON co.order_id = oia.order_id
                     WHERE oia.admin_id = a.admin_id
                     AND co.order_status NOT IN (
                     'COMPLETED',
                     'DELIVERED',
                     'SERVED',
                     'CANCELLED',
                     'CANCELED',
                    'REJECTED'
                             )
                 ) AS active_workload
             FROM admins a
             JOIN menu_item_admins mia
               ON mia.admin_id = a.admin_id
             WHERE mia.item_id = :itemId
               AND a.is_active = 'Y'
             ORDER BY active_workload ASC, a.admin_id ASC
         )
         WHERE ROWNUM = 1`,
        {
          itemId: item.itemId
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        }
      );

      // Never assign an item to an unrelated or inactive admin.
      if (adminResult.rows.length === 0) {
        throw new Error(
          `No active admin is assigned to ${item.itemName}. ` +
          "Please contact the canteen administrator."
        );
      }

      const assignedAdminId = Number(
        adminResult.rows[0].ADMIN_ID
      );

      adminItemCounts.set(
        assignedAdminId,
        (adminItemCounts.get(assignedAdminId) || 0) + 1
      );

      // Record which admin is responsible for this order item.
      await connection.execute(
        `INSERT INTO order_item_assignments (
            order_id,
            item_id,
            admin_id
        )
        VALUES (
            :orderId,
            :itemId,
            :adminId
        )`,
        {
          orderId,
          itemId: item.itemId,
          adminId: assignedAdminId
        }
      );
    }



    // Designate one administrator for order-level payment and refund actions.
    designatedAdminId = [...adminItemCounts.entries()]
      .sort((a, b) => {
        // Highest number of items first.
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        // Lowest admin ID wins ties.
        return a[0] - b[0];
      })[0]?.[0];

    if (!designatedAdminId) {
      throw new Error(
        "Unable to designate an administrator for this order."
      );
    }

    await connection.execute(
      `UPDATE canteen_orders
     SET assigned_admin_id = :adminId
     WHERE order_id = :orderId`,
      {
        adminId: designatedAdminId,
        orderId
      }
    );

    // Record the selected payment method.
    // This does not process a real payment.
    await connection.execute(
      `INSERT INTO payments (
                order_id,
                amount,
                payment_method,
                payment_status
            )
            VALUES (
                :orderId,
                :amount,
                :paymentMethod,
                'PENDING'
            )`,
      {
        orderId,
        amount: total,
        paymentMethod
      }
    );

    // Clear only this customer's cart within the transaction.
    await connection.execute(
      `DELETE FROM customer_cart_items
             WHERE customer_id = :customerId`,
      { customerId }
    );

    // Commit the order, items, payment, and cart deletion together.
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: {
        order_id: Number(orderId),
        token_no: tokenNo,
        customer_name: customer.CUSTOMER_NAME,
        items: verifiedItems,
        total,
        order_status: "PENDING",
        payment_method: paymentMethod,
        payment_status: "PENDING"
      }
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Checkout rollback error:",
          rollbackError
        );
      }
    }

    if (
      error.message &&
      (
        error.message.includes("unavailable") ||
        error.message.includes("no longer exists") ||
        error.message.includes("invalid item details") ||
        error.message.includes("No active admin is assigned") ||
        error.message.includes(
          "Unable to designate an administrator"
        )
      )
    ) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return next(error);

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "Database connection close error:",
          error
        );
      }
    }
  }
}

module.exports = { checkout };