(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client");
  const targetSelector = script.getAttribute("data-target") || "#smartflow-form";
  const target = document.querySelector(targetSelector);

  if (!clientId || !target) return;

  target.innerHTML = `
    <form id="sf-form" class="sf-wide-form">

      <div class="sf-wide-group">
        <label>Name *</label>
        <input type="text" name="name" required />
      </div>

      <div class="sf-wide-group">
        <label>E-Mail *</label>
        <input type="email" name="email" required />
      </div>

      <div class="sf-wide-group">
        <label>Unternehmen *</label>
        <input type="text" name="company" required />
      </div>

      <div class="sf-wide-group">
        <label>Branche *</label>
        <input type="text" name="industry" placeholder="z. B. Praxis, Handwerk, Beratung" required />
      </div>

      <div class="sf-wide-group">
        <label>Telefon (optional)</label>
        <input type="tel" name="phone" />
      </div>

      <div class="sf-wide-group">
        <label>Website (optional)</label>
        <input type="url" name="website" placeholder="https://" />
      </div>

      <div class="sf-wide-group">
        <label>Kurzbeschreibung (optional)</label>
        <textarea name="message" rows="4"></textarea>
      </div>

      <button type="submit" class="sf-wide-submit">
        Anfrage senden
      </button>

      <p class="sf-wide-hint">
        Deine Angaben werden ausschließlich für die automatische Verarbeitung genutzt.
      </p>
    </form>

    <style>
      .sf-wide-form{
        width:100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 48px;
        border-radius: 26px;
        background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
        border: 1px solid rgba(255,255,255,.14);
        box-shadow: 0 40px 120px rgba(0,0,0,.55);
        backdrop-filter: blur(16px);
      }

      .sf-wide-group{
        margin-bottom: 22px;
      }

      .sf-wide-group label{
        display:block;
        margin-bottom: 8px;
        font-weight: 600;
        color: rgba(255,255,255,.85);
      }

      .sf-wide-group input,
      .sf-wide-group textarea{
        width:100%;
        padding: 16px 18px;
        font-size: 15px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.05);
        color: white;
      }

      .sf-wide-group input:focus,
      .sf-wide-group textarea:focus{
        outline:none;
        border-color: rgba(58,160,255,.6);
        box-shadow: 0 0 0 4px rgba(31,107,255,.2);
      }

      .sf-wide-submit{
        width:100%;
        margin-top: 10px;
        padding: 16px;
        font-size: 16px;
        font-weight: 700;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        background: linear-gradient(135deg, #1F6BFF, #3AA0FF);
        color: white;
        box-shadow: 0 24px 80px rgba(31,107,255,.3);
      }

      .sf-wide-submit:hover{
        transform: translateY(-1px);
      }

      .sf-wide-hint{
        margin-top: 16px;
        text-align: center;
        font-size: 13px;
        color: rgba(255,255,255,.6);
      }
    </style>
  `;

  const form = target.querySelector("#sf-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      client_id: clientId,
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      industry: form.industry.value,
      phone: form.phone.value || "",
      website: form.website.value || "",
      message: form.message.value || "",
      timestamp: new Date().toISOString()
    };

    await fetch("https://hook.eu1.make.com/xgggr96x1b611gobwsapyp32anne3q69", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    form.innerHTML = `
      <div style="
        padding:24px;
        border-radius:20px;
        background: rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.14);
        text-align:center;
        font-size:16px;
      ">
        ✅ Vielen Dank! Deine Anfrage wurde erfolgreich übermittelt.
      </div>
    `;
  });
})();
