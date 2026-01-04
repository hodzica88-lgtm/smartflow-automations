(function () {
  "use strict";

  /* ======================================================
     SmartFlow Embed v1 – Kundenformular (Launch)
     ====================================================== */

  /* ---------- 1) Script & Target ---------- */
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

  /* ---------- 2) TEMP Flags ---------- */
  const flags = {
    core: true
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
        <label>Ihr Name *</label>
        <input type="text" name="name" required />
      </div>

      <div class="sf-field">
        <label>E-Mail *</label>
        <input type="email" name="email" required />
      </div>

      <div class="sf-field">
        <label>Unternehmen / Praxis *</label>
        <input type="text" name="company" required />
      </div>

      <div class="sf-field">
        <label>Telefonnummer (optional)</label>
        <input type="tel" name="phone" />
      </div>

      <div class="sf-field">
        <label>Branche *</label>
        <select name="industry" required>
          <option value="">Bitte auswählen</option>
          <option>Handwerk</option>
          <option>Gesundheit / Praxis</option>
          <option>Gastronomie</option>
          <option>Coaching / Beratung</option>
          <option>Beauty / Kosmetik</option>
          <option>Immobilien</option>
          <option>Sonstiges</option>
        </select>
      </div>

      <div class="sf-field">
        <label>Website (optional)</label>
        <input type="url" name="website" placeholder="https://"/>
      </div>

      <div class="sf-field">
        <label>Kurzbeschreibung / Anliegen</label>
        <textarea name="message" rows="3"
          placeholder="Worum geht es bei Ihren Terminanfragen?"></textarea>
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
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      phone: form.phone.value || "",
      industry: form.industry.value,
      website: form.website.value || "",
      message: form.message.value || "",
      source: "smartflow-website",
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(
        "https://hook.eu1.make.com/xgggr96x1b611gobwsapyp32anne3q69",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error("Webhook Error");

      form.innerHTML = `
        <p class="sf-success">
          ✅ Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt.<br>
          Sie erhalten in Kürze eine automatische Bestätigung.
        </p>
      `;
    } catch (err) {
      console.error("SmartFlow Submit Error:", err);
      submitBtn.disabled = false;
      submitBtn.innerText = "Erneut versuchen";
      alert("Beim Senden ist ein Fehler aufgetreten. Bitte später erneut versuchen.");
    }
  });

})();
