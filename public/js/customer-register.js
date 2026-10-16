const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const message = document.getElementById("message");

async function getCsrfToken() {
    const response = await fetch("/api/csrf-token", {
        credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.csrfToken) {
        throw new Error("Unable to initialize secure registration.");
    }

    return data.csrfToken;
}

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    registerButton.disabled = true;
    message.textContent = "Creating your account...";

    try {
        const csrfToken = await getCsrfToken();

        const formData = new FormData(registerForm);

        const customer = {
            customer_name: formData.get("customer_name").trim(),
            email: formData.get("email").trim(),
            phone: formData.get("phone").trim(),
            password: formData.get("password")
        };

        const response = await fetch("/api/auth/customer/register", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify(customer)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Registration failed.");
        }

        message.textContent =
            "Account created successfully. Redirecting to login...";

        registerForm.reset();

        setTimeout(function () {
            window.location.href = "customer-login.html";
        }, 1200);

    } catch (error) {
        message.textContent = error.message;
    } finally {
        registerButton.disabled = false;
    }
});