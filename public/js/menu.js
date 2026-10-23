
const menuGrid = document.getElementById("menuGrid");
const menuMessage = document.getElementById("menuMessage");
const cartCount = document.getElementById("cartCount");
const cartButton = document.getElementById("cartButton");

// Search input
const menuSearch = document.getElementById("menuSearch");

let allMenuItems = [];

const foodIcons = {
    sandwich: "🥪",
    samosa: "🥟",
    thali: "🍛",
    coffee: "☕",
    tea: "🍵",
    burger: "🍔",
    pizza: "🍕",
    fries: "🍟",
    juice: "🧃",
    default: "🍽️"
};

function getFoodIcon(name) {
    const normalized = String(name || "").toLowerCase();

    const match = Object.keys(foodIcons).find(
        key => key !== "default" && normalized.includes(key)
    );

    return foodIcons[match || "default"];
}

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
                "Unable to verify your request. Please try again."
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

async function updateCartCount() {
    try {
        const data = await fetchJSON("/api/cart");
        cartCount.textContent = data.cart.totalQuantity;
    } catch (error) {
        console.error("Unable to load cart count:", error);
    }
}

async function addToCart(item, button) {
    button.disabled = true;
    button.textContent = "Adding...";

    try {
        await fetchJSON("/api/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                item_id: item.ITEM_ID,
                quantity: 1
            })
        });

        await updateCartCount();

        button.textContent = "✓ Added";

        setTimeout(() => {
            button.textContent = "+ Add";
            button.disabled = false;
        }, 800);

        return;

    } catch (error) {
        alert(error.message);
        button.textContent = "+ Add";
    }

    button.disabled = false;
}

function createFoodFallback(name) {
    const fallback = document.createElement("div");

    fallback.className = "food-icon";
    fallback.textContent = getFoodIcon(name);

    return fallback;
}

function renderMenu(items) {
    menuGrid.replaceChildren();

    if (items.length === 0) {
        menuMessage.textContent = menuSearch && menuSearch.value.trim()
            ? "No food items found. Try another food name, category or canteen."
            : "Our menu is being prepared. Food items will appear here when added to the database.";

        return;
    }

    menuMessage.textContent = "";

    items.forEach(item => {
        const card = document.createElement("article");
        card.className = "food-card";

        // Food image
        const imageContainer = document.createElement("div");
        imageContainer.className = "food-image-container";

        if (item.IMAGE_URL) {
            const image = document.createElement("img");

            image.className = "food-image";
            image.src = item.IMAGE_URL;
            image.alt = item.ITEM_NAME;
            image.loading = "lazy";

            image.addEventListener("error", () => {
                image.replaceWith(createFoodFallback(item.ITEM_NAME));
            }, { once: true });

            imageContainer.appendChild(image);
        } else {
            imageContainer.appendChild(
                createFoodFallback(item.ITEM_NAME)
            );
        }

        // Food name
        const name = document.createElement("h3");
        name.textContent = item.ITEM_NAME;

        // Canteen name
        const canteen = document.createElement("p");
        canteen.className = "food-canteen";
        canteen.textContent = item.CANTEEN_NAME
            ? `Canteen: ${item.CANTEEN_NAME}`
            : "Canteen not assigned";

        // Category
        const category = document.createElement("p");
        category.className = "food-category";
        category.textContent = item.CATEGORY_NAME;

        // Price and add button
        const bottom = document.createElement("div");
        bottom.className = "food-card-bottom";

        const price = document.createElement("span");
        price.className = "food-price";
        price.textContent = `₹${Number(item.PRICE).toFixed(2)}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "add-button";

        const available = item.IS_AVAILABLE === "Y";
        const hasCanteen = Boolean(
            item.CANTEEN_NAME &&
            item.CANTEEN_NAME.trim()
        );

        button.textContent = !hasCanteen
            ? "Canteen not set"
            : available
                ? "+ Add"
                : "Unavailable";

        button.disabled = !available || !hasCanteen;

        button.addEventListener("click", () => {
            addToCart(item, button);
        });

        bottom.append(price, button);

        card.append(
            imageContainer,
            name,
            canteen,
            category,
            bottom
        );

        menuGrid.appendChild(card);
    });
}

// Search by food name, category or canteen name
function searchMenu() {
    const query = menuSearch
        ? menuSearch.value.trim().toLowerCase()
        : "";

    const filteredItems = allMenuItems.filter(item => {
        const foodName = String(item.ITEM_NAME || "").toLowerCase();
        const categoryName = String(item.CATEGORY_NAME || "").toLowerCase();
        const canteenName = String(item.CANTEEN_NAME || "").toLowerCase();

        return foodName.includes(query) ||
            categoryName.includes(query) ||
            canteenName.includes(query);
    });

    renderMenu(filteredItems);
}

async function loadMenu() {
    menuMessage.textContent = "Loading menu from Oracle Database...";

    try {
        const data = await fetchJSON("/api/menu");

        allMenuItems = data.items || [];

        searchMenu();

    } catch (error) {
        console.error("Menu loading error:", error);

        menuMessage.textContent =
            "Unable to load the menu. Please check the server and try again.";
    }
}

// Live search
if (menuSearch) {
    menuSearch.addEventListener("input", searchMenu);
}

// Open cart
if (cartButton) {
    cartButton.addEventListener("click", () => {
        window.location.href = "/cart.html";
    });
}

updateCartCount();
loadMenu();


/* Animated search placeholder with a moving blinking cursor */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("menuSearch");
    if (!input) return;

    const container = input.parentElement;

    const messages = [
        "Find your favourite campus meal...",
        "Search for Aloo Paratha...",
        "Craving something sweet?",
        "Explore food from your canteen...",
        "Looking for snacks or drinks?"
    ];

    const overlay = document.createElement("div");
    overlay.className = "search-placeholder-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "search-placeholder-text";

    const cursor = document.createElement("span");
    cursor.className = "search-placeholder-cursor";

    overlay.append(text, cursor);
    container.appendChild(overlay);

    let messageIndex = 0;
    let position = 0;
    let deleting = false;
    let timer;


function updateVisibility() {
    const focused = document.activeElement === input;
    const hasValue = input.value.length > 0;
    const idle = !focused && !hasValue;

    overlay.style.display = idle ? "flex" : "none";

    input.placeholder = "Search food, category or canteen...";

    input.classList.toggle(
        "show-default-placeholder",
        focused && !hasValue
    );

    input.style.caretColor = idle ? "transparent" : "";
}


    function animate() {
        const message = messages[messageIndex];

        if (!deleting) {
            position++;
            text.textContent = message.slice(0, position);

            if (position >= message.length) {
                deleting = true;
                updateVisibility();
                timer = setTimeout(animate, 1400);
                return;
            }
        } else {
            position--;
            text.textContent = message.slice(0, position);

            if (position <= 0) {
                deleting = false;
                messageIndex = (messageIndex + 1) % messages.length;
                timer = setTimeout(animate, 0);
                return;
            }
        }

        updateVisibility();
        timer = setTimeout(animate, deleting ? 35 : 70);
    }

    input.addEventListener("focus", updateVisibility);
    input.addEventListener("blur", updateVisibility);
    input.addEventListener("input", updateVisibility);

    updateVisibility();
    timer = setTimeout(animate, 0);
});



//for serchbar icon at right end
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("menuSearch");
    const searchButton = document.getElementById("menuSearchButton");

    if (!searchInput || !searchButton) return;

    searchButton.addEventListener("click", () => {
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.focus();
    });
});

