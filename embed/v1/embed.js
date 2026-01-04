(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client");
  const targetSelector = script.getAttribute("data-target");

  const target = document.querySelector(targetSelector);
  if (!clientId || !target) return;

  target.innerHTML = `
    <form id="sf-form">
      <h2>SmartFlow starten</h2>
      <p class="muted">Ein paar Angaben – der Rest läuft automatisch.</p>

      <label>Name *</label>
      <input type="text" name="name" required />

      <label>E-Mail *</label>
      <input type="email" name="email" required />

      <label>Unternehmen *</label>
      <input type="text" name="company" required />

      <label>Branche *</label>
      <input type="text" name="industry" required />

      <label>Website (optional)</label>
      <input type="url" name="website" />

      <label>Kurzbeschreibung (optional)</label>
      <textarea name="message" rows="3"></textarea>

      <button type="submit">Anfrage senden</button>
      <p class="hint">Kein Login · Kein Setup · Standardisiert</p>
    </form>
  `;

  const form = document.getElementById("sf-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      client_id: clientId,
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      industry: form.industry.value,
      website: form.website.value || "",
      message: form.message.value || "",
      timestamp: new Date().toISOString()
    };

    await fetch(
      "https://hook.eu1.make.com/xgggr96x1b611gobwsapyp32anne3q69",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    form.innerHTML = `<p>✅ Anfrage erfolgreich gesendet.</p>`;
  });
})();
