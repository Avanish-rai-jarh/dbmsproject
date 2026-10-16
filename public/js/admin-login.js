const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

async function getCsrfToken() {
    const response = await fetch("/api/csrf-token", {
        credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to obtain CSRF token.");
    }

    return data.csrfToken;
}

async function checkExistingSession() {
    try {
        const response = await fetch("/api/auth/session", {
            credentials: "same-origin"
        });

        if (response.ok) {
            window.location.replace("/admin.html");
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginMessage.textContent = "";
    loginMessage.className = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Login failed.");
        }

        loginMessage.textContent = "Login successful! Opening dashboard...";
        loginMessage.className = "success";

        window.location.replace("/admin.html");

    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.className = "error";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});

checkExistingSession();