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
});

describe("support inbound processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: "thread-1" }], error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it("deduplicates inbound events by provider message id", async () => {
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

  it("sends a manual owner reply and stores it in the thread", async () => {
    const table = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "thread-1", customer_email: "customer@example.com" }, error: null }),
      insert: vi.fn().mockResolvedValue({ data: [{ id: "message-2" }], error: null }),
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

  it("rejects unauthenticated owner access for support actions", async () => {
    const { createSupabaseServerClient } = await import("@/shared/lib/supabase/server");
    serverClientMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const action = await import("@/features/support/actions");
    await expect(action.sendSupportReplyAction(new FormData())).rejects.toThrow();
    expect(createSupabaseServerClient).toHaveBeenCalled();
  });
});
