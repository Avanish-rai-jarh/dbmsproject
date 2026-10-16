document.addEventListener("DOMContentLoaded", () => {
    const ordersList = document.getElementById("ordersList");
    const ordersMessage = document.getElementById("ordersMessage");
    const emptyOrders = document.getElementById("emptyOrders");

    const totalOrdersElement = document.getElementById("totalOrders");
    const activeOrdersElement = document.getElementById("activeOrders");
    const completedOrdersElement = document.getElementById("completedOrders");

    const ORDERS_API = "/api/orders/my-orders";

    function formatMoney(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    function formatDate(value) {
        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function normalizeStatus(status) {
        return String(status || "UNKNOWN")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");
    }

    function isCompleted(order) {
        return ["DELIVERED", "COMPLETED", "SERVED"].includes(
            normalizeStatus(order.order_status)
        );
    }

    function isCancelled(order) {
        return ["CANCELLED", "CANCELED", "REJECTED"].includes(
            normalizeStatus(order.order_status)
        );
    }

    function isActive(order) {
        return !isCompleted(order) && !isCancelled(order);
    }

    function createElement(tag, className = "", text = "") {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== null && text !== undefined) {
            element.textContent = String(text);
        }

        return element;
    }

    function showMessage(message, type = "info") {
        ordersMessage.textContent = message;
        ordersMessage.className = `orders-message ${type}`;
        ordersMessage.hidden = false;
    }

    function hideMessage() {
        ordersMessage.textContent = "";
        ordersMessage.hidden = true;
    }

    function updateSummary(orders) {
        totalOrdersElement.textContent = orders.length;

        activeOrdersElement.textContent =
            orders.filter(isActive).length;

        completedOrdersElement.textContent =
            orders.filter(isCompleted).length;
    }

    function renderItems(items) {
        const list = createElement("div", "order-items");

        if (!Array.isArray(items) || items.length === 0) {
            list.appendChild(
                createElement("p", "empty-items", "No item details available.")
            );
            return list;
        }

        items.forEach(item => {
            const row = createElement("div", "order-item-row");

            const name = createElement(
                "span",
                "order-item-name",
                item.item_name || item.name || "Menu item"
            );

            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;

            const quantityText = createElement(
                "span",
                "order-item-quantity",
                `× ${quantity}`
            );

            const price = createElement(
                "span",
                "order-item-price",
                formatMoney(unitPrice * quantity)
            );

            row.append(name, quantityText, price);
            list.appendChild(row);
        });

        return list;
    }

    function renderTrackingDetails(order, container) {
        container.replaceChildren();

        container.appendChild(
            createElement("h4", "", "Order Tracking Details")
        );

        const details = [
            ["Order ID", order.order_id],
            ["Token Number", order.token_no],
            ["Order Date", formatDate(order.order_time)],
            ["Order Status", normalizeStatus(order.order_status)],
            ["Payment Method", order.payment_method || "Not available"],
            ["Payment Status", order.payment_status || "Not available"]
        ];

        details.forEach(([label, value]) => {
            const row = createElement("p", "tracking-detail");

            row.append(
                createElement("strong", "", `${label}: `),
                createElement("span", "", value ?? "Not available")
            );

            container.appendChild(row);
        });

        if (Number(order.refund_amount) > 0) {
            container.appendChild(
                createElement(
                    "p",
                    "tracking-detail",
                    `Refund Amount: ${formatMoney(order.refund_amount)}`
                )
            );
        }

        const refreshButton = createElement(
            "button",
            "refresh-single-order",
            "Refresh Order Status"
        );

        refreshButton.type = "button";

        refreshButton.addEventListener("click", async () => {
            refreshButton.disabled = true;
            refreshButton.textContent = "Refreshing...";

            try {
                const response = await fetch(
                    `/api/orders/${encodeURIComponent(order.order_id)}/details`,
                    {
                        method: "GET",
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );

                if (response.status === 401) {
                    window.location.href = "/customer-login.html";
                    return;
                }

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to refresh this order.");
                }

                await loadOrders(order.order_id);
            } catch (error) {
                console.error("Order status refresh error:", error);
                alert(error.message || "Unable to refresh order status.");
            } finally {
                refreshButton.disabled = false;
                refreshButton.textContent = "Refresh Order Status";
            }
        });

        container.appendChild(refreshButton);

        container.appendChild(
            createElement(
                "p",
                "tracking-note",
                "Refresh to retrieve the latest status from the server."
            )
        );
    }

    function renderOrder(order) {
        const card = createElement("article", "order-card");

        const header = createElement("div", "order-card-header");
        const orderInfo = createElement("div", "order-main-info");

        orderInfo.append(
            createElement("h3", "order-number", `Order #${order.order_id}`),
            createElement("p", "order-date", formatDate(order.order_time))
        );

        const status = normalizeStatus(order.order_status);

        const statusBadge = createElement(
            "span",
            `order-status status-${status.toLowerCase().replace(/_/g, "-")}`,
            status
        );

        header.append(orderInfo, statusBadge);

        const token = createElement("div", "order-token");

        token.append(
            createElement("span", "token-label", "Token Number"),
            createElement("strong", "token-value", order.token_no ?? "—")
        );

        const itemsHeading = createElement(
            "h4",
            "order-section-heading",
            "Ordered Items"
        );

        const items = renderItems(order.items);

        const paymentSection = createElement(
            "div",
            "order-payment-section"
        );

        paymentSection.append(
            createElement("span", "payment-label", "Payment Status"),
            createElement(
                "span",
                "payment-status",
                order.payment_status || "Not available"
            )
        );

        const paymentMethod = createElement(
            "p",
            "payment-method",
            `Payment Method: ${order.payment_method || "Not available"}`
        );

        const total = createElement("div", "order-total");

        total.append(
            createElement("span", "", "Order Total"),
            createElement("strong", "", formatMoney(order.total_amount))
        );

        if (Number(order.refund_amount) > 0) {
            total.appendChild(
                createElement(
                    "p",
                    "order-refund",
                    `Refunded: ${formatMoney(order.refund_amount)}`
                )
            );
        }

        const actions = createElement("div", "order-card-actions");

        const trackButton = createElement(
            "button",
            "track-order-button",
            "Track Order"
        );

        trackButton.type = "button";
        trackButton.setAttribute("aria-expanded", "false");

        const trackingContainer = createElement(
            "div",
            "order-tracking-details"
        );

        trackingContainer.hidden = true;

        trackButton.addEventListener("click", () => {
            const currentlyOpen = !trackingContainer.hidden;

            trackingContainer.hidden = currentlyOpen;

            trackButton.textContent = currentlyOpen
                ? "Track Order"
                : "Hide Tracking";

            trackButton.setAttribute(
                "aria-expanded",
                String(!currentlyOpen)
            );

            if (!currentlyOpen) {
                renderTrackingDetails(order, trackingContainer);
            }
        });

        actions.appendChild(trackButton);

        card.append(
            header,
            token,
            itemsHeading,
            items,
            paymentSection,
            paymentMethod,
            total,
            actions,
            trackingContainer
        );

        return card;
    }

    function renderOrders(orders, preserveOpenOrderId = null) {
        ordersList.replaceChildren();

        if (orders.length === 0) {
            hideMessage();
            emptyOrders.hidden = false;
            return;
        }

        emptyOrders.hidden = true;
        hideMessage();

        orders.forEach(order => {
            const card = renderOrder(order);

            ordersList.appendChild(card);

            if (
                preserveOpenOrderId !== null &&
                String(order.order_id) === String(preserveOpenOrderId)
            ) {
                card.querySelector(".track-order-button")?.click();
            }
        });
    }

    async function loadOrders(preserveOpenOrderId = null) {
        showMessage("Loading your orders...", "info");

        try {
            const response = await fetch(ORDERS_API, {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            if (response.status === 401) {
                window.location.href = "/customer-login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message || "Unable to load your orders."
                );
            }

            if (!Array.isArray(data.orders)) {
                throw new Error("Invalid response received from the server.");
            }

            updateSummary(data.orders);
            renderOrders(data.orders, preserveOpenOrderId);
        } catch (error) {
            console.error("Failed to load orders:", error);

            emptyOrders.hidden = true;

            showMessage(
                error.message || "Could not load your orders. Please try again.",
                "error"
            );
        }
    }

    loadOrders();
});