const oracledb = require("oracledb");
require("dotenv").config();

let pool;

async function initializePool() {
    try {
        pool = await oracledb.createPool({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECTION_STRING,
            poolMin: 1,
            poolMax: 5,
            poolIncrement: 1
        });

        console.log("Oracle connection pool created successfully.");
    } catch (error) {
        console.error("Failed to create Oracle connection pool:", error);
        throw error;
    }
}

async function getConnection() {
    if (!pool) {
        throw new Error("Oracle connection pool is not initialized.");
    }

    return pool.getConnection();
}

async function closePool() {
    if (pool) {
        await pool.close(10);
        pool = null;
        console.log("Oracle connection pool closed.");
    }
}

module.exports = {
    initializePool,
    getConnection,
    closePool
};