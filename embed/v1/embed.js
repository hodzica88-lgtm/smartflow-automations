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

  console.log("SmartFlow Embed geladen für CLIENT_ID:", clientId);
})();
