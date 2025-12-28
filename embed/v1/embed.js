(function () {
  const script = document.currentScript;

  if (!script) {
    console.error("SmartFlow: Script nicht gefunden");
    return;
  }

  const clientId = script.getAttribute("data-client");

  if (!clientId) {
    console.error("SmartFlow: Keine CLIENT_ID gesetzt");
    return;
  }

  // TEMP: Simulierte Modul-Flags (kommen später aus Backend)
  const flags = {
    core: true,
    whatsapp: false,
    reviews: false,
    reporting: false,
    branchenpaket: false
  };

  console.log("SmartFlow CLIENT_ID:", clientId);
  console.log("SmartFlow FLAGS:", flags);
})();
