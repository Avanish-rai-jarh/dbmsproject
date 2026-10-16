const profileDetails = document.getElementById("profileDetails");
const customerId = document.getElementById("customerId");
const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const customerPhone = document.getElementById("customerPhone");

const editProfileButton = document.getElementById("editProfileButton");
const editProfileForm = document.getElementById("editProfileForm");
const editName = document.getElementById("editName");
const editPhone = document.getElementById("editPhone");
const saveProfileButton = document.getElementById("saveProfileButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const message = document.getElementById("message");

let originalProfile = null;

function showMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle("success", success);
}

async function fetchJSON(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfResponse = await fetch("/api/csrf-token", {
            credentials: "same-origin"
        });

        const csrfData = await csrfResponse.json();

        if (!csrfResponse.ok || !csrfData.success) {
            throw new Error("Unable to verify your request.");
        }

        headers.set("X-CSRF-Token", csrfData.csrfToken);
    }

    const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function displayProfile(user) {
    originalProfile = {
        customerName: user.customerName || "",
        email: user.email || "",
        phone: user.phone || ""
    };

    customerId.textContent = user.customerId ?? "";
    customerName.textContent = originalProfile.customerName;
    const heading = document.getElementById("customerNameHeading");
    const avatar = document.getElementById("profileAvatar");

    if (heading) {
        heading.textContent = originalProfile.customerName || "Customer";
    }

    if (avatar) {
        avatar.textContent = originalProfile.customerName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("") || "C";
    }
    customerEmail.textContent = originalProfile.email;
    customerPhone.textContent = originalProfile.phone || "Not provided";

    editName.value = originalProfile.customerName;
    editPhone.value = originalProfile.phone;

    profileDetails.hidden = false;
}

async function loadProfile() {
    showMessage("Loading your profile...");

    try {
        const data = await fetchJSON("/api/auth/current-user");

        if (data.userType !== "customer" || !data.user) {
            window.location.href = "/customer-login.html";
            return;
        }

        displayProfile(data.user);
        showMessage("");

    } catch (error) {
        console.error("Profile loading error:", error);
        showMessage(error.message || "Unable to load your profile.");
    }
}

editProfileButton.addEventListener("click", () => {
    editName.value = originalProfile.customerName;
    editPhone.value = originalProfile.phone;

    editProfileForm.hidden = false;
    editProfileButton.hidden = true;

    showMessage("");
});

cancelEditButton.addEventListener("click", () => {
    editProfileForm.hidden = true;
    editProfileButton.hidden = false;

    editName.value = originalProfile.customerName;
    editPhone.value = originalProfile.phone;

    showMessage("");
});

editProfileForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = editName.value.trim();
    const phone = editPhone.value.trim();

    if (!name) {
        showMessage("Please enter your full name.");
        editName.focus();
        return;
    }

    if (name.length > 100) {
        showMessage("Name cannot exceed 100 characters.");
        return;
    }

    if (phone.length > 15) {
        showMessage("Phone number cannot exceed 15 characters.");
        return;
    }

    if (phone && !/^[0-9+\-\s()]+$/.test(phone)) {
        showMessage("Please enter a valid phone number.");
        return;
    }

    saveProfileButton.disabled = true;
    saveProfileButton.textContent = "Saving...";

    try {
        const data = await fetchJSON("/api/auth/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customer_name: name,
                phone
            })
        });

        if (data.user) {
            displayProfile(data.user);
        } else {
            await loadProfile();
        }

        editProfileForm.hidden = true;
        editProfileButton.hidden = false;

        showMessage("Profile updated successfully!", true);

    } catch (error) {
        showMessage(error.message || "Unable to update your profile.");

    } finally {
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = "Save Changes";
    }
});

loadProfile();