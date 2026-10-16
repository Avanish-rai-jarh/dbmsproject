const { getConnection } = require("../config/db");

async function getMenu(req, res, next) {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                m.item_id,
                m.item_name,
                c.category_name,
                m.price,
                m.is_available,
                m.image_url
             FROM menu_items m
             JOIN categories c
                ON m.category_id = c.category_id
             ORDER BY c.category_name, m.item_name`,
            [],
            { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
        );

        res.json({
            success: true,
            count: result.rows.length,
            items: result.rows
        });
    } catch (error) {
        next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Error closing connection:", error);
            }
        }
    }
}

module.exports = { getMenu };