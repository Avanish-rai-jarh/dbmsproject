// ==========================================
// CAMPUSBITE CFO FINANCIAL REPORT
// Plain JavaScript — no React required
// ==========================================

(() => {
    "use strict";

    const report = document.getElementById("cfoReport");

    if (!report) return;

    const getElement = id => document.getElementById(id);

    let selectedPeriod = "monthly";
    let lastTrend = [];
    let cfoChartPoints = [];
    let cfoTooltip = null;

    const formatMoney = value => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    };

    // ==========================================
    // LOAD REPORT FROM EXPRESS / ORACLE
    // ==========================================

    async function loadCfoReport() {
        const status = getElement("cfoReportStatus");
        const refreshButton = getElement("cfoRefreshButton");

        refreshButton.disabled = true;
        status.textContent = "Loading financial report...";

        try {
            const response = await fetch(
                `/api/admin/revenue-analytics?period=${encodeURIComponent(selectedPeriod)}`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load financial report."
                );
            }

            const summary = data.summary || {};

            getElement("cfoNetRevenue").textContent =
                formatMoney(summary.netRevenue);

            getElement("cfoGrossPaid").textContent =
                formatMoney(summary.grossPaid);

            getElement("cfoRefunds").textContent =
                formatMoney(summary.totalRefunds);

            getElement("cfoDateRange").textContent =
                data.rangeLabel || "Selected reporting period";

            lastTrend = Array.isArray(data.trend)
                ? data.trend
                : [];

            drawRevenueChart(lastTrend);

            status.textContent =
                "Updated " + new Date().toLocaleString("en-IN");

        } catch (error) {
            console.error("CFO report error:", error);

            status.textContent =
                error.message || "Unable to load financial report.";

            clearRevenueChart();

            const emptyMessage = getElement("cfoChartEmpty");
            emptyMessage.hidden = false;
            emptyMessage.textContent =
                "Financial data could not be loaded.";

        } finally {
            refreshButton.disabled = false;
        }
    }

    // ==========================================
    // DRAW CHART USING HTML CANVAS
    // ==========================================

    function clearRevenueChart() {
        const canvas = getElement("cfoRevenueChart");
        const context = canvas.getContext("2d");

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    function drawRevenueChart(rows) {
        const canvas = getElement("cfoRevenueChart");
        const emptyMessage = getElement("cfoChartEmpty");

        const validRows = rows.filter(row =>
            Number.isFinite(Number(row.NET_REVENUE))
        );

        if (validRows.length === 0) {
            clearRevenueChart();

            emptyMessage.hidden = false;
            emptyMessage.textContent =
                "No paid transactions found for this period.";
            cfoChartPoints = [];

            if (cfoTooltip) {
                cfoTooltip.style.display = "none";
            }

            return;
        }

        emptyMessage.hidden = true;

        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(320, canvas.clientWidth || 700);
        const height = 280;

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        const context = canvas.getContext("2d");

        context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        const styles = getComputedStyle(report);

        const textColor =
            styles.getPropertyValue("--cfo-text").trim() || "#26342a";

        const mutedColor =
            styles.getPropertyValue("--cfo-muted").trim() || "#758075";

        const lineColor =
            styles.getPropertyValue("--cfo-green").trim() || "#2e6b45";

        const gridColor =
            styles.getPropertyValue("--cfo-grid").trim() || "#e6ebe3";

        context.clearRect(0, 0, width, height);

        const padding = {
            top: 20,
            right: 18,
            bottom: 48,
            left: 68
        };

        const chartWidth =
            width - padding.left - padding.right;

        const chartHeight =
            height - padding.top - padding.bottom;

        const values = validRows.map(row =>
            Math.max(0, Number(row.NET_REVENUE) || 0)
        );

        const maxValue = Math.max(1, ...values);
        const yMaximum = maxValue * 1.15;

        // Horizontal grid and Y-axis labels.
        context.font = "11px sans-serif";
        context.textAlign = "right";
        context.textBaseline = "middle";

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + chartHeight * i / 4;

            const value = yMaximum * (1 - i / 4);

            context.strokeStyle = gridColor;
            context.lineWidth = 1;

            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(width - padding.right, y);
            context.stroke();

            context.fillStyle = mutedColor;

            const axisLabel = value >= 1000
                ? "₹" + (value / 1000).toFixed(1) + "k"
                : "₹" + Math.round(value);

            context.fillText(
                axisLabel,
                padding.left - 9,
                y
            );
        }

        // Convert data points into chart coordinates.
        const points = values.map((value, index) => {
            const x = padding.left +
                (
                    values.length === 1
                        ? chartWidth / 2
                        : chartWidth * index / (values.length - 1)
                );

            const y = padding.top +
                chartHeight * (1 - value / yMaximum);

            return { x, y };
        });

        // Save each plotted point and its corresponding data row for hover.
        cfoChartPoints = points.map((point, index) => ({
            x: point.x,
            y: point.y,
            row: validRows[index]
        }));

        // Draw the revenue line.
        if (points.length > 1) {
            context.strokeStyle = lineColor;
            context.lineWidth = 2.5;
            context.lineJoin = "round";

            context.beginPath();

            points.forEach((point, index) => {
                if (index === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });

            context.stroke();
        }

        // Draw points.
        points.forEach(point => {
            context.fillStyle = lineColor;

            context.beginPath();
            context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
            context.fill();
        });

        // Avoid overlapping X-axis labels.
        const labelStep = Math.max(
            1,
            Math.ceil(validRows.length / 7)
        );

        context.fillStyle = mutedColor;
        context.textAlign = "center";
        context.textBaseline = "top";

        validRows.forEach((row, index) => {
            const isLast = index === validRows.length - 1;

            if (index % labelStep !== 0 && !isLast) return;

            context.fillText(
                String(row.LABEL || ""),
                points[index].x,
                padding.top + chartHeight + 12,
                60
            );
        });

        context.fillStyle = textColor;
    }


    // ==========================================
    // INTERACTIVE GRAPH TOOLTIP
    // ==========================================

    function initializeCfoTooltip() {
        const wrapper = document.querySelector(
            "#cfoReport .cfo-chart-wrap"
        );

        const canvas = getElement("cfoRevenueChart");

        if (!wrapper || !canvas || canvas.dataset.hoverReady) {
            return;
        }

        canvas.dataset.hoverReady = "true";

        cfoTooltip = document.createElement("div");
        cfoTooltip.className = "cfo-hover-tooltip";
        cfoTooltip.setAttribute("role", "status");

        wrapper.appendChild(cfoTooltip);

        canvas.addEventListener("mousemove", event => {
            if (!cfoChartPoints.length) return;

            const rect = canvas.getBoundingClientRect();

            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            let nearestPoint = null;
            let nearestDistance = Infinity;

            cfoChartPoints.forEach(point => {
                const dx = mouseX - point.x;
                const dy = mouseY - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPoint = point;
                }
            });

            // Show the tooltip when the cursor is close to a data point.
            if (!nearestPoint || nearestDistance > 18) {
                cfoTooltip.style.display = "none";
                return;
            }

            const row = nearestPoint.row;

            const date = document.createElement("strong");
            date.textContent = row.LABEL || row.PERIOD_KEY || "Date";

            const revenue = document.createElement("div");
            revenue.textContent =
                "Net revenue: " + formatMoney(row.NET_REVENUE);

            cfoTooltip.replaceChildren(date, revenue);
            cfoTooltip.style.display = "block";

            // Position the tooltip without letting it overflow the chart.
            const maxLeft = Math.max(
                0,
                wrapper.clientWidth - cfoTooltip.offsetWidth - 8
            );

            cfoTooltip.style.left =
                Math.min(maxLeft, Math.max(0, nearestPoint.x + 12)) + "px";

            cfoTooltip.style.top =
                Math.max(0, nearestPoint.y - 12) + "px";
        });

        canvas.addEventListener("mouseleave", () => {
            if (cfoTooltip) {
                cfoTooltip.style.display = "none";
            }
        });
    }

    initializeCfoTooltip();


    // ==========================================
    // DAILY / MONTHLY / YEARLY CONTROLS
    // ==========================================

    report.querySelectorAll("[data-period]").forEach(button => {
        button.addEventListener("click", () => {
            selectedPeriod = button.dataset.period;

            report.querySelectorAll("[data-period]").forEach(item => {
                const active = item === button;

                item.classList.toggle("is-active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            loadCfoReport();
        });
    });


    // ==========================================
    // REFRESH BUTTON
    // ==========================================

    getElement("cfoRefreshButton").addEventListener(
        "click",
        loadCfoReport
    );

    // ==========================================
    // LIGHT / DARK THEME TOGGLE
    // ==========================================

    const themeButton = getElement("cfoThemeToggle");

    themeButton.addEventListener("click", () => {
        const isDark = report.classList.toggle("cfo-dark");

        themeButton.setAttribute(
            "aria-pressed",
            String(isDark)
        );

        themeButton.textContent = isDark
            ? "☀ Light mode"
            : "☾ Dark mode";

        drawRevenueChart(lastTrend);
    });

    // Redraw chart on window resize.
    let resizeTimer;

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            drawRevenueChart(lastTrend);
        }, 120);
    });


    // ==========================================
    // INITIALIZE THE SEPARATE CFO REPORT PAGE
    // ==========================================

    selectedPeriod = "monthly";

    report.querySelectorAll("[data-period]").forEach(button => {
        const active = button.dataset.period === selectedPeriod;

        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    loadCfoReport();

})();