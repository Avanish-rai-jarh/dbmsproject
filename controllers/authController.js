const oracledb = require("oracledb");
const bcrypt = require("bcrypt");
const { getConnection } = require("../config/db");

async function adminLogin(req, res, next) {
    let connection;

    try {
        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT admin_id, admin_name, username, password_hash
            FROM admins
            WHERE username = :username
            AND is_active = 'Y'`,
            { username },
            { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const admin = result.rows[0];

        const passwordMatches = await bcrypt.compare(
            password,
            admin.PASSWORD_HASH
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        // Regenerate the session to prevent session fixation.
        req.session.regenerate(error => {
            if (error) {
                return next(error);
            }

            req.session.admin = {
                adminId: admin.ADMIN_ID,
                adminName: admin.ADMIN_NAME,
                username: admin.USERNAME
            };

            req.session.save(error => {
                if (error) {
                    return next(error);
                }

                res.json({
                    success: true,
                    message: "Login successful.",
                    admin: req.session.admin
                });
            });
        });
    } catch (error) {
        next(error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Oracle connection close error:", error.message);
            }
        }
    }
}

function adminLogout(req, res, next) {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("campusbite.sid");

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
}


function getAdminSession(req, res) {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated."
        });
    }

    return res.json({
        success: true,
        admin: req.session.admin
    });
}

// Customer registration and login functions

async function customerRegister(req, res, next) {
    let connection;

    try {
        const customerName = String(
            req.body.customer_name || ""
        ).trim();

        const email = String(
            req.body.email || ""
        ).trim().toLowerCase();

        const phone = String(
            req.body.phone || ""
        ).trim();

        const password = String(
            req.body.password || ""
        );

        // Validate required fields.
        if (!customerName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        // Validate name length.
        if (customerName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name cannot exceed 100 characters."
            });
        }

        // Validate email.
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            email.length > 254 ||
            !emailPattern.test(email)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Validate password.
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: "Password must contain 8 to 72 characters."
            });
        }

        // Validate optional phone number.
        if (phone.length > 15) {
            return res.status(400).json({
                success: false,
                message: "Phone number cannot exceed 15 characters."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        connection = await getConnection();

        const oracledb = require("oracledb");

        const result = await connection.execute(
            `INSERT INTO customers (
                customer_name,
                phone,
                email,
                password_hash
            )
            VALUES (
                :customerName,
                :phone,
                :email,
                :passwordHash
            )`,
            {
                customerName,
                phone: phone || null,
                email,
                passwordHash
            },
            {
                autoCommit: true
            }
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful. You can now log in."
        });

    } catch (error) {
        // Oracle unique-constraint/index violation.
        if (error.errorNum === 1) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Oracle connection close error:",
                    error.message
                );
            }
        }
    }
}

// Customer login function
async function customerLogin(req, res, next) {
    let connection;

    try {
        const email = String(
            req.body.email || ""
        ).trim().toLowerCase();

        const password = String(
            req.body.password || ""
        );

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        connection = await getConnection();

        const oracledb = require("oracledb");

        const result = await connection.execute(
            `SELECT
                customer_id,
                customer_name,
                phone,
                email,
                password_hash
             FROM customers
             WHERE LOWER(email) = :email`,
            { email },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const customer = result.rows[0];

        // Old customer records have no account password yet.
        if (!customer.PASSWORD_HASH) {
            return res.status(401).json({
                success: false,
                message:
                    "This customer record has no login account. Please register using an available email address."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            customer.PASSWORD_HASH
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Regenerate the session to prevent session fixation.
        req.session.regenerate(error => {
            if (error) {
                return next(error);
            }

            req.session.customer = {
                customerId: customer.CUSTOMER_ID,
                customerName: customer.CUSTOMER_NAME,
                email: customer.EMAIL
            };

            req.session.save(error => {
                if (error) {
                    return next(error);
                }

                return res.json({
                    success: true,
                    message: "Login successful.",
                    customer: req.session.customer
                });
            });
        });

    } catch (error) {
        return next(error);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    "Oracle connection close error:",
                    error.message
                );
            }
        }
    }
}

function customerLogout(req, res, next) {
    if (!req.session || !req.session.customer) {
        return res.status(401).json({
            success: false,
            message: "You are not logged in as a customer."
        });
    }

    req.session.destroy(error => {
        if (error) {
            return next(error);
        }

        res.clearCookie("campusbite.sid");

        return res.json({
            success: true,
            message: "Customer logged out successfully."
        });
    });
}

//get current customer session

async function getCurrentUser(req, res, next) {
    if (req.session?.admin) {
        let connection;

        try {
            connection = await getConnection();

            const result = await connection.execute(
                `SELECT
                    admin_id,
                    admin_name,
                    username,
                    canteen_name
                 FROM admins
                 WHERE admin_id = :adminId`,
                { adminId: req.session.admin.adminId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Admin account not found."
                });
            }

            const admin = result.rows[0];

            return res.json({
                success: true,
                userType: "admin",
                user: {
                    adminId: admin.ADMIN_ID,
                    adminName: admin.ADMIN_NAME,
                    username: admin.USERNAME,
                    canteenName: admin.CANTEEN_NAME
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
                        "Connection close error:",
                        error.message
                    );
                }
            }
        }
    }

    if (req.session?.customer) {
        return res.json({
            success: true,
            userType: "customer",
            user: req.session.customer
        });
    }

    return res.json({
        success: true,
        userType: "guest",
        user: null
    });
}



async function updateCustomerProfile(req, res, next) {
    let connection;

    try {
        if (!req.session || !req.session.customer) {
            return res.status(401).json({
                success: false,
                message: "Please log in to update your profile."
            });
        }

        const customerId = req.session.customer.customerId;
        const customerName = String(
            req.body.customer_name || ""
        ).trim();
        const phone = String(req.body.phone || "").trim();

        if (!customerName || customerName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid name of at most 100 characters."
            });
        }

        if (phone.length > 15 || (phone && !/^[0-9+\-\s()]+$/.test(phone))) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid phone number."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `UPDATE customers
             SET customer_name = :customerName,
                 phone = :phone
             WHERE customer_id = :customerId
               AND email IS NOT NULL
               AND password_hash IS NOT NULL`,
            {
                customerName,
                phone: phone || null,
                customerId
            }
        );

        if (result.rowsAffected !== 1) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        await connection.commit();

        req.session.customer.customerName = customerName;

        await new Promise((resolve, reject) => {
            req.session.save(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        const profile = await connection.execute(
            `SELECT customer_id, customer_name, email, phone
             FROM customers
             WHERE customer_id = :customerId`,
            { customerId },
            { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
        );

        const customer = profile.rows[0];

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                customerId: customer.CUSTOMER_ID,
                customerName: customer.CUSTOMER_NAME,
                email: customer.EMAIL,
                phone: customer.PHONE
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Profile rollback error:", rollbackError);
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
}

module.exports = {
    adminLogin,
    adminLogout,
    getAdminSession,
    customerRegister,
    customerLogin,
    customerLogout,
    getCurrentUser,
    updateCustomerProfile
};