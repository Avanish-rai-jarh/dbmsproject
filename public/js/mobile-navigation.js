
(() => {
    "use strict";

    const toggle = document.getElementById("mobileMenuToggle");
    const nav = document.getElementById("mainNavLinks");

    if (!toggle || !nav) return;

    function closeMenu() {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation menu");
    }

    toggle.addEventListener("click", () => {
        const isOpening = !nav.classList.contains("is-open");

        nav.classList.toggle("is-open", isOpening);
        toggle.setAttribute("aria-expanded", String(isOpening));
        toggle.setAttribute(
            "aria-label",
            isOpening ? "Close navigation menu" : "Open navigation menu"
        );
    });

    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", event => {
        if (!nav.contains(event.target) && !toggle.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
})();
