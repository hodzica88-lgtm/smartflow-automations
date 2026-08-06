"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { resolveGuideResponse } from "@/features/demo/guide";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

type GuideMessage = {
  role: "assistant" | "user";
  content: string;
};

export default function DemoGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useDemo();
  const copy = useMemo(() => getDemoCopy(state.market), [state.market]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<GuideMessage[]>([
    { role: "assistant", content: copy.guide.welcome },
  ]);

  const ask = (question: string) => {
    const response = resolveGuideResponse(state.market, question);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: response.answer },
    ]);

    if (response.route) {
      const isSameRoute = pathname === response.route;
      const target = response.highlight
        ? `${response.route}?highlight=${encodeURIComponent(response.highlight)}`
        : response.route;
      router.push(target);

      if (isSameRoute) {
        router.refresh();
      }
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) {
      return;
    }

    ask(question);
    setInput("");
  };

  return (
    <aside className={styles.guideRoot} aria-label={copy.guide.name}>
      {open ? (
        <div className={styles.guidePanel}>
          <div className={styles.guideHeader}>
            <strong>{copy.guide.name}</strong>
            <button type="button" className={styles.buttonSecondary} onClick={() => setOpen(false)}>
              {copy.guide.close}
            </button>
          </div>

          <div className={styles.guideSuggestions}>
            {copy.guide.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestion}
                onClick={() => ask(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className={styles.guideMessages}>
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={message.role === "assistant" ? styles.assistantMsg : styles.userMsg}
              >
                {message.content}
              </p>
            ))}
          </div>

          <form onSubmit={onSubmit} className={styles.guideInputRow}>
            <input
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={copy.guide.placeholder}
              aria-label={copy.guide.placeholder}
            />
            <button type="submit" className={styles.button}>{copy.guide.send}</button>
          </form>
        </div>
      ) : (
        <button type="button" className={styles.guideToggle} onClick={() => setOpen(true)}>
          {copy.guide.name} - {copy.guide.open}
        </button>
      )}
    </aside>
  );
}
