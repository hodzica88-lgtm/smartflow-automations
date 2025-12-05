// SCROLL-ANIMATIONS.JS
// Aktiviert das sanfte Einblenden der Elemente

document.addEventListener("DOMContentLoaded", () => {
    const fadeElements = document.querySelectorAll(".fade-in");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    fadeElements.forEach(el => observer.observe(el));
});
