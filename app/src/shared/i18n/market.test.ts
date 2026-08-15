import { describe, expect, it } from "vitest";

import {
  getMarketConfig,
  normalizeHostForMarket,
  resolveMarketFromHost,
} from "@/shared/i18n/market";

describe("market resolution", () => {
  it("resolves germany market for varnito.de", () => {
    expect(resolveMarketFromHost("varnito.de")).toBe("de");
    expect(resolveMarketFromHost("www.varnito.de")).toBe("de");
    expect(getMarketConfig("de").currency).toBe("eur");
  });

  it("resolves us market for varnito.com", () => {
    expect(resolveMarketFromHost("varnito.com")).toBe("us");
    expect(resolveMarketFromHost("www.varnito.com:443")).toBe("us");
    expect(resolveMarketFromHost("varnito.com, 127.0.0.1:3000")).toBe("us");
    expect(resolveMarketFromHost("host=varnito.com")).toBe("us");
    expect(getMarketConfig("us").currency).toBe("usd");
    expect(getMarketConfig("us").siteUrl).toBe("https://varnito.com");
    expect(getMarketConfig("us").legalContactEmail).toBe("support@varnito.com");
  });

  it("defaults localhost and unknown hosts to germany market", () => {
    expect(resolveMarketFromHost("localhost:3000")).toBe("de");
    expect(resolveMarketFromHost("127.0.0.1")).toBe("de");
    expect(resolveMarketFromHost("unknown-host"))?.toBe("de");
  });

  it("normalizes proxy host values consistently", () => {
    expect(normalizeHostForMarket("varnito.com:443, 10.0.0.2:3000")).toBe("varnito.com");
    expect(normalizeHostForMarket("host=varnito.de")).toBe("varnito.de");
    expect(normalizeHostForMarket("https://varnito.com")).toBe("varnito.com");
  });
});
