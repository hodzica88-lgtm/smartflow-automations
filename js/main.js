// MAIN.JS
// Kleine UI-Funktionen und Platzhalter für spätere Logiken

console.log("SmartFlow Automations – main.js geladen");

// Navigation kompakt machen beim Scrollen
window.addEventListener("scroll", () => {
    const header = document.querySelector(".header");
    if (!header) return;

    if (window.scrollY > 40) {
        header.classList.add("compact");
    } else {
        header.classList.remove("compact");
    }
});
