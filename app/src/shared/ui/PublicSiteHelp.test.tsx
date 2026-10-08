import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PublicSiteHelp from "./PublicSiteHelp";

describe("PublicSiteHelp UX", () => {
  it("leaves demo pages to their own guide", () => {
    for (const path of ["/demo", "/demo/dashboard", "/demo/leads", "/demo/billing"]) {
      expect(renderToStaticMarkup(<PublicSiteHelp market="us" path={path} />)).toBe("");
    }
  });
  it("uses the localized titles without mixed-language labels", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Varnito Hilfe");
    expect(deMarkup).not.toContain(">Website-Hilfe<");
    expect(deMarkup).not.toContain("Varnito Help");

    expect(usMarkup).toContain("Varnito Help");
    expect(usMarkup).not.toContain(">Website help<");
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

  it("keeps typed natural-language questions working as before", () => {
    const result = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);

    expect(result).toContain("Wie kann ich helfen? Fragen Sie einfach, wo Sie etwas finden oder was Sie tun möchten.");
    expect(result).toContain("Wie kann ich Ihnen helfen?");
  });
});
