const confirmationMessage = document.getElementById("confirmationMessage");
const orderDetails = document.getElementById("orderDetails");

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(amount);
}

function showConfirmationError(message) {
    confirmationMessage.textContent = message;
    confirmationMessage.hidden = false;
    orderDetails.hidden = true;
}

function addInformationRow(container, item) {
    const row = document.createElement("div");
    row.className = "confirmed-item";

    const details = document.createElement("div");

    const name = document.createElement("div");
    name.className = "confirmed-item-name";
    name.textContent = item.itemName;

    const quantity = document.createElement("div");
    quantity.className = "confirmed-item-details";
    quantity.textContent =
        `${item.quantity} × ${formatCurrency(Number(item.price))}`;

    const price = document.createElement("div");
    price.className = "confirmed-item-price";
    price.textContent =
        formatCurrency(Number(item.price) * Number(item.quantity));

    details.append(name, quantity);
    row.append(details, price);
    container.appendChild(row);
}

try {
    const savedOrder = sessionStorage.getItem("campusbite_last_order");

    if (!savedOrder) {
        showConfirmationError(
            "No recent order details were found. Please check your orders or return to the menu."
        );
    } else {
        const order = JSON.parse(savedOrder);

        if (
            !order ||
            !Array.isArray(order.items) ||
            !Number.isFinite(Number(order.order_id)) ||
            !Number.isFinite(Number(order.token_no))
        ) {
            throw new Error("The order confirmation details are invalid.");
        }

        document.getElementById("tokenNumber").textContent = order.token_no;
        document.getElementById("orderId").textContent = order.order_id;
        document.getElementById("customerName").textContent = order.customer_name;
        document.getElementById("orderStatus").textContent = order.order_status;
        document.getElementById("paymentMethod").textContent = order.payment_method;
        document.getElementById("paymentStatus").textContent = order.payment_status;
        document.getElementById("confirmedTotal").textContent =
            formatCurrency(Number(order.total));

        const itemsContainer = document.getElementById("confirmedItems");
        itemsContainer.replaceChildren();

        for (const item of order.items) {
            addInformationRow(itemsContainer, item);
        }

        orderDetails.hidden = false;
    }
} catch (error) {
    showConfirmationError(
        error.message || "Unable to display your order confirmation."
    );
}