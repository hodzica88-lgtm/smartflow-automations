import { describe, expect, it } from "vitest";

import {
  INTERNAL_OWNER_COMPANY_ID,
  filterExternalBusinessCompany,
  filterExternalBusinessNotification,
  isInternalOwnerCompany,
} from "@/features/operator/internal-company";

describe("internal owner business filtering", () => {
  it("recognizes the exact internal owner company id", () => {
    expect(INTERNAL_OWNER_COMPANY_ID).toBe("25acf959-a96f-49b6-ad82-47d6c8852dca");
    expect(isInternalOwnerCompany(INTERNAL_OWNER_COMPANY_ID)).toBe(true);
    expect(isInternalOwnerCompany("different-company")).toBe(false);
  });

  it("filters internal company and keeps real external customers", () => {
    expect(filterExternalBusinessCompany(INTERNAL_OWNER_COMPANY_ID)).toBe(false);
    expect(filterExternalBusinessCompany("customer-123")).toBe(true);
    expect(filterExternalBusinessCompany(null)).toBe(false);
  });

  it("filters internal test notifications from current business views", () => {
    expect(
      filterExternalBusinessNotification({
        company_id: INTERNAL_OWNER_COMPANY_ID,
        created_at: "2026-10-01T00:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      filterExternalBusinessNotification({
        company_id: "customer-456",
        created_at: "2026-10-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });
});
