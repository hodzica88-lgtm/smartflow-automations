import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PublicSiteHelp from "./PublicSiteHelp";

describe("PublicSiteHelp UX", () => {
  it("uses the localized titles without mixed-language labels", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Varnito Hilfe");
    expect(deMarkup).not.toContain("Varnito Help");
    expect(deMarkup).not.toContain("Website help");

    expect(usMarkup).toContain("Varnito Help");
    expect(usMarkup).not.toContain("Website-Hilfe");
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

  it("renders the localized quick-navigation labels without stale href assumptions", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Anmelden");
    expect(deMarkup).toContain("Varnito testen");
    expect(deMarkup).toContain("Demo ansehen");

    expect(usMarkup).toContain("Sign in");
    expect(usMarkup).toContain("Try Varnito");
    expect(usMarkup).toContain("View demo");
  });

  it("keeps the support and problem-report actions visible in both localized menus", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Problem melden");
    expect(deMarkup).toContain("Support");

    expect(usMarkup).toContain("Report a problem");
    expect(usMarkup).toContain("Support");
  });

  it("keeps the help prompt localized for natural-language input", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Wie kann ich helfen?");
    expect(deMarkup).toContain("Wie kann ich Ihnen helfen?");
    expect(usMarkup).toContain("How can I help?");
  });
});
