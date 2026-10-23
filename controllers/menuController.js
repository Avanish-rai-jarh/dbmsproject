
const { getConnection } = require("../config/db");
const oracledb = require("oracledb");

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
                m.image_url,
                a.canteen_name
             FROM menu_items m
             JOIN categories c
               ON c.category_id = m.category_id
             LEFT JOIN admins a
               ON a.admin_id = m.created_by_admin_id
             WHERE m.is_deleted = 'N'
             ORDER BY a.canteen_name, c.category_name, m.item_name`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.json({
            success: true,
            count: result.rows.length,
            items: result.rows
        });
    } catch (error) {
        return next(error);
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
