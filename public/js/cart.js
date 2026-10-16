const cartMessage = document.getElementById("cartMessage");
const cartItemsContainer = document.getElementById("cartItems");
const itemCount = document.getElementById("itemCount");

const summaryQuantity = document.getElementById("summaryQuantity");
const summarySubtotal = document.getElementById("summarySubtotal");
const summaryTotal = document.getElementById("summaryTotal");

const checkoutButton = document.getElementById("checkoutButton");

async function fetchJSON(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});

    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (!safeMethods.includes(method)) {
        const csrfResponse = await fetch("/api/csrf-token", {
            credentials: "same-origin"
        });

        const csrfData = await csrfResponse.json();

        if (!csrfResponse.ok || !csrfData.success) {
            throw new Error(
                csrfData.message || "Unable to obtain CSRF token."
            );
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

function formatMoney(amount) {
    return `₹${Number(amount).toFixed(2)}`;
}

function createEmptyCart() {
    const wrapper = document.createElement("div");
    wrapper.className = "empty-cart";

    const icon = document.createElement("div");
    icon.className = "empty-cart-icon";
    icon.textContent = "🛒";

    const heading = document.createElement("h3");
    heading.textContent = "Your cart is empty";

    const message = document.createElement("p");
    message.textContent =
        "You haven't added any food yet. Explore the menu and find something delicious.";

    const link = document.createElement("a");
    link.href = "/#menu";
    link.textContent = "Explore menu";

    wrapper.append(icon, heading, message, link);

    return wrapper;
}

function createCartRow(item) {
    const row = document.createElement("article");
    row.className = "cart-row";

    const details = document.createElement("div");

    const name = document.createElement("h3");
    name.className = "cart-row-name";
    name.textContent = item.name;

    const price = document.createElement("p");
    price.className = "cart-row-price";
    price.textContent = `${formatMoney(item.price)} each`;

    const subtotal = document.createElement("p");
    subtotal.className = "cart-row-subtotal";
    subtotal.textContent = formatMoney(item.price * item.quantity);

    const controls = document.createElement("div");
    controls.className = "cart-row-controls";

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.className = "quantity-button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Decrease ${item.name}`);

    decrease.addEventListener("click", () => {
        updateQuantity(item.id, item.quantity - 1);
    });

    const quantity = document.createElement("span");
    quantity.className = "quantity-value";
    quantity.textContent = item.quantity;

    const increase = document.createElement("button");
    increase.type = "button";
    increase.className = "quantity-button";
    increase.textContent = "+";
    increase.disabled = item.quantity >= 99;
    increase.setAttribute("aria-label", `Increase ${item.name}`);

    increase.addEventListener("click", () => {
        updateQuantity(item.id, item.quantity + 1);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "Remove";

    remove.addEventListener("click", () => {
        removeItem(item.id);
    });

    controls.append(decrease, quantity, increase, remove);
    details.append(name, price, subtotal, controls);

    const rowTotal = document.createElement("div");
    rowTotal.className = "cart-row-total";
    rowTotal.textContent = formatMoney(item.price * item.quantity);

    row.append(details, rowTotal);

    return row;
}

function renderCart(cart) {
    const items = cart.items || [];

    cartItemsContainer.replaceChildren();

    itemCount.textContent =
        `${items.length} ${items.length === 1 ? "item" : "items"}`;

    summaryQuantity.textContent = cart.totalQuantity;
    summarySubtotal.textContent = formatMoney(cart.total);
    summaryTotal.textContent = formatMoney(cart.total);

    checkoutButton.disabled = items.length === 0;

    if (items.length === 0) {
        cartItemsContainer.appendChild(createEmptyCart());
        return;
    }

    items.forEach(item => {
        cartItemsContainer.appendChild(createCartRow(item));
    });
}

async function loadCart() {
    cartMessage.textContent = "Loading your cart...";

    try {
        const data = await fetchJSON("/api/cart");

        renderCart(data.cart);

        cartMessage.textContent = "";

    } catch (error) {
        console.error("Cart loading error:", error);

        cartMessage.textContent =
            "Unable to load your cart. Please refresh the page.";
    }
}

async function updateQuantity(itemId, quantity) {
    try {
        const data = await fetchJSON(`/api/cart/items/${itemId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ quantity })
        });

        renderCart(data.cart);
        cartMessage.textContent = "";

    } catch (error) {
        cartMessage.textContent = error.message;
    }
}

async function removeItem(itemId) {
    try {
        const data = await fetchJSON(`/api/cart/items/${itemId}`, {
            method: "DELETE"
        });

        renderCart(data.cart);
        cartMessage.textContent = "";

    } catch (error) {
        cartMessage.textContent = error.message;
    }
}

checkoutButton.addEventListener("click", () => {
    window.location.href = "checkout.html";
});

loadCart();