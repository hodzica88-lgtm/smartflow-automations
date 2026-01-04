(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client");
  const targetSelector = script.getAttribute("data-target") || "#smartflow-form";
  const target = document.querySelector(targetSelector);

  if (!clientId) {
    console.error("SmartFlow ERROR: CLIENT_ID fehlt");
    return;
  }
  if (!target) {
    console.error("SmartFlow ERROR: Target nicht gefunden:", targetSelector);
    return;
  }

  // TEMP Flags (später aus Backend)
  const flags = { core: true };
  if (!flags.core) {
    target.innerHTML = `<p style="color:#fff;opacity:.75">SmartFlow ist aktuell nicht aktiv.</p>`;
    return;
  }

  target.innerHTML = `
    <form id="sf-form" class="sf-embed-form">
      <div class="sf-embed-head">
        <div class="sf-embed-title">Kurze Angaben</div>
        <div class="sf-embed-sub">Der Rest läuft automatisch.</div>
      </div>

      <label class="sf-embed-label">Name *</label>
      <input class="sf-embed-input" type="text" name="name" required />

      <label class="sf-embed-label">E-Mail *</label>
      <input class="sf-embed-input" type="email" name="email" required />

      <label class="sf-embed-label">Unternehmen *</label>
      <input class="sf-embed-input" type="text" name="company" required />

      <label class="sf-embed-label">Branche *</label>
      <input class="sf-embed-input" type="text" name="industry" placeholder="z. B. Praxis, Handwerk, Beratung" required />

      <label class="sf-embed-label">Telefon (optional)</label>
      <input class="sf-embed-input" type="tel" name="phone" placeholder="+49 …" />

      <label class="sf-embed-label">Website (optional)</label>
      <input class="sf-embed-input" type="url" name="website" placeholder="https://" />

      <label class="sf-embed-label">Kurzbeschreibung (optional)</label>
      <textarea class="sf-embed-textarea" name="message" rows="3" placeholder="Worum geht es bei Ihren Terminanfragen?"></textarea>

      <button id="sf-submit" class="sf-embed-btn" type="submit">Anfrage senden</button>

      <div class="sf-embed-hint">Kein Login · Keine Einrichtung · Standardisiert</div>
    </form>

    <style>
      .sf-embed-form{ display:block; }
      .sf-embed-head{ margin-bottom:12px; }
      .sf-embed-title{ font-weight:800; letter-spacing:.2px; }
      .sf-embed-sub{ margin-top:4px; color: rgba(255,255,255,.62); font-size: 13px; line-height:1.5; }

      .sf-embed-label{ display:block; margin-top:10px; margin-bottom:6px; color: rgba(255,255,255,.72); font-size: 13px; }
      .sf-embed-input, .sf-embed-textarea{
        width:100%;
        padding: 12px 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.04);
        color: rgba(255,255,255,.92);
        outline: none;
      }
      .sf-embed-input:focus, .sf-embed-textarea:focus{
        border-color: rgba(58,160,255,.45);
        box-shadow: 0 0 0 4px rgba(31,107,255,.18);
      }
      .sf-embed-textarea{ resize: vertical; min-height: 90px; }

      .sf-embed-btn{
        width:100%;
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.18);
        background: linear-gradient(135deg, rgba(31,107,255,.95), rgba(58,160,255,.85));
        color: #fff;
        font-weight: 800;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
        box-shadow: 0 18px 70px rgba(31,107,255,.18);
      }
      .sf-embed-btn:hover{ transform: translateY(-1px); box-shadow: 0 24px 90px rgba(31,107,255,.24); }
      .sf-embed-btn:disabled{ opacity:.65; cursor:not-allowed; transform:none; box-shadow:none; }

      .sf-embed-hint{
        margin-top: 10px;
        font-size: 12.5px;
        color: rgba(255,255,255,.56);
        text-align:center;
      }
    </style>
  `;

  const form = target.querySelector("#sf-form");
  const submitBtn = target.querySelector("#sf-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = "Wird gesendet…";

    const payload = {
      client_id: clientId,
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      industry: form.industry.value,
      phone: form.phone.value || "",
      website: form.website.value || "",
      message: form.message.value || "",
      source: "smartflow-start",
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch("https://hook.eu1.make.com/xgggr96x1b611gobwsapyp32anne3q69", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Webhook failed");

      form.innerHTML = `
        <div style="
          padding:14px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.9);
          line-height:1.6;
        ">
          ✅ Vielen Dank! Deine Anfrage wurde erfolgreich übermittelt.<br/>
          Du erhältst in Kürze eine automatische Bestätigung.
        </div>
      `;
    } catch (err) {
      console.error("SmartFlow Submit Error:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Erneut versuchen";
      alert("Fehler beim Senden. Bitte später erneut versuchen.");
    }
  });

})();
