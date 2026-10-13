"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildContextualFollowUpQuestion,
  buildInquirySummary,
  combineInquiryDescription,
  getInquiryTypeDisplayLabel,
  getSubmissionSuccessText,
  normalizeInquiryTypeName,
  resolveInquiryTypeOption,
} from "@/features/inquiry-assistant/summary";

type MarketCode = "de" | "us";

type AssistantMessages = Array<{
  id: string;
  role: "assistant" | "user";
  content: string;
}>;

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const createClientIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `inq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

type InquiryAssistantProps = {
  companyId: string;
  market: MarketCode;
  inquiryTypeOptions: string[];
  fallbackInquiryType: string;
};

const getCopy = (market: MarketCode) => {
  const isUs = market === "us";

  return {
    greeting: isUs ? "Hi! 👋 How can we help?" : "Hallo! 👋 Wobei können wir Ihnen helfen?",
    fallbackInfo: isUs
      ? "The assistant is temporarily unavailable. You can still send your request using the form."
      : "Der Assistent ist gerade nicht verfügbar. Sie können Ihre Anfrage weiterhin über das Formular senden.",
    preferForm: isUs ? "Prefer the form instead" : "Lieber Formular verwenden",
    send: isUs ? "Send request" : "Anfrage senden",
    change: isUs ? "Change" : "Ändern",
    next: isUs ? "Continue" : "Weiter",
    typeQuestion: isUs ? "What type of request would you like to send?" : "Welche Art von Anfrage möchten Sie senden?",
    followUpPrompt: isUs ? "Understood. Can you briefly describe what is failing?" : "Verstanden. Können Sie kurz beschreiben, was genau nicht funktioniert?",
    firstNamePrompt: isUs ? "What is your first name?" : "Wie dürfen wir Sie nennen? Bitte geben Sie Ihren Vornamen ein.",
    lastNamePrompt: isUs ? "What is your last name?" : "Bitte geben Sie Ihren Nachnamen ein.",
    addressPrompt: isUs ? "What is your address?" : "Bitte geben Sie Ihre Adresse ein.",
    phonePrompt: isUs ? "What is your phone number?" : "Wie können wir Sie telefonisch erreichen?",
    emailPrompt: isUs ? "What is your email address?" : "Wie können wir Ihnen per E-Mail antworten?",
    contactDetailsPrompt: isUs ? "Thanks. Please provide your contact details so the business can reach you." : "Danke. Bitte geben Sie uns noch Ihre Kontaktdaten, damit der Betrieb Sie erreichen kann.",
    contactDetailsTitle: isUs ? "Contact details" : "Kontaktdaten",
    summaryPrefix: isUs ? "Everything is clear. I have:" : "Alles klar. Ich habe:",
    summaryFooter: isUs ? "Do you want to send this request now?" : "Soll ich die Anfrage jetzt senden?",
    descriptionPlaceholder: isUs ? "Describe what you need..." : "Beschreiben Sie kurz Ihr Anliegen...",
    genericError: isUs ? "Please fill in the required information." : "Bitte füllen Sie die erforderlichen Informationen aus.",
    formTitle: isUs ? "Classic form" : "Klassisches Formular",
    fieldLabels: isUs
      ? {
          firstName: "First name",
          lastName: "Last name",
          address: "Address",
          phone: "Phone number",
          email: "Email address",
        }
      : {
          firstName: "Vorname",
          lastName: "Nachname",
          address: "Adresse",
          phone: "Telefonnummer",
          email: "E-Mail-Adresse",
        },
  } as const;
};

export default function InquiryAssistantClient({
  companyId,
  market,
  inquiryTypeOptions,
  fallbackInquiryType,
}: InquiryAssistantProps) {
  const copy = useMemo(() => getCopy(market), [market]);
  const [mode, setMode] = useState<"chat" | "form">("chat");
  const [messages, setMessages] = useState<AssistantMessages>([
    { id: "welcome", role: "assistant", content: copy.greeting },
  ]);
  const [draft, setDraft] = useState("");
  const [description, setDescription] = useState("");
  const [contextualAnswer, setContextualAnswer] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [contactDetails, updateContactDetails] = useState({
    firstName: "",
    lastName: "",
    address: "",
    phone: "",
    email: "",
  });
  const { firstName, lastName, address, phone, email } = contactDetails;
  const updateContactField =
    (field: keyof typeof contactDetails) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateContactDetails((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };
  const [step, setStep] = useState<"description" | "type" | "follow_up" | "contact" | "summary" | "success">("description");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [assistantUnavailable, setAssistantUnavailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [activeSubmission, setActiveSubmission] = useState<{ key: string; fingerprint: string } | null>(null);

  const resolveSubmissionIdempotencyKey = (payload: Record<string, unknown>) => {
    const fingerprint = stableStringify(payload);

    if (activeSubmission && activeSubmission.fingerprint === fingerprint) {
      return activeSubmission.key;
    }

    const nextSubmission = {
      key: createClientIdempotencyKey(),
      fingerprint,
    };

    setActiveSubmission(nextSubmission);
    return nextSubmission.key;
  };

  const resetSubmissionIdempotency = () => setActiveSubmission(null);

  useEffect(() => {
    fetch("/api/public/inquiry-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "track-start", companyId, market }),
    }).catch(() => {
      // No-op; telemetry errors must not break the intake flow.
    });
  }, [companyId, market]);

  const activePrompt = (() => {
    if (step === "description") return copy.greeting;
    if (step === "type") return copy.typeQuestion;
    if (step === "follow_up") return followUpQuestion || copy.greeting;
    if (step === "contact") return copy.contactDetailsPrompt;

    return `${copy.summaryPrefix} ${[
      inquiryType,
      `${firstName} ${lastName}`.trim(),
      address,
    ]
      .filter(Boolean)
      .join(" • ")}`;
  })();

  const validInquiryTypeOptions = inquiryTypeOptions.length > 0 ? inquiryTypeOptions : [fallbackInquiryType];
  const lockedInquiryType = resolveInquiryTypeOption(inquiryType, validInquiryTypeOptions, fallbackInquiryType);
  const successText = getSubmissionSuccessText(market);
  const summaryText = buildInquirySummary({
    firstName,
    lastName,
    address,
    phone,
    email,
    inquiryType: lockedInquiryType,
    description,
    contextualAnswer,
    market,
    allowedInquiryTypes: validInquiryTypeOptions,
  });

  const validateAndContinueToSummary = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName) {
      setErrorText(market === "us" ? "Please enter your first name." : "Bitte geben Sie Ihren Vornamen ein.");
      return;
    }

    if (!trimmedLastName) {
      setErrorText(market === "us" ? "Please enter your last name." : "Bitte geben Sie Ihren Nachnamen ein.");
      return;
    }

    if (!trimmedAddress) {
      setErrorText(market === "us" ? "Please enter your address." : "Bitte geben Sie Ihre Adresse ein.");
      return;
    }

    if (!trimmedPhone || trimmedPhone.replace(/[^0-9+()\-\s]/g, "").length < 7 || !/\d/.test(trimmedPhone)) {
      setErrorText(market === "us" ? "Please enter a valid phone number." : "Bitte geben Sie eine gültige Telefonnummer ein.");
      return;
    }

    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setErrorText(market === "us" ? "Please enter a valid email address." : "Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    setErrorText("");
    setStep("summary");
  };

  const pushAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: "assistant", content },
    ]);
  };

  const handleModeToggle = () => {
    const nextMode = mode === "chat" ? "form" : "chat";
    setMode(nextMode);
    if (nextMode === "form") {
      fetch("/api/public/inquiry-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "track-fallback-form", companyId }),
      }).catch(() => {
        // No-op.
      });
    }
  };

  const handleSend = async () => {
    if (pending || step === "success") {
      return;
    }

    const nextDraft = draft.trim();
    if (!nextDraft && step !== "summary") {
      setErrorText(copy.genericError);
      return;
    }

    setPending(true);
    setErrorText("");

    try {
      if (step === "description") {
        const response = await fetch("/api/public/inquiry-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "suggest-type",
            companyId,
            description: nextDraft,
            market,
          }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          suggestedInquiryType?: string;
          options?: string[];
          question?: string;
          error?: string;
          requiresTypeSelection?: boolean;
        };

        if (!response.ok || !payload.ok) {
          setAssistantUnavailable(true);
          return;
        }

        const contextualQuestion = buildContextualFollowUpQuestion({
          description: nextDraft,
          market,
        });

        setDescription(nextDraft);
        setMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, role: "user", content: nextDraft },
          { id: `assistant-${Date.now() + 1}`, role: "assistant", content: payload.question ?? copy.typeQuestion },
        ]);

        const resolvedType = resolveInquiryTypeOption(
          payload.suggestedInquiryType,
          payload.options && payload.options.length > 0 ? payload.options : validInquiryTypeOptions,
          fallbackInquiryType,
        );
        setFollowUpQuestion(contextualQuestion);

        if (payload.suggestedInquiryType) {
          setInquiryType(resolvedType);
        }

        if (payload.requiresTypeSelection) {
          setSuggestions(payload.options && payload.options.length > 0 ? payload.options : validInquiryTypeOptions);
          setDraft("");
          setStep("type");
          return;
        }

        setSuggestions([]);
        setDraft("");
        setStep("follow_up");
        return;
      }

      if (step === "type") {
        const safeOption = resolveInquiryTypeOption(nextDraft || inquiryType || suggestions[0] || fallbackInquiryType, validInquiryTypeOptions, fallbackInquiryType);
        if (!validInquiryTypeOptions.some((option) => option === safeOption)) {
          setErrorText(market === "us" ? "Please choose a valid request type." : "Bitte wählen Sie eine gültige Anfrageart aus.");
          return;
        }

        setInquiryType(safeOption);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: safeOption }]);
        setDraft("");
        setSuggestions([]);
        setStep("follow_up");
        pushAssistantMessage(
          followUpQuestion || buildContextualFollowUpQuestion({
            description,
            market,
          }),
        );
        return;
      }

      if (step === "follow_up") {
        setContextualAnswer(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        setFollowUpQuestion("");
        setStep("contact");
        pushAssistantMessage(copy.contactDetailsPrompt);
        return;
      }

      if (step === "contact") {
        return;
      }

      if (step === "summary") {
        const combinedDescription = combineInquiryDescription(description, contextualAnswer);
        const submitPayload = {
          action: "submit",
          companyId,
          firstName,
          lastName,
          address,
          phone,
          email,
          inquiryType: lockedInquiryType,
          description: combinedDescription,
          source: "public_ai_chat",
          turnCount: 7,
        } as const;
        const idempotencyKey = resolveSubmissionIdempotencyKey(submitPayload);

        const response = await fetch("/api/public/inquiry-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...submitPayload,
            idempotencyKey,
          }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (!response.ok || !payload.ok) {
          setErrorText(payload.error ?? copy.genericError);
          return;
        }

        resetSubmissionIdempotency();
        setDraft("");
        setFormSuccess("");
        setStep("success");
        return;
      }
    } catch {
      setAssistantUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      action: "submit",
      companyId,
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      inquiryType: String(formData.get("inquiry_type") ?? ""),
      description: String(formData.get("description") ?? ""),
      source: "public_form",
    } as const;

    setFormError("");
    setFormSuccess("");
    setFormPending(true);

    try {
      const idempotencyKey = resolveSubmissionIdempotencyKey(payload);
      const response = await fetch("/api/public/inquiry-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          idempotencyKey,
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setFormError(result.error ?? (market === "us" ? "The request could not be sent." : "Die Anfrage konnte nicht gesendet werden."));
        return;
      }

      resetSubmissionIdempotency();
      setFormSuccess(market === "us" ? "Thanks! Your request has been sent." : "Vielen Dank! Ihre Anfrage wurde gesendet.");
      event.currentTarget.reset();
    } finally {
      setFormPending(false);
    }
  };

  const selectInquiryType = (value: string) => {
    const canonicalValue = validInquiryTypeOptions.find(
      (option) => normalizeInquiryTypeName(option) === normalizeInquiryTypeName(value),
    );

    if (!canonicalValue) {
      setErrorText(market === "us" ? "Please choose a valid request type." : "Bitte wählen Sie eine gültige Anfrageart aus.");
      return;
    }

    setInquiryType(canonicalValue);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: getInquiryTypeDisplayLabel(canonicalValue, market) }]);
    setDraft("");
    setSuggestions([]);

    const nextFollowUp = followUpQuestion || buildContextualFollowUpQuestion({
      description,
      market,
    });
    setFollowUpQuestion(nextFollowUp);
    setStep("follow_up");
    pushAssistantMessage(nextFollowUp);
  };

  const handleOptionPick = (value: string) => {
    selectInquiryType(value);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "grid", gap: 16, border: "1px solid var(--border)", borderRadius: 24, background: "rgba(17, 19, 26, 0.9)", boxShadow: "var(--shadow-xl)", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.4rem)" }}>
            {market === "us" ? "Customer inquiry" : "Kontaktanfrage"}
          </h1>
          <button type="button" onClick={handleModeToggle} style={{ border: "1px solid var(--border)", borderRadius: 999, background: "rgba(255,255,255,0.03)", color: "var(--text)", padding: "8px 12px", cursor: "pointer" }}>
            {copy.preferForm}
          </button>
        </div>

        {mode === "chat" ? (
          <>
            <div aria-live="polite" role="log" style={{ display: "grid", gap: 10, padding: 12, borderRadius: 18, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              {messages.map((entry) => (
                <div key={entry.id} style={{ maxWidth: "86%", padding: "12px 14px", borderRadius: 16, background: entry.role === "assistant" ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.06)", border: entry.role === "assistant" ? "1px solid rgba(212,175,55,0.32)" : "1px solid var(--border)", justifySelf: entry.role === "assistant" ? "start" : "end" }}>
                  {entry.content}
                </div>
              ))}
            </div>

            {assistantUnavailable ? (
              <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,95,114,0.3)", background: "rgba(255,95,114,0.08)", color: "var(--text)" }}>
                {copy.fallbackInfo}
              </div>
            ) : null}

            {step === "type" && suggestions.length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {suggestions.map((option) => (
                  <button key={option} type="button" onClick={() => handleOptionPick(option)} style={{ borderRadius: 999, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", color: "var(--text)", padding: "10px 14px", cursor: "pointer" }}>
                    {getInquiryTypeDisplayLabel(option, market)}
                  </button>
                ))}
              </div>
            ) : null}

            {step === "summary" ? (
              <div style={{ display: "grid", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.98rem" }}>{summaryText}</div>
              </div>
            ) : null}

            {step === "success" ? (
              <div role="status" aria-live="polite" style={{ padding: 12, borderRadius: 12, background: "rgba(46,204,113,0.12)", border: "1px solid rgba(46,204,113,0.32)", color: "var(--text)" }}>
                {successText}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              {errorText ? (
                <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,95,114,0.1)", border: "1px solid rgba(255,95,114,0.25)", color: "var(--text)" }}>
                  {errorText}
                </div>
              ) : null}

              {step === "summary" ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void handleSend()} disabled={pending} style={{ padding: "14px 18px", background: pending ? "rgba(212,175,55,0.5)" : "var(--gold)", color: "#101010", borderRadius: 12, border: "none", fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                    {pending ? (market === "us" ? "Sending..." : "Senden...") : copy.send}
                  </button>
                  <button type="button" onClick={() => setStep("contact")} disabled={pending} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", color: "var(--text)", borderRadius: 12, border: "1px solid var(--border)", cursor: pending ? "not-allowed" : "pointer" }}>
                    {copy.change}
                  </button>
                </div>
              ) : step === "contact" ? (
                <div style={{ display: "grid", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <strong>{copy.contactDetailsTitle}</strong>
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        {copy.fieldLabels.firstName}
                        <input aria-label={copy.fieldLabels.firstName} value={firstName} onChange={updateContactField("firstName")} placeholder={market === "us" ? "Jane" : "Max"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        {copy.fieldLabels.lastName}
                        <input aria-label={copy.fieldLabels.lastName} value={lastName} onChange={updateContactField("lastName")} placeholder={market === "us" ? "Doe" : "Mustermann"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        {copy.fieldLabels.address}
                        <input aria-label={copy.fieldLabels.address} value={address} onChange={updateContactField("address")} placeholder={market === "us" ? "123 Main St" : "Musterstraße 1"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        {copy.fieldLabels.phone}
                        <input aria-label={copy.fieldLabels.phone} value={phone} onChange={updateContactField("phone")} placeholder={market === "us" ? "+1 555 123 4567" : "+49 711 123456"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        {copy.fieldLabels.email}
                        <input aria-label={copy.fieldLabels.email} type="email" value={email} onChange={updateContactField("email")} placeholder={market === "us" ? "name@example.com" : "max@example.com"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={validateAndContinueToSummary} style={{ border: "none", borderRadius: 12, background: "var(--gold)", color: "#101010", padding: "16px 18px", fontWeight: 700, cursor: "pointer" }}>
                    {copy.next}
                  </button>
                </div>
              ) : step === "type" ? null : step === "success" ? null : (
                <div style={{ display: "grid", gap: 10 }}>
                  <label htmlFor="assistant-input" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>{activePrompt}</label>
                  <textarea id="assistant-input" aria-label={activePrompt} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={copy.descriptionPlaceholder} rows={step === "description" ? 4 : 2} style={{ width: "100%", minHeight: step === "description" ? 120 : 52, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)", padding: 14, resize: "vertical" }} />
                  <button type="button" onClick={() => void handleSend()} disabled={pending} style={{ border: "none", borderRadius: 12, background: pending ? "rgba(212,175,55,0.5)" : "var(--gold)", color: "#101010", padding: "16px 18px", fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                    {pending ? (market === "us" ? "Sending..." : "Senden...") : copy.next}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleFormSubmit} style={{ display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0 }}>{copy.formTitle}</h2>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "First name" : "Vorname"}
              <input name="first_name" required style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "Last name" : "Nachname"}
              <input name="last_name" required style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "Address" : "Adresse"}
              <input name="address" required style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "Phone" : "Telefon"}
              <input name="phone" required style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              E-Mail
              <input name="email" type="email" required style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "Inquiry type" : "Anfrage-Typ"}
              <select name="inquiry_type" required defaultValue="" style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}>
                <option value="" disabled>{market === "us" ? "Please choose" : "Bitte wählen"}</option>
                {(inquiryTypeOptions.length > 0 ? inquiryTypeOptions : [fallbackInquiryType]).map((option) => (
                  <option key={option} value={option}>{getInquiryTypeDisplayLabel(option, market)}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {market === "us" ? "Description (optional)" : "Beschreibung (optional)"}
              <textarea name="description" rows={4} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)" }} />
            </label>

            {formError ? (
              <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,95,114,0.1)", border: "1px solid rgba(255,95,114,0.25)", color: "var(--text)" }}>{formError}</div>
            ) : null}

            {formSuccess ? (
              <div style={{ padding: 10, borderRadius: 12, background: "rgba(46,204,113,0.12)", border: "1px solid rgba(46,204,113,0.32)", color: "var(--text)" }}>{formSuccess}</div>
            ) : null}

            <button type="submit" disabled={formPending} style={{ padding: "16px 18px", background: formPending ? "rgba(212,175,55,0.5)" : "var(--gold)", color: "#101010", borderRadius: 12, border: "none", fontWeight: 700, cursor: formPending ? "not-allowed" : "pointer" }}>
              {formPending ? (market === "us" ? "Sending..." : "Senden...") : market === "us" ? "Send request" : "Anfrage senden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
