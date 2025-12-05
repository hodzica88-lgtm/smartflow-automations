// COOKIE-BANNER.JS
// Einfaches DSGVO-konformes Banner ohne externe Cookies

document.addEventListener("DOMContentLoaded", () => {
    const banner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("cookie-accept");

    if (!banner || !acceptBtn) return;

    // Prüfen, ob bereits akzeptiert
    if (localStorage.getItem("cookieAccepted") === "true") {
        banner.classList.add("hidden");
        return;
    }

    // Banner anzeigen
    banner.classList.remove("hidden");

    // Klick auf "OK"
    acceptBtn.addEventListener("click", () => {
        localStorage.setItem("cookieAccepted", "true");
        banner.classList.add("hidden");
    });
});
