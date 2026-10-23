
const navigationIds = [
    "customerLoginLink",
    "customerRegisterLink",
    "adminLoginLink",
    "menuLink",
    "myOrdersLink",
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

        if (nav.trackOrderLink) {
            nav.trackOrderLink.hidden = !isCustomer;
        }

        if (nav.aboutLink) {
            nav.aboutLink.hidden = !isCustomer;
        }

        if (nav.customerProfileLink) {
            nav.customerProfileLink.hidden = !isCustomer;
        }

        if (nav.adminDashboardLink) {
            nav.adminDashboardLink.hidden = !isAdmin;
        }

        if (nav.customerLogoutButton) {
            nav.customerLogoutButton.hidden = !isCustomer;
        }
        if (nav.myOrdersLink) {
            nav.myOrdersLink.hidden = !isCustomer;
        }

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

if (nav.customerLogoutButton) {
    nav.customerLogoutButton.addEventListener("click", async () => {
        nav.customerLogoutButton.disabled = true;

        try {
            const csrfResponse = await fetch("/api/csrf-token", {
                credentials: "same-origin"
            });

            const csrfData = await csrfResponse.json();

            if (!csrfResponse.ok || !csrfData.csrfToken) {
                throw new Error("Unable to initialize secure logout.");
            }

            const response = await fetch("/api/auth/customer/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-Token": csrfData.csrfToken
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Logout failed.");
            }

            window.location.replace("/index.html");

        } catch (error) {
            alert(error.message);
            nav.customerLogoutButton.disabled = false;
        }
    });
}

updateCustomerNavigation();
