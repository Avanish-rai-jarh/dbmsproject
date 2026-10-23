
require("dotenv").config();

const bcrypt = require("bcrypt");
const { initializePool, getConnection, closePool } = require("./config/db");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer.trim()));
    });
}

async function createAdmin() {
    let connection;

    try {
        await initializePool();
        console.log("Oracle connection pool initialized.");

        const adminName = await ask("Enter admin name: ");
        const canteenName = await ask("Enter unique canteen name: ");
        const username = await ask("Choose admin username: ");
        const password = await ask("Choose admin password: ");

        if (!adminName || !canteenName || !username || !password) {
            throw new Error("All fields are required.");
        }

        if (canteenName.length > 100) {
            throw new Error("Canteen name cannot exceed 100 characters.");
        }

        if (password.length < 8) {
            throw new Error("Password must contain at least 8 characters.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        connection = await getConnection();

        await connection.execute(
            `INSERT INTO admins
                (admin_name, canteen_name, username, password_hash)
             VALUES
                (:admin_name, :canteen_name, :username, :password_hash)`,
            {
                admin_name: adminName,
                canteen_name: canteenName,
                username: username,
                password_hash: passwordHash
            },
            { autoCommit: true }
        );

        console.log("\nAdmin account created successfully!");
        console.log("Username:", username);
        console.log("Canteen:", canteenName);
        console.log("Password stored securely as a bcrypt hash.");

    } catch (error) {
        if (error.errorNum === 1) {
            console.error(
                "That username or canteen name already exists. Choose another."
            );
        } else {
            console.error("Unable to create admin:", error.message);
        }

        process.exitCode = 1;

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Connection close error:", error.message);
            }
        }

        try {
            await closePool();
        } catch (error) {
            console.error("Error closing Oracle pool:", error.message);
        }

        rl.close();
    }
}

createAdmin();
