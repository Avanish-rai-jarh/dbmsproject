const navigationIds = [
    "customerLoginLink",
    "customerRegisterLink",
    "adminLoginLink",
    "menuLink",
    "trackOrderLink",
    "customerProfileLink",
    "adminDashboardLink",
    "aboutLink",
    "customerLogoutButton"
];

const nav = {};

navigationIds.forEach(id => {
    nav[id] = document.getElementById(id);
});

async function updateCustomerNavigation() {
    try {
        const response = await fetch("/api/auth/current-user", {
            credentials: "same-origin",
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error("Unable to determine login status.");
        }

        const isCustomer = data.userType === "customer";
        const isAdmin = data.userType === "admin";
        const isLoggedIn = isCustomer || isAdmin;

        if (nav.customerLoginLink) {
            nav.customerLoginLink.hidden = isLoggedIn;
        }

        if (nav.customerRegisterLink) {
            nav.customerRegisterLink.hidden = isLoggedIn;
        }

        if (nav.adminLoginLink) {
            nav.adminLoginLink.hidden = isLoggedIn;
        }

        if (nav.menuLink) {
            nav.menuLink.hidden = !isLoggedIn;
        }

        if (nav.trackOrderLink) {
            nav.trackOrderLink.hidden = !isLoggedIn;
        }

        if (nav.aboutLink) {
            nav.aboutLink.hidden = !isLoggedIn;
        }

        if (nav.customerProfileLink) {
            nav.customerProfileLink.hidden = !isCustomer;
        }

        if (nav.adminDashboardLink) {
            nav.adminDashboardLink.hidden = !isAdmin;
        }

        if (nav.customerLogoutButton) {
            nav.customerLogoutButton.hidden = !isLoggedIn;
        }

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

nav.customerLogoutButton.addEventListener("click", async () => {
    try {
        const csrfResponse = await fetch("/api/csrf-token", {
            credentials: "same-origin"
        });

        const csrfData = await csrfResponse.json();

        if (!csrfResponse.ok || !csrfData.csrfToken) {
            throw new Error("Unable to initialize secure logout.");
        }

        const sessionResponse = await fetch("/api/auth/current-user", {
            credentials: "same-origin",
            cache: "no-store"
        });

        const sessionData = await sessionResponse.json();

        const logoutUrl = sessionData.userType === "admin"
            ? "/api/auth/logout"
            : "/api/auth/customer/logout";

        const response = await fetch(logoutUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfData.csrfToken
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Logout failed.");
        }

        window.location.href = "/index.html";

    } catch (error) {
        alert(error.message);
    }
});

updateCustomerNavigation();