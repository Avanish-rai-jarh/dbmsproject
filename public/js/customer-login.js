const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

async function getCsrfToken() {
    const response = await fetch("/api/csrf-token", {
        credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.csrfToken) {
        throw new Error("Unable to initialize secure login.");
    }

    return data.csrfToken;
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginButton.disabled = true;
    message.textContent = "Logging in...";

    try {
        const csrfToken = await getCsrfToken();

        const formData = new FormData(loginForm);

        const credentials = {
            email: formData.get("email").trim(),
            password: formData.get("password")
        };

        const response = await fetch("/api/auth/customer/login", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed.");
        }

        message.textContent = "Login successful. Redirecting...";

        setTimeout(function () {
            window.location.href = "index.html";
        }, 700);

    } catch (error) {
        message.textContent = error.message;
    } finally {
        loginButton.disabled = false;
    }
});