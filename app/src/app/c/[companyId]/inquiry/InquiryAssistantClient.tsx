"use client";

import { useEffect, useMemo, useState } from "react";

type MarketCode = "de" | "us";

type AssistantMessages = Array<{
  id: string;
  role: "assistant" | "user";
  content: string;
}>;

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
    typeQuestion: isUs ? "Which request type fits best?" : "Welche Anfrageart passt am besten?",
    firstNamePrompt: isUs ? "What is your first name?" : "Wie dürfen wir Sie nennen? Bitte geben Sie Ihren Vornamen ein.",
    lastNamePrompt: isUs ? "What is your last name?" : "Bitte geben Sie Ihren Nachnamen ein.",
    addressPrompt: isUs ? "What is your address?" : "Bitte geben Sie Ihre Adresse ein.",
    phonePrompt: isUs ? "What is your phone number?" : "Wie können wir Sie telefonisch erreichen?",
    emailPrompt: isUs ? "What is your email address?" : "Wie können wir Ihnen per E-Mail antworten?",
    summaryPrefix: isUs ? "Everything is clear. I have:" : "Alles klar. Ich habe:",
    summaryFooter: isUs ? "Do you want to send this request now?" : "Soll ich die Anfrage jetzt senden?",
    descriptionPlaceholder: isUs ? "Describe what you need..." : "Beschreiben Sie kurz Ihr Anliegen...",
    genericError: isUs ? "Please fill in the required information." : "Bitte füllen Sie die erforderlichen Informationen aus.",
    formTitle: isUs ? "Classic form" : "Klassisches Formular",
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
  const [inquiryType, setInquiryType] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"description" | "type" | "follow_up" | "first_name" | "last_name" | "address" | "phone" | "email" | "summary">("description");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [assistantUnavailable, setAssistantUnavailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

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
    if (step === "first_name") return copy.firstNamePrompt;
    if (step === "last_name") return copy.lastNamePrompt;
    if (step === "address") return copy.addressPrompt;
    if (step === "phone") return copy.phonePrompt;
    if (step === "email") return copy.emailPrompt;

    return `${copy.summaryPrefix} ${[
      inquiryType,
      `${firstName} ${lastName}`.trim(),
      address,
    ]
      .filter(Boolean)
      .join(" • ")}`;
  })();

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

  const goToNextStep = () => {
    if (step === "description") return setStep("type");
    if (step === "type") return setStep("first_name");
    if (step === "follow_up") return setStep("first_name");
    if (step === "first_name") return setStep("last_name");
    if (step === "last_name") return setStep("address");
    if (step === "address") return setStep("phone");
    if (step === "phone") return setStep("email");
    if (step === "email") return setStep("summary");
  };

  const handleSend = async () => {
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

        setDescription(nextDraft);
        setMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, role: "user", content: nextDraft },
          { id: `assistant-${Date.now() + 1}`, role: "assistant", content: payload.question ?? copy.typeQuestion },
        ]);

        const questionText = payload.question ?? copy.typeQuestion;
        setFollowUpQuestion(payload.requiresTypeSelection ? "" : questionText);

        if (payload.suggestedInquiryType) {
          setInquiryType(payload.suggestedInquiryType);
        }

        if (payload.requiresTypeSelection) {
          setSuggestions(payload.options && payload.options.length > 0 ? payload.options : inquiryTypeOptions);
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
        const selected = nextDraft || inquiryType || suggestions[0] || fallbackInquiryType;
        setInquiryType(selected);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: selected }]);
        setDraft("");
        goToNextStep();
        return;
      }

      if (step === "follow_up") {
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        setFollowUpQuestion("");
        setStep("first_name");
        return;
      }

      if (step === "first_name") {
        setFirstName(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        goToNextStep();
        return;
      }

      if (step === "last_name") {
        setLastName(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        goToNextStep();
        return;
      }

      if (step === "address") {
        setAddress(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        goToNextStep();
        return;
      }

      if (step === "phone") {
        setPhone(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        goToNextStep();
        return;
      }

      if (step === "email") {
        setEmail(nextDraft);
        setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: nextDraft }]);
        setDraft("");
        setStep("summary");
        return;
      }

      if (step === "summary") {
        const response = await fetch("/api/public/inquiry-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            companyId,
            firstName,
            lastName,
            address,
            phone,
            email,
            inquiryType,
            description,
            source: "public_ai_chat",
            turnCount: 7,
          }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (!response.ok || !payload.ok) {
          setErrorText(payload.error ?? copy.genericError);
          return;
        }

        setMessages((prev) => [
          ...prev,
          { id: `assistant-${Date.now() + 2}`, role: "assistant", content: market === "us" ? "Thanks! Your request has been sent." : "Vielen Dank! Ihre Anfrage wurde gesendet." },
        ]);
        setDraft("");
        setFormSuccess(market === "us" ? "Thanks! Your request has been sent." : "Vielen Dank! Ihre Anfrage wurde gesendet.");
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

    const response = await fetch("/api/public/inquiry-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !result.ok) {
      setFormError(result.error ?? (market === "us" ? "The request could not be sent." : "Die Anfrage konnte nicht gesendet werden."));
      return;
    }

    setFormSuccess(market === "us" ? "Thanks! Your request has been sent." : "Vielen Dank! Ihre Anfrage wurde gesendet.");
    event.currentTarget.reset();
  };

  const handleOptionPick = (value: string) => {
    setDraft(value);
    void handleSend();
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
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {step === "summary" ? (
              <div style={{ display: "grid", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <strong>{copy.summaryPrefix}</strong>
                <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
                  <li>{inquiryType || fallbackInquiryType}</li>
                  <li>{[firstName, lastName].filter(Boolean).join(" ") || (market === "us" ? "Customer" : "Kunde")}</li>
                  <li>{address || (market === "us" ? "Address" : "Adresse")}</li>
                </ul>
                <p style={{ margin: 0 }}>{copy.summaryFooter}</p>
              </div>
            ) : null}

            {formSuccess ? (
              <div style={{ padding: 10, borderRadius: 12, background: "rgba(46,204,113,0.12)", border: "1px solid rgba(46,204,113,0.32)", color: "var(--text)" }}>
                {formSuccess}
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
                  <button type="button" onClick={() => void handleSend()} style={{ padding: "14px 18px", background: "var(--gold)", color: "#101010", borderRadius: 12, border: "none", fontWeight: 700, cursor: "pointer" }}>
                    {copy.send}
                  </button>
                  <button type="button" onClick={() => setStep("type")} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", color: "var(--text)", borderRadius: 12, border: "1px solid var(--border)", cursor: "pointer" }}>
                    {copy.change}
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <label htmlFor="assistant-input" style={{ fontWeight: 600 }}>{activePrompt}</label>
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
                  <option key={option} value={option}>{option}</option>
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

            <button type="submit" style={{ padding: "16px 18px", background: "var(--gold)", color: "#101010", borderRadius: 12, border: "none", fontWeight: 700, cursor: "pointer" }}>
              {market === "us" ? "Send request" : "Anfrage senden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
