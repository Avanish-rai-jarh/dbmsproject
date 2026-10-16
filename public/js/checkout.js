const checkoutItems = document.getElementById("checkoutItems");
const checkoutQuantity = document.getElementById("checkoutQuantity");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const placeOrderButton = document.getElementById("placeOrderButton");

let cartLoaded = false;
let cartIsEmpty = true;

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(amount);
}

function showMessage(message, success = false) {
    checkoutMessage.textContent = message;
    checkoutMessage.classList.toggle("success", success);
    checkoutMessage.hidden = false;
}

async function loadCheckout() {
    try {
        const response = await fetch("/api/cart");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load your cart.");
        }

        const cart = data.cart;
        const items = cart.items || [];

        checkoutItems.replaceChildren();

        cartLoaded = true;
        cartIsEmpty = items.length === 0;

        if (cartIsEmpty) {
            const message = document.createElement("p");
            message.textContent = "Your cart is empty.";
            checkoutItems.appendChild(message);

            checkoutQuantity.textContent = "0";
            checkoutTotal.textContent = formatCurrency(0);
            placeOrderButton.disabled = true;
            showMessage("Add items to your cart before checking out.");
            return;
        }

        for (const item of items) {
            const row = document.createElement("div");
            row.className = "checkout-item";

            const details = document.createElement("div");

            const name = document.createElement("div");
            name.className = "checkout-item-name";
            name.textContent = item.name;

            const quantity = document.createElement("div");
            quantity.className = "checkout-item-details";
            quantity.textContent =
                `${item.quantity} × ${formatCurrency(Number(item.price))}`;

            const price = document.createElement("div");
            price.className = "checkout-item-price";
            price.textContent =
                formatCurrency(Number(item.price) * Number(item.quantity));

            details.append(name, quantity);
            row.append(details, price);
            checkoutItems.appendChild(row);
        }

        checkoutQuantity.textContent = String(cart.totalQuantity);
        checkoutTotal.textContent = formatCurrency(Number(cart.total));

        placeOrderButton.disabled = false;
    } catch (error) {
        cartLoaded = false;
        placeOrderButton.disabled = true;
        showMessage(error.message || "Unable to load your cart.");
    }
}

checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!cartLoaded || cartIsEmpty) {
        showMessage("Your cart is empty or could not be loaded.");
        return;
    }

    const formData = new FormData(checkoutForm);

    const payload = {
        customer_name: formData.get("customer_name").trim(),
        phone: formData.get("phone").trim(),
        payment_method: formData.get("payment_method")
    };

    if (payload.customer_name.length < 2) {
        showMessage("Please enter your full name.");
        return;
    }

    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "Placing your order...";

    checkoutMessage.hidden = true;

    try {
        const csrfResponse = await fetch("/api/csrf-token", {
            credentials: "same-origin"
        });

        const csrfData = await csrfResponse.json();

        if (!csrfResponse.ok || !csrfData.success) {
            throw new Error("Unable to verify your checkout request. Please try again.");
        }

        const response = await fetch("/api/checkout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfData.csrfToken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to place your order.");
        }

        // Keep the order details available for the confirmation page.
        // Session storage is temporary and is not used to store the cart.
        sessionStorage.setItem("campusbite_last_order", JSON.stringify(data.order));

        window.location.href = "order-confirmation.html";
    } catch (error) {
        showMessage(error.message || "Something went wrong. Please try again.");
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = "Place Order →";
    }
});

loadCheckout();