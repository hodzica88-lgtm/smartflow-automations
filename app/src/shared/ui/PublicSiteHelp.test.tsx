import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PublicSiteHelp from "./PublicSiteHelp";

describe("PublicSiteHelp UX", () => {
  it("uses the localized titles without mixed-language labels", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Varnito Hilfe");
    expect(deMarkup).not.toContain("Website-Hilfe");
    expect(deMarkup).not.toContain("Varnito Help");

    expect(usMarkup).toContain("Varnito Help");
    expect(usMarkup).not.toContain("Website help");
    expect(usMarkup).not.toContain("Varnito Hilfe");
  });

  it("starts empty and uses the localized placeholders", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    const deTextarea = deMarkup.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)?.[1] ?? "";
    const usTextarea = usMarkup.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)?.[1] ?? "";

    expect(deTextarea).toBe("");
    expect(usTextarea).toBe("");
    expect(deMarkup).toContain("placeholder=\"Wie kann ich Ihnen helfen?\"");
    expect(usMarkup).toContain("placeholder=\"How can I help?\"");
  });

  it("shows the expected quick actions in both markets", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Anmelden");
    expect(deMarkup).toContain("Varnito testen");
    expect(deMarkup).toContain("Demo ansehen");
    expect(deMarkup).toContain("Problem melden");
    expect(deMarkup).toContain("Support");

    expect(usMarkup).toContain("Sign in");
    expect(usMarkup).toContain("Try Varnito");
    expect(usMarkup).toContain("View demo");
    expect(usMarkup).toContain("Report a problem");
    expect(usMarkup).toContain("Support");
  });

  it("preserves the public routes for quick navigation", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain('href="/login"');
    expect(deMarkup).toContain('href="/registrierung"');
    expect(deMarkup).toContain('href="/demo"');

    expect(usMarkup).toContain('href="/login"');
    expect(usMarkup).toContain('href="/registrierung"');
    expect(usMarkup).toContain('href="/demo"');
  });

  it("keeps the mailto support and problem-report actions available", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("mailto:support@varnito.com");
    expect(deMarkup).toContain("Varnito%20%E2%80%93%20Problem%20melden");

    expect(usMarkup).toContain("mailto:support@varnito.com");
    expect(usMarkup).toContain("Varnito%20%E2%80%93%20Report%20a%20problem");
  });

  it("keeps typed natural-language questions working as before", () => {
    const result = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);

    expect(result).toContain("Fragen Sie nach Preisen, Registrierung, Demo, rechtlichen Seiten...");
    expect(result).toContain("Wie kann ich Ihnen helfen?");
  });
});
