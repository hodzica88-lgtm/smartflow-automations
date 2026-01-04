(function () {
  "use strict";

  /* ======================================================
     SmartFlow Embed v1 – FINAL (Launch / Free-Make Version)
     ====================================================== */

  /* ---------- 1) Script & Attribute ---------- */
  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client");
  const targetSelector = script.getAttribute("data-target") || "#smartflow-form";

  if (!clientId) {
    console.error("SmartFlow ERROR: CLIENT_ID fehlt");
    return;
  }

  const target = document.querySelector(targetSelector);
  if (!target) {
    console.error("SmartFlow ERROR: Target nicht gefunden:", targetSelector);
    return;
  }

  /* ---------- 2) TEMP Flags (Backend folgt später) ---------- */
  const flags = {
    core: true,
    whatsapp: false,
    reviews: false,
    reporting: false,
    branchenpaket: false
  };

  console.log("SmartFlow CLIENT_ID:", clientId);
  console.log("SmartFlow FLAGS:", flags);

  if (!flags.core) {
    target.innerHTML = "<p>SmartFlow ist für diesen Kunden nicht aktiv.</p>";
    return;
  }

  /* ---------- 3) Formular rendern ---------- */
  target.innerHTML = `
    <form id="sf-form" class="sf-form">
      <div class="sf-field">
        <label>Name</label>
        <input type="text" name="name" required />
      </div>

      <div class="sf-field">
        <label>E-Mail</label>
        <input type="email" name="email" required />
      </div>

      <button type="submit" class="sf-submit">
        Anfrage senden
      </button>

      <p class="sf-hint">
        Keine Einrichtung · Kein Login · Vollautomatischer Ablauf
      </p>
    </form>
  `;

  /* ---------- 4) Submit → Make Webhook ---------- */
  const form = document.getElementById("sf-form");
  const submitBtn = form.querySelector(".sf-submit");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Wird gesendet…";

    const payload = {
      client_id: clientId,
      name: form.querySelector('input[name="name"]').value,
      email: form.querySelector('input[name="email"]').value,
      source: "smartflow-embed",
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(
        "https://hook.eu1.make.com/xgggr96x1b611gobwsapyp32anne3q69",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error("Webhook Error");

      form.innerHTML = `
        <p class="sf-success">
          ✅ Vielen Dank! Deine Anfrage wurde erfolgreich übermittelt.
        </p>
      `;
    } catch (error) {
      console.error("SmartFlow Submit Error:", error);
      submitBtn.disabled = false;
      submitBtn.innerText = "Erneut versuchen";
      alert("Beim Senden ist ein Fehler aufgetreten. Bitte später erneut versuchen.");
    }
  });

})();
