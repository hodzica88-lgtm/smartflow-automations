import { describe, expect, it } from "vitest";

import {
  BILLING_COPY,
  DASHBOARD_COPY,
  NOTIFICATION_CENTER_COPY,
  OPERATOR_COPY,
  TEAM_COPY,
} from "@/shared/i18n/dashboard";

describe("dashboard market copy", () => {
  it("keeps german dashboard labels", () => {
    expect(DASHBOARD_COPY.de.newLeads).toBe("Neue Anfragen");
    expect(TEAM_COPY.de.sectionLabel).toBe("Mitarbeiter");
    expect(BILLING_COPY.de.subscriptionText).toContain("EUR");
  });

  it("provides english dashboard labels for US market", () => {
    expect(DASHBOARD_COPY.us.newLeads).toBe("New leads");
    expect(TEAM_COPY.us.sectionLabel).toBe("Team");
    expect(BILLING_COPY.us.subscriptionText).toContain("USD");
    expect(NOTIFICATION_CENTER_COPY.us.sectionLabel).toBe("Notifications");
    expect(OPERATOR_COPY.us.title).toBe("System overview");
  });
});
