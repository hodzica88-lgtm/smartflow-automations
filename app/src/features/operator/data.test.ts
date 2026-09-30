import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import OwnerControlCenterPage from "@/app/operator/owner/page";
import {
  deriveBackupStatus,
  normalizeBackupTimestamp,
  parseBackupStatusFile,
  readOwnerBackupState,
} from "@/features/operator/data";
import {
  INTERNAL_OWNER_COMPANY_ID,
  filterExternalBusinessCompany,
  filterExternalBusinessNotification,
  isInternalOwnerCompany,
} from "@/features/operator/internal-company";

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => ({
    market: "de",
    config: { locale: "de-DE" },
  })),
}));

vi.mock("@/features/operator/access", () => ({
  requireOperatorUser: vi.fn(async () => ({
    id: "owner-1",
    email: "owner@example.com",
  })),
}));

vi.mock("@/features/notifications/service", () => ({
  listOwnerBusinessNotifications: vi.fn(async () => []),
}));

vi.mock("@/features/operator/data", async () => {
  const actual = await vi.importActual<typeof import("@/features/operator/data")>("@/features/operator/data");
  const { GROWTH_SOURCES } = await import("@/features/analytics/growth");

  return {
    ...actual,
    getOwnerControlCenterData: vi.fn(async () => ({
      mrr: { de: 0, us: 0 },
      activeCustomers: 0,
      runningTrials: 0,
      paymentRisks: 0,
      scheduledCancellations: 0,
      newCompaniesLast7d: 0,
      serverStatus: "ok",
      healthStatus: "ok",
      warnings: [],
      growth: {
        visitors: 0,
        demoOpened: 0,
        trialsStarted: 0,
        payingCustomers: 0,
        trialCancellations: 0,
        subscriptionCancellations: 0,
        sources: Object.fromEntries(
          GROWTH_SOURCES.map((source) => [source, { visitors: 0, demos: 0, trials: 0, paid: 0 }]),
        ),
      },
      analytics: { de7d: 0, us7d: 0, de30d: 0, us30d: 0 },
      queue: { due: 0, failed24h: 0, stale: 0 },
      lastErrors: [],
      lastBackup: {
        label: "Backup",
        checkedAt: null,
        status: "Unbekannt",
      },
    })),
    getOwnerGrowthMonthData: vi.fn(async () => ({
      monthKey: "2026-09",
      monthRange: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T23:59:59.999Z" },
      previousMonthRange: null,
      previousSummary: null,
      summary: {
        visitors: 0,
        demoOpened: 0,
        trialsStarted: 0,
        payingCustomers: 0,
        trialCancellations: 0,
        subscriptionCancellations: 0,
        sources: Object.fromEntries(
          GROWTH_SOURCES.map((source) => [source, { visitors: 0, demos: 0, trials: 0, paid: 0 }]),
        ),
      },
    })),
  };
});

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

describe("owner backup state", () => {
  it("treats recent backups as current", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(deriveBackupStatus(recent)).toBe("Aktuell");
  });

  it("treats older backups as overdue", () => {
    const overdue = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString();
    expect(deriveBackupStatus(overdue)).toBe("Überfällig");
  });

  it("normalizes backup timestamps from release directories", () => {
    expect(normalizeBackupTimestamp("2026-07-23_00-00-00")).toBe("2026-07-23T00:00:00.000Z");
    expect(normalizeBackupTimestamp("not-a-date")).toBeNull();
  });

  it("returns unknown for a missing backup status file", () => {
    expect(parseBackupStatusFile(null)).toEqual({
      lastSuccessfulBackupAt: null,
      version: null,
    });
  });

  it("returns unknown for a malformed status file", () => {
    expect(parseBackupStatusFile("{bad json}")).toEqual({
      lastSuccessfulBackupAt: null,
      version: null,
    });
  });

  it("parses version and timestamps safely from valid runtime metadata", () => {
    const parsed = parseBackupStatusFile(JSON.stringify({
      lastSuccessfulBackupAt: "2026-09-28T17:23:00.000Z",
      version: "v1.4.0",
    }));

    expect(parsed.lastSuccessfulBackupAt).toBe("2026-09-28T17:23:00.000Z");
    expect(parsed.version).toBe("v1.4.0");
  });

  it("does not throw if the runtime status file is unreadable", async () => {
    const previous = process.env.VARNITO_RUNTIME_BACKUP_STATUS_PATH;
    process.env.VARNITO_RUNTIME_BACKUP_STATUS_PATH = "/definitely/missing/backup-status.json";

    await expect(readOwnerBackupState()).resolves.toMatchObject({
      label: "Backup",
      checkedAt: null,
      status: "Unbekannt",
    });

    if (previous === undefined) {
      delete process.env.VARNITO_RUNTIME_BACKUP_STATUS_PATH;
    } else {
      process.env.VARNITO_RUNTIME_BACKUP_STATUS_PATH = previous;
    }
  });

  it("renders the backup card on the owner dashboard", async () => {
    const html = renderToStaticMarkup(await OwnerControlCenterPage({}));
    expect(html).toContain("Sicherung");
    expect(html).toContain("Unbekannt");
  });
});
