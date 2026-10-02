import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

const serverClientMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => supabaseMock),
  createSupabaseServerClient: vi.fn(async () => serverClientMock),
}));

const supportModule = await import("@/features/support/service");
const aiModule = await import("@/features/support/ai-service");


describe("support AI classification", () => {
  it("classifies a common German product question as auto-reply eligible", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Wo finde ich die Anfragen?",
      body: "Hallo, ich suche nach meiner Anfrage. Wo finde ich die Einträge im Dashboard?",
      market: "de",
    });

    expect(result.detectedLanguage).toBe("de");
    expect(result.category).toBe("general_usage");
    expect(result.canAutoReply).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.75);
  });

  it("classifies a normal English product question as auto-reply eligible", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Where do I find my leads?",
      body: "I need to check my leads in the dashboard. Where do I find that page?",
      market: "us",
    });

    expect(result.detectedLanguage).toBe("en");
    expect(result.category).toBe("general_usage");
    expect(result.canAutoReply).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.75);
  });

  it("escalates refund requests", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Refund request",
      body: "I want a refund for my subscription. Please process it.",
      market: "us",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("refund");
    expect(result.escalationReason).toBeTruthy();
  });

  it("escalates payment problems", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Payment failed",
      body: "My card was charged twice and I cannot complete the invoice.",
      market: "us",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("payment");
  });

  it("escalates legal questions", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Legal question",
      body: "Can you explain our contract terms and legal obligations?",
      market: "us",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("legal");
  });

  it("escalates privacy and GDPR inquiries", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "GDPR data deletion",
      body: "We need a copy of all personal data and want to know about GDPR compliance.",
      market: "de",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("privacy");
  });

  it("escalates account deletion requests", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Please delete my account",
      body: "I want my Varnito account deleted and all data removed.",
      market: "de",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("account_deletion");
  });

  it("escalates security issues", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Security alert",
      body: "I suspect an unauthorized login and a security breach in my workspace.",
      market: "us",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("security");
  });

  it("escalates low-confidence requests", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "help",
      body: "I think something is wrong but I don't know what happened.",
      market: "us",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("escalates unknown questions", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Random question",
      body: "Can you explain the weather in Berlin and also my company funds?",
      market: "de",
    });

    expect(result.canAutoReply).toBe(false);
    expect(result.category).toBe("unknown");
  });

  it("normalizes localized AI category Datenschutz to privacy", async () => {
    const deterministic = await aiModule.classifySupportRequest({
      subject: "Datenschutz",
      body: "Bitte löschen Sie meine Daten und geben Sie Auskunft über den DSGVO-Status.",
      market: "de",
    });

    expect(deterministic.category).toBe("privacy");
    expect(deterministic.canAutoReply).toBe(false);
  });

  it("falls back when AI returns an invalid category value", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Question",
      body: "Need help navigating the dashboard.",
      market: "us",
    });

    expect(result.category).toMatch(/general_usage|unknown/);
    expect(result.canAutoReply).toBe(true);
  });

  it("keeps privacy-sensitive requests escalated even if AI output is noisy", async () => {
    const result = await aiModule.classifySupportRequest({
      subject: "Datenschutz",
      body: "Ich möchte alle persönlichen Daten löschen und brauche eine Auskunft zur DSGVO.",
      market: "de",
    });

    expect(result.category).toBe("privacy");
    expect(result.canAutoReply).toBe(false);
    expect(result.escalationReason).toBeTruthy();
  });
});

describe("support inbound processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "thread-1" }, error: null }),
      })),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  const buildSupportTables = (existingThreads: Array<Record<string, unknown>> = []) => {
    const threadRows = [...existingThreads];
    const messageTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [{ id: "message-1" }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const notificationTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [{ id: "notification-1" }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: "notification-1" }], error: null }),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    let customerEmail: string | null = null;
    let threadId: string | null = null;
    let rowsForQuery: Array<Record<string, unknown>> = [];

    const threadTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((field: string, value: unknown) => {
        if (field === "customer_email") {
          customerEmail = String(value);
          threadId = null;
          rowsForQuery = threadRows.filter((row) => row.customer_email === customerEmail);
        }
        if (field === "id") {
          threadId = String(value);
          customerEmail = null;
          rowsForQuery = threadRows.filter((row) => row.id === threadId);
        }
        return threadTable;
      }),
      order: vi.fn().mockImplementation(() => {
        if (threadId) {
          rowsForQuery = threadRows.filter((row) => row.id === threadId);
        } else if (customerEmail) {
          rowsForQuery = threadRows.filter((row) => row.customer_email === customerEmail).sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());
        }
        return threadTable;
      }),
      limit: vi.fn().mockImplementation((count: number) => ({
        data: rowsForQuery.slice(0, count),
        error: null,
      })),
      single: vi.fn().mockImplementation(() => ({
        data: threadRows.find((row) => row.id === threadId) ?? null,
        error: null,
      })),
      insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        const nextId = `thread-${threadRows.length + 1}`;
        threadRows.push({
          id: nextId,
          customer_email: payload.customer_email,
          subject: payload.subject,
          status: payload.status,
          category: payload.category,
          priority: payload.priority,
          ai_confidence: payload.ai_confidence,
          triage_bucket: payload.triage_bucket,
          triage_category: payload.triage_category,
          triage_summary: payload.triage_summary,
          triage_action: payload.triage_action,
          triage_confidence: payload.triage_confidence,
          triage_reason: payload.triage_reason,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        });
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: nextId }, error: null }),
        };
      }),
      update: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
        eq: vi.fn().mockImplementation((field: string, value: unknown) => {
          const row = threadRows.find((entry) => entry.id === value);
          if (row) {
            Object.assign(row, payload, { updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() });
          }
          return { data: [{ id: value }], error: null };
        }),
      })),
    };

    supabaseMock.from.mockImplementation((tableName: string) => {
      if (tableName === "support_messages") {
        return messageTable;
      }
      if (tableName === "app_notifications") {
        return notificationTable;
      }
      return threadTable;
    });

    return { threadRows, messageTable, threadTable, notificationTable, resetQuery: () => {
      customerEmail = null;
      threadId = null;
      rowsForQuery = [];
    } };
  };

  it("creates separate threads for the same sender when they send different new subjects", async () => {
    const { threadRows } = buildSupportTables();

    await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Question about pricing",
      body: "Can you share custom pricing for the product?",
      providerMessageId: "price-1",
      market: "us",
    });

    await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Business opportunity",
      body: "We want to talk about partnership and growth.",
      providerMessageId: "biz-1",
      market: "us",
    });

    expect(threadRows).toHaveLength(2);
    expect(threadRows[0].subject).toBe("Question about pricing");
    expect(threadRows[1].subject).toBe("Business opportunity");
  });

  it("appends a reply email to the matching previous thread instead of creating a new thread", async () => {
    const { threadRows } = buildSupportTables([
      {
        id: "thread-1",
        customer_email: "customer@example.com",
        subject: "Question about pricing",
        status: "open",
        category: "general_usage",
        priority: "medium",
        ai_confidence: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
    ]);

    await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Re: Question about pricing",
      body: "Thanks. We would also like a trial demo.",
      providerMessageId: "reply-1",
      market: "us",
    });

    expect(threadRows).toHaveLength(1);
    expect(threadRows[0].subject).toBe("Question about pricing");
  });

  it("treats forwarded mail as a new thread, not an automatic reply thread", async () => {
    const { threadRows } = buildSupportTables([
      {
        id: "thread-1",
        customer_email: "customer@example.com",
        subject: "Question about pricing",
        status: "open",
        category: "general_usage",
        priority: "medium",
        ai_confidence: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
    ]);

    await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Fwd: Question about pricing",
      body: "Forwarded original question from another inbox.",
      providerMessageId: "forward-1",
      market: "us",
    });

    expect(threadRows).toHaveLength(2);
    expect(threadRows[1].subject).toBe("Fwd: Question about pricing");
  });

  it("keeps a reply to a different subject in its own thread and does not merge by sender", async () => {
    const { threadRows } = buildSupportTables([
      {
        id: "thread-1",
        customer_email: "customer@example.com",
        subject: "Question about pricing",
        status: "open",
        category: "general_usage",
        priority: "medium",
        ai_confidence: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
    ]);

    await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Re: Completely different subject",
      body: "We are looking at another completely unrelated issue.",
      providerMessageId: "reply-different-1",
      market: "us",
    });

    expect(threadRows).toHaveLength(2);
    expect(threadRows[1].subject).toBe("Re: Completely different subject");
  });

  it("keeps different senders on separate threads even when subjects match", async () => {
    const { threadRows } = buildSupportTables();

    await supportModule.processInboundSupportMessage({
      senderEmail: "first@example.com",
      senderName: "First",
      subject: "Question about pricing",
      body: "We want pricing information.",
      providerMessageId: "first-price",
      market: "us",
    });

    await supportModule.processInboundSupportMessage({
      senderEmail: "second@example.com",
      senderName: "Second",
      subject: "Question about pricing",
      body: "We also need pricing information.",
      providerMessageId: "second-price",
      market: "us",
    });

    expect(threadRows).toHaveLength(2);
    expect(threadRows[0].customer_email).toBe("first@example.com");
    expect(threadRows[1].customer_email).toBe("second@example.com");
  });

  it("deduplicates inbound events by provider message id before thread creation", async () => {
    const existingMessages = [{ provider_message_id: "brevo-dup-123" }];
    const selectMock = vi.fn()
      .mockReturnThis();

    const singleMock = vi.fn().mockResolvedValue({ data: existingMessages[0], error: null });

    const table = {
      select: selectMock,
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      insert: vi.fn().mockResolvedValue({ data: [{ id: "message-1" }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: "message-1" }], error: null }),
      order: vi.fn().mockResolvedValue({ data: existingMessages, error: null }),
      limit: vi.fn().mockResolvedValue({ data: existingMessages, error: null }),
    };

    supabaseMock.from.mockReturnValue(table);

    const result = await supportModule.processInboundSupportMessage({
      senderEmail: "customer@example.com",
      senderName: "Customer",
      subject: "Test",
      body: "Hello from customer",
      providerMessageId: "brevo-dup-123",
      market: "de",
      ipAddress: "127.0.0.1",
    });

    expect(result.duplicate).toBe(true);
    expect(table.insert).not.toHaveBeenCalled();
  });

  it("blocks mail loops and auto replies to avoid endless replies", async () => {
    const result = await supportModule.isSupportLoopCandidate({
      subject: "Re: Re: Re: Test",
      body: "This is an automated message. Out of office.\n\nThanks for your email.",
      senderEmail: "mailer-daemon@example.com",
    });

    expect(result).toBe(true);
  });

  it("stores mail triage metadata without auto-sending outbound AI replies for potential customers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const table = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "thread-1", customer_email: "customer@example.com" }, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "thread-1" }, error: null }),
      })),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseMock.from.mockReturnValue(table);

    const result = await supportModule.processInboundSupportMessage({
      senderEmail: "pricing@roofing-company.com",
      senderName: "Roofing Lead",
      subject: "Question about Varnito pricing",
      body: "We run a roofing company in Texas. Does Varnito work with website leads and how much is it?",
      providerMessageId: "triage-potential-1",
      market: "us",
    });

    expect(result.created).toBe(true);
    expect(result.classification?.triageBucket).toBe("important");
    expect(result.classification?.triageCategory).toBe("potential_customer");
    expect(result.classification?.triageAction).toBe("respond");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("stores vendor sales triage metadata and never auto sends outbound marketing replies", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const table = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "thread-1", customer_email: "sales@agency.com" }, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "thread-1" }, error: null }),
      })),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseMock.from.mockReturnValue(table);

    const result = await supportModule.processInboundSupportMessage({
      senderEmail: "sales@agency.com",
      senderName: "SEO Agency",
      subject: "Grow varnito.com to #1 on Google",
      body: "We are an SEO agency and can improve your rankings and get more leads.",
      providerMessageId: "triage-sales-1",
      market: "de",
    });

    expect(result.created).toBe(true);
    expect(result.classification?.triageBucket).toBe("sales");
    expect(result.classification?.triageCategory).toBe("vendor_sales");
    expect(result.classification?.triageAction).toBe("ignore");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("sends a manual owner reply and stores it in the thread", async () => {
    const table = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "thread-1", customer_email: "customer@example.com" }, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "message-2" }, error: null }),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      })),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseMock.from.mockReturnValue(table);

    const result = await supportModule.sendOwnerSupportReply({
      threadId: "thread-1",
      actorEmail: "owner@varnito.com",
      body: "Thanks for reaching out. We are checking this.",
      market: "de",
    });

    expect(result.sent).toBe(true);
    expect(table.insert).toHaveBeenCalled();
  });

  it("accepts the real Brevo items-array payload and prefers extracted markdown", async () => {
    const routeModule = await import("@/app/api/support/inbound/route");

    const payload = {
      items: [
        {
          MessageId: "brevo-real-1",
          From: {
            Address: "customer@example.com",
            Name: "Ada Example",
          },
          Subject: "Question about billing",
          ExtractedMarkdownMessage: "Hello, I need help with billing.",
          RawTextBody: "Plain fallback",
        },
        {
          MessageId: "brevo-real-2",
          From: {
            Address: "customer2@example.com",
            Name: "Bob Example",
          },
          Subject: "Another question",
          RawTextBody: "Another plain message",
        },
      ],
    };

    const normalized = routeModule.normalizeSupportInboundItems(payload);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      senderEmail: "customer@example.com",
      senderName: "Ada Example",
      subject: "Question about billing",
      body: "Hello, I need help with billing.",
      providerMessageId: "brevo-real-1",
    });
    expect(normalized[1]).toMatchObject({
      senderEmail: "customer2@example.com",
      senderName: "Bob Example",
      subject: "Another question",
      body: "Another plain message",
      providerMessageId: "brevo-real-2",
    });
  });

  it("rejects unauthenticated owner access for support actions", async () => {
    const { createSupabaseServerClient } = await import("@/shared/lib/supabase/server");
    serverClientMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const action = await import("@/features/support/actions");
    await expect(action.sendSupportReplyAction(new FormData())).rejects.toThrow();
    expect(createSupabaseServerClient).toHaveBeenCalled();
  });
});
