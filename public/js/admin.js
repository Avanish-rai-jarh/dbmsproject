// const addItemForm = document.getElementById("addItemForm");
// const itemNameInput = document.getElementById("itemName");
// const categorySelect = document.getElementById("categoryId");
// const priceInput = document.getElementById("price");
// const imageUrlInput = document.getElementById("imageUrl");

// const imagePreviewContainer = document.getElementById(
//     "imagePreviewContainer"
// );

// const imagePreview = document.getElementById("imagePreview");

// const imagePreviewMessage = document.getElementById(
//     "imagePreviewMessage"
// );

// const saveButton = document.getElementById("saveButton");
// const formMessage = document.getElementById("formMessage");
// const menuTableBody = document.getElementById("menuTableBody");
// const refreshButton = document.getElementById("refreshButton");

// const totalItems = document.getElementById("totalItems");
// const availableItems = document.getElementById("availableItems");
// const unavailableItems = document.getElementById("unavailableItems");

// function showMessage(message, type) {
//     formMessage.textContent = message;
//     formMessage.className = `form-message ${type}`;
// }

// function updateImagePreview() {
//     const imageUrl = imageUrlInput.value.trim();

//     imagePreviewContainer.hidden = true;
//     imagePreview.removeAttribute("src");

//     if (!imageUrl) {
//         imagePreviewMessage.textContent =
//             "Enter an image URL to preview it.";
//         return;
//     }

//     let parsedUrl;

//     try {
//         parsedUrl = new URL(imageUrl);
//     } catch {
//         imagePreviewMessage.textContent =
//             "Please enter a valid image URL.";
//         return;
//     }

//     if (
//         parsedUrl.protocol !== "https:" &&
//         parsedUrl.protocol !== "http:"
//     ) {
//         imagePreviewMessage.textContent =
//             "Only HTTP and HTTPS image URLs are supported.";
//         return;
//     }

//     imagePreviewMessage.textContent = "Loading image...";

//     imagePreview.onload = () => {
//         imagePreviewContainer.hidden = false;
//         imagePreviewMessage.textContent = "";
//     };

//     imagePreview.onerror = () => {
//         imagePreviewContainer.hidden = true;
//         imagePreviewMessage.textContent =
//             "Unable to load this image. Try another image URL.";
//     };

//     imagePreview.src = parsedUrl.href;
// }

// imageUrlInput.addEventListener("input", updateImagePreview);

// async function fetchJSON(url, options = {}) {
//     const method = (options.method || "GET").toUpperCase();
//     const headers = new Headers(options.headers || {});

//     const safeMethods = ["GET", "HEAD", "OPTIONS"];

//     if (!safeMethods.includes(method)) {
//         const csrfResponse = await fetch("/api/csrf-token", {
//             credentials: "same-origin"
//         });

//         const csrfData = await csrfResponse.json();

//         if (!csrfResponse.ok || !csrfData.success) {
//             throw new Error(
//                 csrfData.message || "Unable to obtain CSRF token."
//             );
//         }

//         headers.set("X-CSRF-Token", csrfData.csrfToken);
//     }

//     const response = await fetch(url, {
//         ...options,
//         method,
//         headers,
//         credentials: "same-origin"
//     });

//     const data = await response.json();

//     if (!response.ok || !data.success) {
//         throw new Error(data.message || "Request failed.");
//     }

//     return data;
// }

// async function loadCategories() {
//     try {
//         const data = await fetchJSON("/api/admin/categories");

//         categorySelect.replaceChildren();

//         const placeholder = document.createElement("option");
//         placeholder.value = "";
//         placeholder.textContent = "Select a category";
//         categorySelect.appendChild(placeholder);

//         data.categories.forEach(category => {
//             const option = document.createElement("option");
//             option.value = category.CATEGORY_ID;
//             option.textContent = category.CATEGORY_NAME;
//             categorySelect.appendChild(option);
//         });

//     } catch (error) {
//         categorySelect.replaceChildren();

//         const option = document.createElement("option");
//         option.value = "";
//         option.textContent = "Unable to load categories";
//         categorySelect.appendChild(option);

//         showMessage(
//             "Could not load categories. Check the API and database.",
//             "error"
//         );

//         console.error(error);
//     }
// }

// async function loadMenuItems() {
//     menuTableBody.replaceChildren();

//     const loadingRow = document.createElement("tr");
//     const loadingCell = document.createElement("td");

//     loadingCell.colSpan = 6;
//     loadingCell.className = "empty-state";
//     loadingCell.textContent = "Loading menu items...";

//     loadingRow.appendChild(loadingCell);
//     menuTableBody.appendChild(loadingRow);

//     try {
//         const data = await fetchJSON("/api/admin/items");
//         const items = data.items;

//         totalItems.textContent = items.length;

//         availableItems.textContent = items.filter(
//             item => item.IS_AVAILABLE === "Y"
//         ).length;

//         unavailableItems.textContent = items.filter(
//             item => item.IS_AVAILABLE === "N"
//         ).length;

//         menuTableBody.replaceChildren();

//         if (items.length === 0) {
//             const row = document.createElement("tr");
//             const cell = document.createElement("td");

//             cell.colSpan = 6;
//             cell.className = "empty-state";
//             cell.textContent =
//                 "No food items yet. Add your first item using the form.";

//             row.appendChild(cell);
//             menuTableBody.appendChild(row);

//             return;
//         }

//         items.forEach(item => {
//             const row = document.createElement("tr");

//             const values = [
//                 item.ITEM_ID,
//                 item.ITEM_NAME,
//                 item.CATEGORY_NAME,
//                 `₹${Number(item.PRICE).toFixed(2)}`
//             ];

//             values.forEach(value => {
//                 const cell = document.createElement("td");
//                 cell.textContent = value;
//                 row.appendChild(cell);
//             });

//             const statusCell = document.createElement("td");
//             const status = document.createElement("span");

//             const available = item.IS_AVAILABLE === "Y";

//             status.className = available
//                 ? "status available"
//                 : "status unavailable";

//             status.textContent = available
//                 ? "Available"
//                 : "Unavailable";

//             statusCell.appendChild(status);
//             row.appendChild(statusCell);

//             const actionsCell = document.createElement("td");
//             actionsCell.className = "action-cell";

//             const editButton = document.createElement("button");
//             editButton.className = "action-button edit-button";
//             editButton.textContent = "Edit";

//             editButton.addEventListener("click", () => {
//                 editMenuItem(item);
//             });

//             const availabilityButton = document.createElement("button");

//             availabilityButton.className =
//                 "action-button availability-button";

//             availabilityButton.textContent = available
//                 ? "Mark unavailable"
//                 : "Mark available";

//             availabilityButton.addEventListener("click", () => {
//                 toggleAvailability(item, availabilityButton);
//             });

//             actionsCell.append(editButton, availabilityButton);
//             row.appendChild(actionsCell);

//             menuTableBody.appendChild(row);
//         });

//     } catch (error) {
//         menuTableBody.replaceChildren();

//         const row = document.createElement("tr");
//         const cell = document.createElement("td");

//         cell.colSpan = 6;
//         cell.className = "empty-state";
//         cell.textContent = "Unable to load menu items. Please refresh.";

//         row.appendChild(cell);
//         menuTableBody.appendChild(row);

//         console.error(error);
//     }
// }

// addItemForm.addEventListener("submit", async event => {
//     event.preventDefault();

//     saveButton.disabled = true;
//     saveButton.textContent = "Saving...";
//     showMessage("", "");

//     const payload = {
//         item_name: itemNameInput.value.trim(),
//         category_id: categorySelect.value,
//         price: priceInput.value,
//         image_url: imageUrlInput.value.trim()
//     };

//     try {
//         const data = await fetchJSON("/api/admin/items", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify(payload)
//         });

//         showMessage(data.message, "success");

//         addItemForm.reset();
//         updateImagePreview();

//         await loadMenuItems();

//     } catch (error) {
//         showMessage(error.message, "error");

//     } finally {
//         saveButton.disabled = false;
//         saveButton.textContent = "Add to menu →";
//     }
// });

// refreshButton.addEventListener("click", loadMenuItems);

// async function initializeAdmin() {
//     await Promise.all([
//         loadCategories(),
//         loadMenuItems()
//     ]);
// }

// initializeAdmin();

// const addCategoryForm = document.getElementById("addCategoryForm");
// const categoryNameInput = document.getElementById("categoryName");
// const categoryButton = document.getElementById("categoryButton");
// const categoryMessage = document.getElementById("categoryMessage");

// addCategoryForm.addEventListener("submit", async event => {
//     event.preventDefault();

//     categoryButton.disabled = true;
//     categoryButton.textContent = "Saving...";

//     categoryMessage.textContent = "";
//     categoryMessage.className = "form-message";

//     try {
//         const data = await fetchJSON("/api/admin/categories", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 category_name: categoryNameInput.value.trim()
//             })
//         });

//         categoryMessage.textContent = data.message;
//         categoryMessage.className = "form-message success";

//         addCategoryForm.reset();

//         await loadCategories();

//     } catch (error) {
//         categoryMessage.textContent = error.message;
//         categoryMessage.className = "form-message error";

//     } finally {
//         categoryButton.disabled = false;
//         categoryButton.textContent = "Add category";
//     }
// });

// async function editMenuItem(item) {
//     const newName = prompt("Enter food name:", item.ITEM_NAME);

//     if (newName === null) {
//         return;
//     }

//     if (!newName.trim()) {
//         alert("Food name cannot be empty.");
//         return;
//     }

//     const newPrice = prompt(
//         "Enter price in ₹:",
//         Number(item.PRICE).toFixed(2)
//     );

//     const newImageUrl = prompt(
//         "Enter the food image URL (leave empty for no image):",
//         item.IMAGE_URL || ""
//     );

//     if (newImageUrl === null) {
//         return;
//     }

//     const imageUrl = newImageUrl.trim();

//     if (imageUrl.length > 1000) {
//         alert("Image URL must not exceed 1000 characters.");
//         return;
//     }

//     if (imageUrl) {
//         try {
//             const parsedUrl = new URL(imageUrl);

//             if (
//                 parsedUrl.protocol !== "https:" &&
//                 parsedUrl.protocol !== "http:"
//             ) {
//                 throw new Error("Invalid protocol");
//             }

//         } catch {
//             alert("Enter a valid HTTP or HTTPS image URL.");
//             return;
//         }
//     }

//     if (newPrice === null) {
//         return;
//     }

//     const price = Number(newPrice);

//     if (
//         !Number.isFinite(price) ||
//         price < 0 ||
//         Math.round(price * 100) !== price * 100
//     ) {
//         alert("Enter a valid price with at most two decimal places.");
//         return;
//     }

//     try {
//         const categoryData = await fetchJSON("/api/admin/categories");
//         const categories = categoryData.categories;

//         if (categories.length === 0) {
//             alert("Add a category before editing this item.");
//             return;
//         }

//         const categoryOptions = categories.map(
//             category =>
//                 `${category.CATEGORY_ID}: ${category.CATEGORY_NAME}`
//         ).join("\n");

//         const categoryInput = prompt(
//             `Enter the category ID:\n${categoryOptions}`,
//             String(item.CATEGORY_ID)
//         );

//         if (categoryInput === null) {
//             return;
//         }

//         const categoryId = Number(categoryInput);

//         if (!categories.some(
//             category => Number(category.CATEGORY_ID) === categoryId
//         )) {
//             alert("Select a valid category ID.");
//             return;
//         }

//         const data = await fetchJSON(
//             `/api/admin/items/${item.ITEM_ID}`,
//             {
//                 method: "PUT",
//                 headers: {
//                     "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify({
//                     item_name: newName.trim(),
//                     category_id: categoryId,
//                     price,
//                     image_url: imageUrl
//                 })
//             }
//         );

//         alert(data.message);

//         await loadMenuItems();

//     } catch (error) {
//         alert(error.message);
//     }
// }

// async function toggleAvailability(item, button) {
//     button.disabled = true;

//     try {
//         await fetchJSON(
//             `/api/admin/items/${item.ITEM_ID}/availability`,
//             {
//                 method: "PATCH"
//             }
//         );

//         await loadMenuItems();

//     } catch (error) {
//         alert(error.message);

//     } finally {
//         button.disabled = false;
//     }
// }


// // ==========================================
// // ASSIGNED ORDER ITEMS
// // ==========================================

// const ordersTableBody = document.getElementById("ordersTableBody");
// const refreshOrdersButton = document.getElementById("refreshOrdersButton");
// const ordersMessage = document.getElementById("ordersMessage");
// const totalOrdersElement = document.getElementById("totalOrders");
// const pendingOrdersElement = document.getElementById("pendingOrders");
// const readyOrdersElement = document.getElementById("readyOrders");

// const allowedItemStatuses = [
//     "PENDING",
//     "PREPARING",
//     "READY",
//     "COMPLETED",
//     "CANCELLED"
// ];

// function showOrdersMessage(message, type = "") {
//     ordersMessage.textContent = message;
//     ordersMessage.className = `form-message ${type}`;
// }

// function formatOrderCurrency(amount) {
//     return new Intl.NumberFormat("en-IN", {
//         style: "currency",
//         currency: "INR"
//     }).format(Number(amount) || 0);
// }

// function formatOrderDate(dateValue) {
//     if (!dateValue) return "Not available";

//     const date = new Date(dateValue);

//     return Number.isNaN(date.getTime())
//         ? String(dateValue)
//         : date.toLocaleString("en-IN");
// }

// function createOrderCell(value) {
//     const cell = document.createElement("td");
//     cell.textContent = value ?? "—";
//     return cell;
// }

// function createItemStatusSelect(currentStatus) {
//     const select = document.createElement("select");
//     select.className = "order-status-select";
//     select.setAttribute("aria-label", "Choose assigned item status");

//     allowedItemStatuses.forEach(status => {
//         const option = document.createElement("option");
//         option.value = status;
//         option.textContent = status;
//         select.appendChild(option);
//     });

//     select.value = allowedItemStatuses.includes(currentStatus)
//         ? currentStatus
//         : "PENDING";

//     return select;
// }

// async function loadOrders() {
//     ordersTableBody.replaceChildren();

//     const loadingRow = document.createElement("tr");
//     const loadingCell = document.createElement("td");

//     loadingCell.colSpan = 9;
//     loadingCell.className = "empty-state";
//     loadingCell.textContent = "Loading your assigned order items...";

//     loadingRow.appendChild(loadingCell);
//     ordersTableBody.appendChild(loadingRow);

//     refreshOrdersButton.disabled = true;
//     showOrdersMessage("");

//     try {
//         const data = await fetchJSON("/api/admin/assigned-items");
//         const items = data.items || data.assignedItems || [];

//         const ordersById = new Map();

//         items.forEach(item => {
//             const orderId = Number(item.ORDER_ID ?? item.order_id);

//             if (!ordersById.has(orderId)) {
//                 ordersById.set(orderId, item);
//             }
//         });

//         const uniqueOrders = [...ordersById.values()];

//         totalOrdersElement.textContent = uniqueOrders.length;

//         pendingOrdersElement.textContent = uniqueOrders.filter(
//             order =>
//                 String(order.ORDER_STATUS || "").toUpperCase() === "PENDING"
//         ).length;

//         readyOrdersElement.textContent = uniqueOrders.filter(
//             order =>
//                 String(order.ORDER_STATUS || "").toUpperCase() === "READY"
//         ).length;

//         const revenue = uniqueOrders.reduce((sum, order) => {
//             const isPaymentAdmin =
//                 order.IS_PAYMENT_ADMIN === "Y" ||
//                 order.is_payment_admin === true ||
//                 order.isPaymentAdmin === true;

//             if (!isPaymentAdmin) {
//                 return sum;
//             }

//             const paymentStatus = String(
//                 order.PAYMENT_STATUS || ""
//             ).toUpperCase();

//             const amount = Number(order.TOTAL_AMOUNT || 0);
//             const refunded = Number(order.REFUND_AMOUNT || 0);

//             if (
//                 ["PAID", "REFUNDED"].includes(paymentStatus) &&
//                 Number.isFinite(amount) &&
//                 Number.isFinite(refunded) &&
//                 amount >= 0 &&
//                 refunded >= 0
//             ) {
//                 return sum + Math.max(0, amount - refunded);
//             }

//             return sum;
//         }, 0);

//         const revenueElement = document.getElementById("totalRevenue");

//         if (revenueElement) {
//             revenueElement.textContent = formatOrderCurrency(revenue);
//         }

//         ordersTableBody.replaceChildren();

//         if (items.length === 0) {
//             const row = document.createElement("tr");
//             const cell = document.createElement("td");

//             cell.colSpan = 9;
//             cell.className = "empty-state";
//             cell.textContent = "No order items are assigned to your account.";

//             row.appendChild(cell);
//             ordersTableBody.appendChild(row);

//             return;
//         }

//         const paymentControlsRendered = new Set();

//         items.forEach(item => {
//             const orderId = Number(item.ORDER_ID ?? item.order_id);
//             const itemId = Number(item.ITEM_ID ?? item.item_id);

//             const row = document.createElement("tr");

//             row.appendChild(createOrderCell(orderId));
//             row.appendChild(createOrderCell(item.TOKEN_NO));
//             row.appendChild(createOrderCell(item.CUSTOMER_NAME));
//             row.appendChild(createOrderCell(item.PHONE || "—"));
//             row.appendChild(
//                 createOrderCell(formatOrderDate(item.ORDER_TIME))
//             );
//             row.appendChild(createOrderCell(item.ITEM_NAME));

//             const quantity = Number(item.QUANTITY || 0);
//             const unitPrice = Number(item.UNIT_PRICE || 0);

//             row.appendChild(createOrderCell(
//                 `${quantity} × ${formatOrderCurrency(unitPrice)}`
//             ));

//             const paymentCell = document.createElement("td");

//             const paymentStatus =
//                 String(item.PAYMENT_STATUS || "UNKNOWN").toUpperCase();

//             const paymentMethod =
//                 String(item.PAYMENT_METHOD || "—").toUpperCase();

//             const paymentLabel = document.createElement("div");
//             paymentLabel.textContent =
//                 `${paymentMethod} · ${paymentStatus}`;

//             paymentCell.appendChild(paymentLabel);

//             const isPaymentAdmin = (
//                 item.IS_PAYMENT_ADMIN === "Y" ||
//                 item.is_payment_admin === true ||
//                 item.isPaymentAdmin === true
//             );

//             if (
//                 isPaymentAdmin &&
//                 !paymentControlsRendered.has(orderId)
//             ) {
//                 const amount = Number(item.TOTAL_AMOUNT || 0);
//                 const refunded = Number(item.REFUND_AMOUNT || 0);

//                 if (
//                     ["PAID", "REFUNDED"].includes(paymentStatus) &&
//                     amount > refunded
//                 ) {
//                     const refundButton = document.createElement("button");

//                     refundButton.type = "button";
//                     refundButton.className = "refund-payment-button";
//                     refundButton.textContent = "Refund";

//                     refundButton.addEventListener("click", async () => {
//                         const remaining = amount - refunded;

//                         const input = prompt(
//                             `Enter refund amount (₹${remaining.toFixed(2)} remaining):`
//                         );

//                         if (input === null) return;

//                         const refundAmount = Number(input);

//                         if (
//                             !Number.isFinite(refundAmount) ||
//                             refundAmount <= 0 ||
//                             Math.round(refundAmount * 100) !== refundAmount * 100 ||
//                             refundAmount > remaining
//                         ) {
//                             alert(
//                                 "Enter a valid refund amount within the remaining balance."
//                             );
//                             return;
//                         }

//                         if (!confirm(
//                             `Confirm recording a refund of ₹${refundAmount.toFixed(2)} for Order #${orderId}?\n\nEnsure the money has actually been returned to the customer.`
//                         )) {
//                             return;
//                         }

//                         refundButton.disabled = true;

//                         try {
//                             const result = await fetchJSON(
//                                 `/api/admin/orders/${orderId}/payment/refund`,
//                                 {
//                                     method: "PATCH",
//                                     headers: {
//                                         "Content-Type": "application/json"
//                                     },
//                                     body: JSON.stringify({
//                                         refund_amount: refundAmount
//                                     })
//                                 }
//                             );

//                             showOrdersMessage(
//                                 result.message || "Refund recorded.",
//                                 "success"
//                             );

//                             await loadOrders();
//                             await loadRefundHistory();

//                         } catch (error) {
//                             showOrdersMessage(error.message, "error");
//                             refundButton.disabled = false;
//                         }
//                     });

//                     paymentCell.appendChild(refundButton);
//                 }

//                 if (
//                     paymentMethod === "CASH" &&
//                     paymentStatus === "PENDING" &&
//                     String(item.ORDER_STATUS).toUpperCase() !== "CANCELLED"
//                 ) {
//                     const paidButton = document.createElement("button");

//                     paidButton.type = "button";
//                     paidButton.className = "mark-paid-button";
//                     paidButton.textContent = "Mark Paid";

//                     paidButton.addEventListener("click", async () => {
//                         if (!confirm(
//                             `Confirm that cash payment for Order #${orderId} has been received?`
//                         )) {
//                             return;
//                         }

//                         paidButton.disabled = true;

//                         try {
//                             const result = await fetchJSON(
//                                 `/api/admin/orders/${orderId}/payment/paid`,
//                                 {
//                                     method: "PATCH"
//                                 }
//                             );

//                             showOrdersMessage(
//                                 result.message || "Payment marked as paid.",
//                                 "success"
//                             );

//                             await loadOrders();

//                         } catch (error) {
//                             showOrdersMessage(error.message, "error");
//                             paidButton.disabled = false;
//                         }
//                     });

//                     paymentCell.appendChild(paidButton);
//                 }

//                 paymentControlsRendered.add(orderId);
//             }

//             if (!isPaymentAdmin) {
//                 const note = document.createElement("small");
//                 note.textContent =
//                     "Payment managed by designated admin";

//                 paymentCell.appendChild(note);
//             }

//             row.appendChild(paymentCell);

//             const statusCell = document.createElement("td");

//             const currentStatus =
//                 String(item.ITEM_STATUS || "PENDING").toUpperCase();

//             const statusSelect = createItemStatusSelect(currentStatus);

//             const saveButton = document.createElement("button");
//             saveButton.type = "button";
//             saveButton.className = "save-order-status";
//             saveButton.textContent = "Save";

//             if (["COMPLETED", "CANCELLED"].includes(currentStatus)) {
//                 statusSelect.disabled = true;
//                 saveButton.disabled = true;
//             }

//             saveButton.addEventListener("click", async () => {
//                 const newStatus = statusSelect.value;

//                 if (newStatus === currentStatus) {
//                     showOrdersMessage(
//                         `Item in Order #${orderId} already has status ${newStatus}.`
//                     );
//                     return;
//                 }

//                 statusSelect.disabled = true;
//                 saveButton.disabled = true;
//                 saveButton.textContent = "Saving...";

//                 try {
//                     const result = await fetchJSON(
//                         `/api/admin/assigned-items/${orderId}/${itemId}/status`,
//                         {
//                             method: "PATCH",
//                             headers: {
//                                 "Content-Type": "application/json"
//                             },
//                             body: JSON.stringify({
//                                 item_status: newStatus
//                             })
//                         }
//                     );

//                     showOrdersMessage(
//                         result.message || "Assigned item status updated.",
//                         "success"
//                     );

//                     await loadOrders();

//                 } catch (error) {
//                     showOrdersMessage(error.message, "error");

//                     statusSelect.disabled = false;
//                     saveButton.disabled = false;
//                     saveButton.textContent = "Save";
//                 }
//             });

//             statusCell.append(statusSelect, saveButton);
//             row.appendChild(statusCell);

//             ordersTableBody.appendChild(row);
//         });

//     } catch (error) {
//         ordersTableBody.replaceChildren();

//         const row = document.createElement("tr");
//         const cell = document.createElement("td");

//         cell.colSpan = 9;
//         cell.className = "empty-state";
//         cell.textContent =
//             "Unable to load assigned items. Please refresh.";

//         row.appendChild(cell);
//         ordersTableBody.appendChild(row);

//         showOrdersMessage(error.message, "error");

//         console.error("Assigned order items loading error:", error);

//     } finally {
//         refreshOrdersButton.disabled = false;
//     }
// }

// refreshOrdersButton.addEventListener("click", loadOrders);

// loadOrders();
// loadRefundHistory();


// // ==========================================
// // ADMIN LOGOUT
// // ==========================================

// const adminLogoutButton = document.getElementById("adminLogoutButton");

// if (adminLogoutButton) {
//     console.log("Admin logout button found.");

//     adminLogoutButton.addEventListener("click", async function () {
//         console.log("Logout button clicked.");

//         const confirmed = confirm("Are you sure you want to log out?");

//         if (!confirmed) {
//             return;
//         }

//         adminLogoutButton.disabled = true;
//         adminLogoutButton.textContent = "Logging out...";

//         try {
//             const csrfResponse = await fetch("/api/csrf-token", {
//                 credentials: "same-origin"
//             });

//             const csrfData = await csrfResponse.json();

//             if (!csrfResponse.ok || !csrfData.success) {
//                 throw new Error("Unable to obtain CSRF token.");
//             }

//             const response = await fetch("/api/auth/logout", {
//                 method: "POST",
//                 credentials: "same-origin",
//                 headers: {
//                     "X-CSRF-Token": csrfData.csrfToken
//                 }
//             });

//             const data = await response.json();

//             if (!response.ok || !data.success) {
//                 throw new Error(data.message || "Logout failed.");
//             }

//             window.location.replace("/admin-login.html");

//         } catch (error) {
//             console.error("Logout error:", error);

//             alert("Logout failed: " + error.message);

//             adminLogoutButton.disabled = false;
//             adminLogoutButton.textContent = "Logout";
//         }
//     });

// } else {
//     console.error(
//         "Admin logout button was not found in admin.html."
//     );
// }

// async function loadRefundHistory() {
//     const tbody = document.getElementById("refundHistoryBody");

//     if (!tbody) return;

//     try {
//         const response = await fetch("/api/admin/refund-history", {
//             method: "GET",
//             credentials: "same-origin"
//         });

//         const data = await response.json();

//         if (!response.ok || !data.success) {
//             throw new Error(
//                 data.message || "Failed to load refund history."
//             );
//         }

//         if (!data.refunds || data.refunds.length === 0) {
//             tbody.innerHTML = `
//                 <tr>
//                     <td colspan="6">No refund records found.</td>
//                 </tr>
//             `;
//             return;
//         }

//         tbody.replaceChildren();

//         data.refunds.forEach(refund => {
//             const row = document.createElement("tr");

//             const values = [
//                 refund.REFUND_ID,
//                 refund.ORDER_ID,
//                 refund.PAYMENT_ID,
//                 `₹${Number(refund.REFUND_AMOUNT).toFixed(2)}`,
//                 refund.REFUND_TIME
//                     ? new Date(refund.REFUND_TIME).toLocaleString("en-IN")
//                     : "—",
//                 refund.REFUND_NOTE || "—"
//             ];

//             values.forEach(value => {
//                 const cell = document.createElement("td");
//                 cell.textContent = String(value);
//                 row.appendChild(cell);
//             });

//             tbody.appendChild(row);
//         });

//     } catch (error) {
//         console.error("Error loading refund history:", error);

//         tbody.innerHTML = `
//             <tr>
//                 <td colspan="6">Unable to load refund history.</td>
//             </tr>
//         `;
//     }
// }


// ==========================================
// CAMPUSBITE ADMIN PANEL
// Menu management, categories, assigned orders,
// payment management, refunds, filters and logout
// ==========================================

const addItemForm = document.getElementById("addItemForm");
const itemNameInput = document.getElementById("itemName");
const categorySelect = document.getElementById("categoryId");
const priceInput = document.getElementById("price");
const imageUrlInput = document.getElementById("imageUrl");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewMessage = document.getElementById("imagePreviewMessage");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");
const menuTableBody = document.getElementById("menuTableBody");
const refreshButton = document.getElementById("refreshButton");
const totalItems = document.getElementById("totalItems");
const availableItems = document.getElementById("availableItems");
const unavailableItems = document.getElementById("unavailableItems");

function showMessage(message, type = "") {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

function updateImagePreview() {
    if (!imageUrlInput || !imagePreviewContainer || !imagePreview) return;

    const imageUrl = imageUrlInput.value.trim();
    imagePreviewContainer.hidden = true;
    imagePreview.removeAttribute("src");

    if (!imageUrl) {
        if (imagePreviewMessage) {
            imagePreviewMessage.textContent = "Enter an image URL to preview it.";
        }
        return;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        if (imagePreviewMessage) {
            imagePreviewMessage.textContent = "Please enter a valid image URL.";
        }
        return;
    }

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
        if (imagePreviewMessage) {
            imagePreviewMessage.textContent = "Only HTTP and HTTPS image URLs are supported.";
        }
        return;
    }

    if (imagePreviewMessage) {
        imagePreviewMessage.textContent = "Loading image...";
    }

    imagePreview.onload = () => {
        imagePreviewContainer.hidden = false;
        if (imagePreviewMessage) imagePreviewMessage.textContent = "";
    };

    imagePreview.onerror = () => {
        imagePreviewContainer.hidden = true;
        if (imagePreviewMessage) {
            imagePreviewMessage.textContent = "Unable to load this image. Try another image URL.";
        }
    };

    imagePreview.src = parsedUrl.href;
}

if (imageUrlInput) {
    imageUrlInput.addEventListener("input", updateImagePreview);
}

// ==========================================
// API HELPER WITH CSRF PROTECTION
// ==========================================

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
            throw new Error(csrfData.message || "Unable to obtain CSRF token.");
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

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

async function loadCategories() {
    if (!categorySelect) return;

    try {
        const data = await fetchJSON("/api/admin/categories");

        categorySelect.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a category";
        categorySelect.appendChild(placeholder);

        (data.categories || []).forEach(category => {
            const option = document.createElement("option");
            option.value = category.CATEGORY_ID;
            option.textContent = category.CATEGORY_NAME;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Category loading error:", error);
        showMessage("Could not load categories. Check the API and database.", "error");
    }
}

const addCategoryForm = document.getElementById("addCategoryForm");
const categoryNameInput = document.getElementById("categoryName");
const categoryButton = document.getElementById("categoryButton");
const categoryMessage = document.getElementById("categoryMessage");

if (addCategoryForm) {
    addCategoryForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (categoryButton) {
            categoryButton.disabled = true;
            categoryButton.textContent = "Saving...";
        }

        if (categoryMessage) {
            categoryMessage.textContent = "";
            categoryMessage.className = "form-message";
        }

        try {
            const data = await fetchJSON("/api/admin/categories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    category_name: categoryNameInput.value.trim()
                })
            });

            if (categoryMessage) {
                categoryMessage.textContent = data.message;
                categoryMessage.className = "form-message success";
            }

            addCategoryForm.reset();
            await loadCategories();
        } catch (error) {
            if (categoryMessage) {
                categoryMessage.textContent = error.message;
                categoryMessage.className = "form-message error";
            }
        } finally {
            if (categoryButton) {
                categoryButton.disabled = false;
                categoryButton.textContent = "Add category";
            }
        }
    });
}

// ==========================================
// MENU MANAGEMENT
// ==========================================

async function loadMenuItems() {
    if (!menuTableBody) return;

    menuTableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 6;
    loadingCell.className = "empty-state";
    loadingCell.textContent = "Loading menu items...";
    loadingRow.appendChild(loadingCell);
    menuTableBody.appendChild(loadingRow);

    try {
        const data = await fetchJSON("/api/admin/items");
        const items = data.items || [];

        if (totalItems) totalItems.textContent = items.length;

        if (availableItems) {
            availableItems.textContent = items.filter(
                item => item.IS_AVAILABLE === "Y"
            ).length;
        }

        if (unavailableItems) {
            unavailableItems.textContent = items.filter(
                item => item.IS_AVAILABLE === "N"
            ).length;
        }

        menuTableBody.replaceChildren();

        if (items.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.className = "empty-state";
            cell.textContent = "No food items yet. Add your first item using the form.";
            row.appendChild(cell);
            menuTableBody.appendChild(row);
            return;
        }

        items.forEach(item => {
            const row = document.createElement("tr");

            [
                item.ITEM_ID,
                item.ITEM_NAME,
                item.CATEGORY_NAME,
                `₹${Number(item.PRICE).toFixed(2)}`
            ].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value ?? "");
                row.appendChild(cell);
            });

            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            const available = item.IS_AVAILABLE === "Y";

            status.className = available
                ? "status available"
                : "status unavailable";

            status.textContent = available ? "Available" : "Unavailable";
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actionsCell = document.createElement("td");
            actionsCell.className = "action-cell";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "action-button edit-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => editMenuItem(item));

            const availabilityButton = document.createElement("button");
            availabilityButton.type = "button";
            availabilityButton.className = "action-button availability-button";
            availabilityButton.textContent = available
                ? "Mark unavailable"
                : "Mark available";

            availabilityButton.addEventListener("click", () => {
                toggleAvailability(item, availabilityButton);
            });

            actionsCell.append(editButton, availabilityButton);
            row.appendChild(actionsCell);
            menuTableBody.appendChild(row);
        });
    } catch (error) {
        menuTableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.className = "empty-state";
        cell.textContent = "Unable to load menu items. Please refresh.";
        row.appendChild(cell);
        menuTableBody.appendChild(row);

        console.error("Menu loading error:", error);
    }
}

if (addItemForm) {
    addItemForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        showMessage("", "");

        const payload = {
            item_name: itemNameInput.value.trim(),
            category_id: categorySelect.value,
            price: priceInput.value,
            image_url: imageUrlInput.value.trim()
        };

        try {
            const data = await fetchJSON("/api/admin/items", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            showMessage(data.message, "success");
            addItemForm.reset();
            updateImagePreview();
            await loadMenuItems();
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Add to menu →";
            }
        }
    });
}

if (refreshButton) {
    refreshButton.addEventListener("click", loadMenuItems);
}

async function editMenuItem(item) {
    const newName = prompt("Enter food name:", item.ITEM_NAME);
    if (newName === null) return;

    if (!newName.trim()) {
        alert("Food name cannot be empty.");
        return;
    }

    const newPrice = prompt(
        "Enter price in ₹:",
        Number(item.PRICE).toFixed(2)
    );

    if (newPrice === null) return;

    const price = Number(newPrice);

    if (
        !Number.isFinite(price) ||
        price < 0 ||
        Math.round(price * 100) !== price * 100
    ) {
        alert("Enter a valid price with at most two decimal places.");
        return;
    }

    const newImageUrl = prompt(
        "Enter the food image URL (leave empty for no image):",
        item.IMAGE_URL || ""
    );

    if (newImageUrl === null) return;

    const imageUrl = newImageUrl.trim();

    if (imageUrl.length > 1000) {
        alert("Image URL must not exceed 1000 characters.");
        return;
    }

    if (imageUrl) {
        try {
            const parsedUrl = new URL(imageUrl);

            if (!["https:", "http:"].includes(parsedUrl.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch {
            alert("Enter a valid HTTP or HTTPS image URL.");
            return;
        }
    }

    try {
        const categoryData = await fetchJSON("/api/admin/categories");
        const categories = categoryData.categories || [];

        if (categories.length === 0) {
            alert("Add a category before editing this item.");
            return;
        }

        const categoryOptions = categories.map(
            category => `${category.CATEGORY_ID}: ${category.CATEGORY_NAME}`
        ).join("\n");

        const categoryInput = prompt(
            `Enter the category ID:\n${categoryOptions}`,
            String(item.CATEGORY_ID)
        );

        if (categoryInput === null) return;

        const categoryId = Number(categoryInput);

        if (!categories.some(
            category => Number(category.CATEGORY_ID) === categoryId
        )) {
            alert("Select a valid category ID.");
            return;
        }

        const data = await fetchJSON(`/api/admin/items/${item.ITEM_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                item_name: newName.trim(),
                category_id: categoryId,
                price,
                image_url: imageUrl
            })
        });

        alert(data.message);
        await loadMenuItems();
    } catch (error) {
        alert(error.message);
    }
}

async function toggleAvailability(item, button) {
    button.disabled = true;

    try {
        await fetchJSON(`/api/admin/items/${item.ITEM_ID}/availability`, {
            method: "PATCH"
        });

        await loadMenuItems();
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
    }
}

// ==========================================
// ASSIGNED ORDER ITEMS AND FILTERS
// ==========================================

const ordersTableBody = document.getElementById("ordersTableBody");
const refreshOrdersButton = document.getElementById("refreshOrdersButton");
const ordersMessage = document.getElementById("ordersMessage");
const totalOrdersElement = document.getElementById("totalOrders");
const pendingOrdersElement = document.getElementById("pendingOrders");
const readyOrdersElement = document.getElementById("readyOrders");

const orderSearchInput = document.getElementById("orderSearchInput");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const orderPaymentFilter = document.getElementById("orderPaymentFilter");
const orderDateFilter = document.getElementById("orderDateFilter");
const clearOrderFiltersButton = document.getElementById("clearOrderFiltersButton");
const orderFilterCount = document.getElementById("orderFilterCount");

const allowedItemStatuses = [
    "PENDING",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED"
];

function showOrdersMessage(message, type = "") {
    if (!ordersMessage) return;
    ordersMessage.textContent = message;
    ordersMessage.className = `form-message ${type}`;
}

function formatOrderCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(amount) || 0);
}

function formatOrderDate(dateValue) {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    return Number.isNaN(date.getTime())
        ? String(dateValue)
        : date.toLocaleString("en-IN");
}

function createOrderCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}

function createItemStatusSelect(currentStatus) {
    const select = document.createElement("select");
    select.className = "order-status-select";
    select.setAttribute("aria-label", "Choose assigned item status");

    allowedItemStatuses.forEach(status => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
    });

    select.value = allowedItemStatuses.includes(currentStatus)
        ? currentStatus
        : "PENDING";

    return select;
}

async function loadOrders() {
    if (!ordersTableBody) return;

    ordersTableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 9;
    loadingCell.className = "empty-state";
    loadingCell.textContent = "Loading your assigned order items...";
    loadingRow.appendChild(loadingCell);
    ordersTableBody.appendChild(loadingRow);

    if (refreshOrdersButton) refreshOrdersButton.disabled = true;
    showOrdersMessage("");

    try {
        const data = await fetchJSON("/api/admin/assigned-items");
        const items = data.items || data.assignedItems || [];

        const ordersById = new Map();

        items.forEach(item => {
            const orderId = Number(item.ORDER_ID ?? item.order_id);

            if (!ordersById.has(orderId)) {
                ordersById.set(orderId, item);
            }
        });

        const uniqueOrders = [...ordersById.values()];

        if (totalOrdersElement) {
            totalOrdersElement.textContent = uniqueOrders.length;
        }

        if (pendingOrdersElement) {
            pendingOrdersElement.textContent = uniqueOrders.filter(
                order => String(order.ORDER_STATUS || "").toUpperCase() === "PENDING"
            ).length;
        }

        if (readyOrdersElement) {
            readyOrdersElement.textContent = uniqueOrders.filter(
                order => String(order.ORDER_STATUS || "").toUpperCase() === "READY"
            ).length;
        }

        const revenue = uniqueOrders.reduce((sum, order) => {
            const isPaymentAdmin =
                order.IS_PAYMENT_ADMIN === "Y" ||
                order.is_payment_admin === true ||
                order.isPaymentAdmin === true;

            if (!isPaymentAdmin) return sum;

            const paymentStatus = String(order.PAYMENT_STATUS || "").toUpperCase();
            const amount = Number(order.TOTAL_AMOUNT || 0);
            const refunded = Number(order.REFUND_AMOUNT || 0);

            if (
                ["PAID", "REFUNDED"].includes(paymentStatus) &&
                Number.isFinite(amount) &&
                Number.isFinite(refunded) &&
                amount >= 0 &&
                refunded >= 0
            ) {
                return sum + Math.max(0, amount - refunded);
            }

            return sum;
        }, 0);

        const revenueElement = document.getElementById("totalRevenue");

        if (revenueElement) {
            revenueElement.textContent = formatOrderCurrency(revenue);
        }

        ordersTableBody.replaceChildren();

        if (items.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 9;
            cell.className = "empty-state";
            cell.textContent = "No order items are assigned to your account.";
            row.appendChild(cell);
            ordersTableBody.appendChild(row);
            applyOrderFilters();
            return;
        }

        const paymentControlsRendered = new Set();

        items.forEach(item => {
            const orderId = Number(item.ORDER_ID ?? item.order_id);
            const itemId = Number(item.ITEM_ID ?? item.item_id);
            const row = document.createElement("tr");

            const itemStatus = String(item.ITEM_STATUS || "PENDING").toUpperCase();
            const paymentStatus = String(item.PAYMENT_STATUS || "UNKNOWN").toUpperCase();

            const orderDateValue = item.ORDER_TIME
                ? new Date(item.ORDER_TIME)
                : null;

            const orderDate = orderDateValue && !Number.isNaN(orderDateValue.getTime())
                ? `${orderDateValue.getFullYear()}-${String(orderDateValue.getMonth() + 1).padStart(2, "0")}-${String(orderDateValue.getDate()).padStart(2, "0")}`
                : "";

            row.dataset.search = [
                orderId,
                item.TOKEN_NO,
                item.CUSTOMER_NAME,
                item.PHONE,
                item.ITEM_NAME
            ].filter(value => value !== null && value !== undefined)
             .join(" ")
             .toLowerCase();

            row.dataset.itemStatus = itemStatus;
            row.dataset.paymentStatus = paymentStatus;
            row.dataset.orderDate = orderDate;

            row.appendChild(createOrderCell(orderId));
            row.appendChild(createOrderCell(item.TOKEN_NO));
            row.appendChild(createOrderCell(item.CUSTOMER_NAME));
            row.appendChild(createOrderCell(item.PHONE || "—"));
            row.appendChild(createOrderCell(formatOrderDate(item.ORDER_TIME)));
            row.appendChild(createOrderCell(item.ITEM_NAME));

            const quantity = Number(item.QUANTITY || 0);
            const unitPrice = Number(item.UNIT_PRICE || 0);

            row.appendChild(createOrderCell(
                `${quantity} × ${formatOrderCurrency(unitPrice)}`
            ));

            const paymentCell = document.createElement("td");

            const actualPaymentStatus = String(
                item.PAYMENT_STATUS || "UNKNOWN"
            ).toUpperCase();

            const paymentMethod = String(
                item.PAYMENT_METHOD || "—"
            ).toUpperCase();

            const paymentLabel = document.createElement("div");
            paymentLabel.textContent = `${paymentMethod} · ${actualPaymentStatus}`;
            paymentCell.appendChild(paymentLabel);

            const isPaymentAdmin =
                item.IS_PAYMENT_ADMIN === "Y" ||
                item.is_payment_admin === true ||
                item.isPaymentAdmin === true;

            if (isPaymentAdmin && !paymentControlsRendered.has(orderId)) {
                const amount = Number(item.TOTAL_AMOUNT || 0);
                const refunded = Number(item.REFUND_AMOUNT || 0);

                if (
                    ["PAID", "REFUNDED"].includes(actualPaymentStatus) &&
                    amount > refunded
                ) {
                    const refundButton = document.createElement("button");
                    refundButton.type = "button";
                    refundButton.className = "refund-payment-button";
                    refundButton.textContent = "Refund";

                    refundButton.addEventListener("click", async () => {
                        const remaining = amount - refunded;

                        const input = prompt(
                            `Enter refund amount (₹${remaining.toFixed(2)} remaining):`
                        );

                        if (input === null) return;

                        const refundAmount = Number(input);

                        if (
                            !Number.isFinite(refundAmount) ||
                            refundAmount <= 0 ||
                            Math.round(refundAmount * 100) !== refundAmount * 100 ||
                            refundAmount > remaining
                        ) {
                            alert("Enter a valid refund amount within the remaining balance.");
                            return;
                        }

                        if (!confirm(
                            `Confirm recording a refund of ₹${refundAmount.toFixed(2)} for Order #${orderId}?\n\nEnsure the money has actually been returned to the customer.`
                        )) {
                            return;
                        }

                        refundButton.disabled = true;

                        try {
                            const result = await fetchJSON(
                                `/api/admin/orders/${orderId}/payment/refund`,
                                {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        refund_amount: refundAmount
                                    })
                                }
                            );

                            showOrdersMessage(
                                result.message || "Refund recorded.",
                                "success"
                            );

                            await loadOrders();
                            await loadRefundHistory();
                        } catch (error) {
                            showOrdersMessage(error.message, "error");
                            refundButton.disabled = false;
                        }
                    });

                    paymentCell.appendChild(refundButton);
                }

                if (
                    paymentMethod === "CASH" &&
                    actualPaymentStatus === "PENDING" &&
                    String(item.ORDER_STATUS).toUpperCase() !== "CANCELLED"
                ) {
                    const paidButton = document.createElement("button");
                    paidButton.type = "button";
                    paidButton.className = "mark-paid-button";
                    paidButton.textContent = "Mark Paid";

                    paidButton.addEventListener("click", async () => {
                        if (!confirm(
                            `Confirm that cash payment for Order #${orderId} has been received?`
                        )) {
                            return;
                        }

                        paidButton.disabled = true;

                        try {
                            const result = await fetchJSON(
                                `/api/admin/orders/${orderId}/payment/paid`,
                                { method: "PATCH" }
                            );

                            showOrdersMessage(
                                result.message || "Payment marked as paid.",
                                "success"
                            );

                            await loadOrders();
                        } catch (error) {
                            showOrdersMessage(error.message, "error");
                            paidButton.disabled = false;
                        }
                    });

                    paymentCell.appendChild(paidButton);
                }

                paymentControlsRendered.add(orderId);
            }

            if (!isPaymentAdmin) {
                const note = document.createElement("small");
                note.textContent = "Payment managed by designated admin";
                paymentCell.appendChild(note);
            }

            row.appendChild(paymentCell);

            const statusCell = document.createElement("td");
            const statusSelect = createItemStatusSelect(itemStatus);

            const statusSaveButton = document.createElement("button");
            statusSaveButton.type = "button";
            statusSaveButton.className = "save-order-status";
            statusSaveButton.textContent = "Save";

            if (["COMPLETED", "CANCELLED"].includes(itemStatus)) {
                statusSelect.disabled = true;
                statusSaveButton.disabled = true;
            }

            statusSaveButton.addEventListener("click", async () => {
                const newStatus = statusSelect.value;

                if (newStatus === itemStatus) {
                    showOrdersMessage(
                        `Item in Order #${orderId} already has status ${newStatus}.`
                    );
                    return;
                }

                statusSelect.disabled = true;
                statusSaveButton.disabled = true;
                statusSaveButton.textContent = "Saving...";

                try {
                    const result = await fetchJSON(
                        `/api/admin/assigned-items/${orderId}/${itemId}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                item_status: newStatus
                            })
                        }
                    );

                    showOrdersMessage(
                        result.message || "Assigned item status updated.",
                        "success"
                    );

                    await loadOrders();
                } catch (error) {
                    showOrdersMessage(error.message, "error");
                    statusSelect.disabled = false;
                    statusSaveButton.disabled = false;
                    statusSaveButton.textContent = "Save";
                }
            });

            statusCell.append(statusSelect, statusSaveButton);
            row.appendChild(statusCell);
            ordersTableBody.appendChild(row);
        });

        applyOrderFilters();
    } catch (error) {
        ordersTableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 9;
        cell.className = "empty-state";
        cell.textContent = "Unable to load assigned items. Please refresh.";
        row.appendChild(cell);
        ordersTableBody.appendChild(row);

        showOrdersMessage(error.message, "error");
        console.error("Assigned order items loading error:", error);
    } finally {
        if (refreshOrdersButton) refreshOrdersButton.disabled = false;
    }
}

// ==========================================
// ORDER SEARCH AND FILTERS
// ==========================================

function applyOrderFilters() {
    if (!ordersTableBody) return;

    const searchTerm = (orderSearchInput?.value || "").trim().toLowerCase();
    const selectedItemStatus = orderStatusFilter?.value || "ALL";
    const selectedPaymentStatus = orderPaymentFilter?.value || "ALL";
    const selectedDate = orderDateFilter?.value || "";

    const rows = [
        ...ordersTableBody.querySelectorAll("tr[data-search]")
    ];

    let visibleCount = 0;

    rows.forEach(row => {
        const matchesSearch =
            !searchTerm || row.dataset.search.includes(searchTerm);

        const matchesItemStatus =
            selectedItemStatus === "ALL" ||
            row.dataset.itemStatus === selectedItemStatus;

        const matchesPaymentStatus =
            selectedPaymentStatus === "ALL" ||
            row.dataset.paymentStatus === selectedPaymentStatus;

        const matchesDate =
            !selectedDate || row.dataset.orderDate === selectedDate;

        const visible =
            matchesSearch &&
            matchesItemStatus &&
            matchesPaymentStatus &&
            matchesDate;

        row.hidden = !visible;

        if (visible) visibleCount++;
    });

    if (orderFilterCount) {
        orderFilterCount.textContent =
            `Showing ${visibleCount} of ${rows.length} assigned items`;
    }

    let emptyRow = ordersTableBody.querySelector("tr[data-filter-empty]");

    if (visibleCount === 0 && rows.length > 0) {
        if (!emptyRow) {
            emptyRow = document.createElement("tr");
            emptyRow.dataset.filterEmpty = "true";

            const cell = document.createElement("td");
            cell.colSpan = 9;
            cell.className = "empty-state";
            cell.textContent = "No assigned items match these filters.";

            emptyRow.appendChild(cell);
            ordersTableBody.appendChild(emptyRow);
        }

        emptyRow.hidden = false;
    } else if (emptyRow) {
        emptyRow.hidden = true;
    }
}

[
    orderSearchInput,
    orderStatusFilter,
    orderPaymentFilter,
    orderDateFilter
].forEach(control => {
    if (control) {
        control.addEventListener(
            control === orderSearchInput ? "input" : "change",
            applyOrderFilters
        );
    }
});

if (clearOrderFiltersButton) {
    clearOrderFiltersButton.addEventListener("click", () => {
        if (orderSearchInput) orderSearchInput.value = "";
        if (orderStatusFilter) orderStatusFilter.value = "ALL";
        if (orderPaymentFilter) orderPaymentFilter.value = "ALL";
        if (orderDateFilter) orderDateFilter.value = "";

        applyOrderFilters();
    });
}

if (refreshOrdersButton) {
    refreshOrdersButton.addEventListener("click", loadOrders);
}

// ==========================================
// REFUND HISTORY
// ==========================================

async function loadRefundHistory() {
    const tbody = document.getElementById("refundHistoryBody");

    if (!tbody) return;

    try {
        const response = await fetch("/api/admin/refund-history", {
            method: "GET",
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load refund history.");
        }

        if (!data.refunds || data.refunds.length === 0) {
            tbody.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No refund records found.";

            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        tbody.replaceChildren();

        data.refunds.forEach(refund => {
            const row = document.createElement("tr");

            const values = [
                refund.REFUND_ID,
                refund.ORDER_ID,
                refund.PAYMENT_ID,
                `₹${Number(refund.REFUND_AMOUNT).toFixed(2)}`,
                refund.REFUND_TIME
                    ? new Date(refund.REFUND_TIME).toLocaleString("en-IN")
                    : "—",
                refund.REFUND_NOTE || "—"
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value ?? "—");
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading refund history:", error);

        tbody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "Unable to load refund history.";

        row.appendChild(cell);
        tbody.appendChild(row);
    }
}

// ==========================================
// ADMIN LOGOUT
// ==========================================

const adminLogoutButton = document.getElementById("adminLogoutButton");

if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", async () => {
        const confirmed = confirm("Are you sure you want to log out?");
        if (!confirmed) return;

        adminLogoutButton.disabled = true;
        adminLogoutButton.textContent = "Logging out...";

        try {
            const csrfResponse = await fetch("/api/csrf-token", {
                credentials: "same-origin"
            });

            const csrfData = await csrfResponse.json();

            if (!csrfResponse.ok || !csrfData.success) {
                throw new Error("Unable to obtain CSRF token.");
            }

            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-Token": csrfData.csrfToken
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Logout failed.");
            }

            window.location.replace("/admin-login.html");
        } catch (error) {
            console.error("Logout error:", error);
            alert("Logout failed: " + error.message);

            adminLogoutButton.disabled = false;
            adminLogoutButton.textContent = "Logout";
        }
    });
}

// ==========================================
// INITIALIZE ADMIN DASHBOARD
// ==========================================

async function initializeDashboard() {
    await Promise.allSettled([
        loadCategories(),
        loadMenuItems(),
        loadOrders(),
        loadRefundHistory()
    ]);
}

initializeDashboard();



async function loadAdminGreeting() {
    const greeting = document.getElementById("adminGreeting");

    if (!greeting) return;

    try {
        const response = await fetch("/api/auth/current-user", {
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok || !data.success ||
            data.userType !== "admin" || !data.user) {
            greeting.textContent = "Welcome back, Admin 👋";
            return;
        }

        const admin = data.user;

        const name =
            admin.adminName ||
            admin.ADMIN_NAME ||
            admin.admin_name ||
            admin.username ||
            admin.USERNAME ||
            "Admin";

        const hour = new Date().getHours();

        const timeGreeting = hour < 12
            ? "Good morning"
            : hour < 17
                ? "Good afternoon"
                : "Good evening";

        greeting.textContent = `${timeGreeting}, ${name} 👋`;

    } catch (error) {
        console.error("Admin greeting error:", error);
        greeting.textContent = "Welcome back, Admin 👋";
    }
}

loadAdminGreeting();


