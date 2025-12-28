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

  // TEMP: Simulierter Flag-Wert (kommt später aus Backend)
  const flags = {
    core: true
  };

  console.log("SmartFlow CLIENT_ID:", clientId);
  console.log("SmartFlow CORE aktiv:", flags.core);
})();
