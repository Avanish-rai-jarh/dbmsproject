const trackingForm = document.getElementById("trackingForm");
const trackButton = document.getElementById("trackButton");
const trackingMessage = document.getElementById("trackingMessage");
const orderResult = document.getElementById("orderResult");

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(amount);
}

function showTrackingMessage(message) {
    trackingMessage.textContent = message;
    trackingMessage.hidden = false;
}

function displayOrder(order) {
    document.getElementById("resultOrderId").textContent = order.order_id;
    document.getElementById("resultToken").textContent = order.token_no;
    document.getElementById("resultCustomer").textContent = order.customer_name;

    const orderTime = order.order_time
        ? new Date(order.order_time).toLocaleString("en-IN")
        : "Not available";

    document.getElementById("resultTime").textContent = orderTime;

    document.getElementById("resultPaymentMethod").textContent =
        order.payment_method || "Not available";

    document.getElementById("resultPaymentStatus").textContent =
        order.payment_status || "Not available";

    document.getElementById("resultTotal").textContent =
        formatCurrency(Number(order.total));

    const statusElement = document.getElementById("resultStatus");
    statusElement.textContent = order.order_status;

    statusElement.className =
        "status-badge " + String(order.order_status).toLowerCase();

    const itemsContainer = document.getElementById("resultItems");
    itemsContainer.replaceChildren();

    for (const item of order.items) {
        const row = document.createElement("div");
        row.className = "result-item";

        const details = document.createElement("div");

        const name = document.createElement("div");
        name.className = "result-item-name";
        name.textContent = item.item_name;

        const quantity = document.createElement("div");
        quantity.className = "result-item-details";
        quantity.textContent =
            `${item.quantity} × ${formatCurrency(Number(item.unit_price))}`;

        const price = document.createElement("div");
        price.className = "result-item-price";
        price.textContent = formatCurrency(Number(item.line_total));

        details.append(name, quantity);
        row.append(details, price);
        itemsContainer.appendChild(row);
    }

    orderResult.hidden = false;
}

trackingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    trackingMessage.hidden = true;
    orderResult.hidden = true;

    const orderId = Number(document.getElementById("orderId").value);
    const tokenNo = Number(document.getElementById("tokenNo").value);

    if (
        !Number.isSafeInteger(orderId) ||
        orderId <= 0 ||
        !Number.isSafeInteger(tokenNo) ||
        tokenNo <= 0
    ) {
        showTrackingMessage("Enter a valid Order ID and Token Number.");
        return;
    }

    trackButton.disabled = true;
    trackButton.textContent = "Searching...";

    try {
        const response = await fetch("/api/orders/track", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_id: orderId,
                token_no: tokenNo
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to find your order.");
        }

        displayOrder(data.order);
    } catch (error) {
        showTrackingMessage(
            error.message || "Something went wrong. Please try again."
        );
    } finally {
        trackButton.disabled = false;
        trackButton.textContent = "Track Order →";
    }
});