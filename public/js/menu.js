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
    const normalized = name.toLowerCase();

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
        }, 800);

    } catch (error) {
        alert(error.message);
        button.textContent = "+ Add";

    } finally {
        button.disabled = false;
    }
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
            ? "No food items found. Try another food name or category."
            : "Our menu is being prepared. Food items will appear here when added to the database.";

        return;
    }

    menuMessage.textContent = "";

    items.forEach(item => {
        const card = document.createElement("article");
        card.className = "food-card";

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

        const name = document.createElement("h3");
        name.textContent = item.ITEM_NAME;

        const category = document.createElement("p");
        category.className = "food-category";
        category.textContent = item.CATEGORY_NAME;

        const bottom = document.createElement("div");
        bottom.className = "food-card-bottom";

        const price = document.createElement("span");
        price.className = "food-price";
        price.textContent = `₹${Number(item.PRICE).toFixed(2)}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "add-button";

        const available = item.IS_AVAILABLE === "Y";

        button.textContent = available ? "+ Add" : "Unavailable";
        button.disabled = !available;

        button.addEventListener("click", () => {
            addToCart(item, button);
        });

        bottom.append(price, button);
        card.append(imageContainer, name, category, bottom);

        menuGrid.appendChild(card);
    });
}

// Search by food name or category as the user types
function searchMenu() {
    const query = menuSearch.value.trim().toLowerCase();

    const filteredItems = allMenuItems.filter(item => {
        const foodName = String(item.ITEM_NAME || "").toLowerCase();
        const categoryName = String(item.CATEGORY_NAME || "").toLowerCase();

        return foodName.includes(query) ||
               categoryName.includes(query);
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

// Live search event
if (menuSearch) {
    menuSearch.addEventListener("input", searchMenu);
}

cartButton.addEventListener("click", () => {
    window.location.href = "/cart.html";
});

updateCartCount();
loadMenu();