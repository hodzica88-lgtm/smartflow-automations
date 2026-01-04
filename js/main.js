(() => {
  // --- Smooth scroll for internal anchors ---
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href === "#") return;

    const el = document.querySelector(href);
    if (!el) return;

    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  });

  // --- Cookie banner (technically necessary cookies only) ---
  const banner = document.getElementById("cookie-banner");
  const accept = document.getElementById("cookie-accept");
  const COOKIE_KEY = "sf_cookie_ok";

  try {
    const ok = localStorage.getItem(COOKIE_KEY);
    if (!ok && banner) banner.classList.remove("hidden");
  } catch (_) {
    if (banner) banner.classList.remove("hidden");
  }

  if (accept) {
    accept.addEventListener("click", () => {
      try { localStorage.setItem(COOKIE_KEY, "1"); } catch (_) {}
      banner?.classList.add("hidden");
    });
  }

  // --- i18n (DE/EN) ---
  const dict = {
    de: {
      nav_how: "So funktioniert’s",
      nav_features: "Funktionen",
      nav_demo: "Testen",
      cta_top: "Demo starten",
      pill: "Für lokale Unternehmen",
      h1: "Automatisierte Terminprozesse – ruhig, zuverlässig, 24/7",
      lead: "SmartFlow übernimmt Anfragen, Terminabstimmungen und Erinnerungen automatisch. Ohne Login. Ohne Setup. Ohne laufenden Aufwand.",
      cta_primary: "Kostenlos testen",
      cta_secondary: "Kurz erklärt",
      trust_1: "✓ Natürlich wirkender Ablauf",
      trust_2: "✓ Standardisiert & skalierbar",
      trust_3: "✓ DSGVO-Basis integriert",
      panel_title: "Beispiel-Ablauf",
      chat_in_1: "Hi, ich hätte gern einen Termin.",
      chat_out_1: "Gern. Welche Uhrzeit passt dir? Ich kann dir Optionen vorschlagen.",
      chat_in_2: "Morgen Nachmittag wäre gut.",
      chat_out_2: "Perfekt. Ich habe 15:30 oder 16:15 frei. Was passt?",
      panel_note: "Kunden erleben einen einfachen, natürlichen Flow – ohne “Druck”, ohne unnötige Schritte.",
      how_h2: "So funktioniert SmartFlow",
      how_lead: "Ein standardisierter Ablauf – für alle Kunden gleich. Einfach, wartbar, skalierbar.",
      step_1_title: "Anfrage kommt rein",
      step_1_text: "Über Website-Formular oder Messenger – Anfragen gehen nicht mehr verloren.",
      step_2_title: "Automatische Antwort",
      step_2_text: "SmartFlow antwortet sofort, stellt Rückfragen und führt durch den Prozess.",
      step_3_title: "Bestätigung & Erinnerung",
      step_3_text: "Termin wird bestätigt und Erinnerungen reduzieren No-Shows automatisch.",
      features_h2: "Funktionen",
      features_lead: "Fokus auf das Wesentliche: Anfragen, Terminprozesse, Follow-ups – zuverlässig automatisiert.",
      f1_title: "24/7 automatische Antworten",
      f1_text: "Sofortige Reaktion – auch abends, nachts und am Wochenende.",
      f2_title: "Automatische Terminabstimmung",
      f2_text: "Klare Vorschläge, strukturierter Ablauf, weniger Hin- und Her.",
      f3_title: "Erinnerungen & Follow-ups",
      f3_text: "Weniger No-Shows, mehr wahrgenommene Termine.",
      f4_title: "Standardisiert & skalierbar",
      f4_text: "Kein Sonderbau pro Kunde – ein System, saubere Wartung.",
      f5_title: "Mehrsprachig",
      f5_text: "Deutsch/Englisch vorbereitet – auf Knopfdruck.",
      f6_title: "DSGVO-Basis",
      f6_text: "Rechtliche Grundstruktur integriert (Impressum/Datenschutz/AGB).",
      demo_h2: "Kostenlos testen",
      demo_lead: "Trage dich ein und erlebe den Ablauf. Es ist bewusst leicht – ohne Druck, ohne komplizierte Schritte.",
      loading: "Lade Formular…",
      loading_hint: "Falls hier nichts erscheint: bitte kurz neu laden (Inkognito) oder später erneut versuchen.",
      privacy_hint: "Mit dem Absenden akzeptierst du unsere Datenschutzerklärung.",
      footer_privacy: "Datenschutz",
      footer_imprint: "Impressum",
      footer_terms: "AGB",
      cookie_text: "Wir verwenden ausschließlich technisch notwendige Cookies. Weitere Informationen findest du in der Datenschutzerklärung.",
      cookie_ok: "OK",
    },
    en: {
      nav_how: "How it works",
      nav_features: "Features",
      nav_demo: "Try it",
      cta_top: "Start demo",
      pill: "For local businesses",
      h1: "Automated appointment flows — calm, reliable, 24/7",
      lead: "SmartFlow automates inquiries, scheduling steps and reminders. No login. No setup. No ongoing effort.",
      cta_primary: "Try for free",
      cta_secondary: "Quick overview",
      trust_1: "✓ Natural user flow",
      trust_2: "✓ Standardized & scalable",
      trust_3: "✓ GDPR-ready base",
      panel_title: "Example flow",
      chat_in_1: "Hi, I’d like to book an appointment.",
      chat_out_1: "Sure. What time works for you? I can suggest available options.",
      chat_in_2: "Tomorrow afternoon would be good.",
      chat_out_2: "Great. I have 3:30 PM or 4:15 PM available — which works?",
      panel_note: "Customers experience a simple, natural flow — without pressure or unnecessary steps.",
      how_h2: "How SmartFlow works",
      how_lead: "One standardized flow for everyone. Simple, maintainable, scalable.",
      step_1_title: "Inquiry comes in",
      step_1_text: "Via website form or messenger — no more missed inquiries.",
      step_2_title: "Automatic response",
      step_2_text: "SmartFlow replies instantly, asks the right questions and guides the flow.",
      step_3_title: "Confirmation & reminders",
      step_3_text: "Appointments are confirmed and reminders reduce no-shows automatically.",
      features_h2: "Features",
      features_lead: "Focus on essentials: inquiries, scheduling flows, follow-ups — reliably automated.",
      f1_title: "24/7 auto replies",
      f1_text: "Instant responses — evenings, nights, weekends.",
      f2_title: "Automated scheduling flow",
      f2_text: "Clear suggestions, structured flow, less back-and-forth.",
      f3_title: "Reminders & follow-ups",
      f3_text: "Fewer no-shows, more attended appointments.",
      f4_title: "Standardized & scalable",
      f4_text: "No custom builds per client — one system, clean maintenance.",
      f5_title: "Multilingual",
      f5_text: "German/English ready — one click.",
      f6_title: "GDPR-ready base",
      f6_text: "Legal base included (imprint/privacy/terms).",
      demo_h2: "Try it for free",
      demo_lead: "Submit your details and experience the flow. Designed to feel natural — no pressure, no complexity.",
      loading: "Loading form…",
      loading_hint: "If nothing shows up, refresh (incognito) or try again later.",
      privacy_hint: "By submitting you accept our privacy policy.",
      footer_privacy: "Privacy",
      footer_imprint: "Imprint",
      footer_terms: "Terms",
      cookie_text: "We only use strictly necessary cookies to run this website. See our privacy policy for details.",
      cookie_ok: "OK",
    }
  };

  function setLang(lang) {
    const use = dict[lang] ? lang : "de";
    document.documentElement.lang = use;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = dict[use][key];
      if (!val) return;

      // If element contains a link, keep the link and replace only text around it when possible
      if (el.querySelector("a")) {
        // For cookie/privacy lines we keep links; just set textContent if no link
        // Here we do a safe fallback: set first text node only if exists, else set textContent.
        try {
          // If the element is the cookie paragraph with an <a>, we rebuild with the existing link.
          if (key === "cookie_text") {
            const a = el.querySelector("a");
            const href = a?.getAttribute("href") || "privacy.html";
            el.innerHTML = `${val} <a class="link" href="${href}">${use === "de" ? "Datenschutzerklärung" : "Privacy policy"}</a>.`;
          } else if (key === "privacy_hint") {
            const a = el.querySelector("a") || null;
            if (a) {
              const href = a.getAttribute("href") || "privacy.html";
              el.innerHTML = `${val} <a class="link" href="${href}">${use === "de" ? "Datenschutzerklärung" : "privacy policy"}</a>.`;
            } else {
              el.textContent = val;
            }
          } else {
            el.textContent = val;
          }
        } catch {
          el.textContent = val;
        }
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll(".lang__btn").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-lang") === use);
    });

    try { localStorage.setItem("sf_lang", use); } catch (_) {}
  }

  // init language
  let initial = "de";
  try {
    initial = localStorage.getItem("sf_lang") || "de";
  } catch (_) {}
  setLang(initial);

  document.querySelectorAll(".lang__btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang")));
  });

})();
