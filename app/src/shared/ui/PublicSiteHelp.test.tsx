import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PublicSiteHelp from "./PublicSiteHelp";

describe("PublicSiteHelp UX", () => {
  it("starts closed and keeps localized launcher copy visible", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain('aria-expanded="false"');
    expect(deMarkup).toContain("Website-Hilfe öffnen");
    expect(deMarkup).toContain("Hilfe");
    expect(deMarkup).not.toContain("Varnito Hilfe");
    expect(deMarkup).not.toContain("Wie kann ich helfen?");

    expect(usMarkup).toContain('aria-expanded="false"');
    expect(usMarkup).toContain("Open website help");
    expect(usMarkup).toContain("Help");
    expect(usMarkup).not.toContain("Varnito Help");
    expect(usMarkup).not.toContain("How can I help?");
  });

  it("keeps the localized help-rail labels available without stale panel assumptions", () => {
    const deMarkup = renderToStaticMarkup(<PublicSiteHelp market="de" path="/" />);
    const usMarkup = renderToStaticMarkup(<PublicSiteHelp market="us" path="/" />);

    expect(deMarkup).toContain("Website-Hilfe öffnen");
    expect(deMarkup).toContain("Hilfe");
    expect(deMarkup).not.toContain("Varnito Hilfe");

    expect(usMarkup).toContain("Open website help");
    expect(usMarkup).toContain("Help");
    expect(usMarkup).not.toContain("Varnito Help");
  });
});
