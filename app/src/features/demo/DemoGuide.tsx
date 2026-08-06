"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { resolveGuideResponse } from "@/features/demo/guide";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

type GuideMessage = {
  role: "assistant" | "user";
  content: string;
};

export default function DemoGuide() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useDemo();
  const copy = useMemo(() => getDemoCopy(state.market), [state.market]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const messages: GuideMessage[] = [{ role: "assistant", content: copy.guide.welcome }];
  const primaryActions = copy.guide.suggestions.filter(
    (suggestion) => /team\.|billing\./i.test(suggestion),
  );
  const secondaryActions = copy.guide.suggestions.filter(
    (suggestion) => !/team\.|billing\./i.test(suggestion),
  );

  return (
    <aside className={styles.guideRoot} aria-label={copy.guide.name}>
      <button type="button" className={styles.guideToggle} onClick={() => setIsCollapsed(false)}>
        {copy.guide.name} - {copy.guide.open}
      </button>
      <div className={styles.guideSuggestions}>
        {primaryActions.map((suggestion) => {
          const suggestionResponse = resolveGuideResponse(state.market, suggestion);
          const target = suggestionResponse.route
            ? suggestionResponse.highlight
              ? `${suggestionResponse.route}?highlight=${encodeURIComponent(suggestionResponse.highlight)}`
              : suggestionResponse.route
            : null;

          if (target) {
            return (
              <a key={suggestion} href={target} className={styles.suggestion} role="button">
                {suggestion}
              </a>
            );
          }

          return (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestion}
              onClick={() => undefined}
            >
              {suggestion}
            </button>
          );
        })}
      </div>

      {!isCollapsed ? (
        <div className={styles.guidePanel}>
          <div className={styles.guideHeader}>
            <strong>{copy.guide.name}</strong>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => setIsCollapsed(true)}
            >
              {copy.guide.close}
            </button>
          </div>

          <div className={styles.guideSuggestions}>
            {secondaryActions.map((suggestion) => {
              const suggestionResponse = resolveGuideResponse(state.market, suggestion);
              const target = suggestionResponse.route
                ? suggestionResponse.highlight
                  ? `${suggestionResponse.route}?highlight=${encodeURIComponent(suggestionResponse.highlight)}`
                  : suggestionResponse.route
                : null;

              if (target) {
                return (
                  <a key={suggestion} href={target} className={styles.suggestion} role="button">
                    {suggestion}
                  </a>
                );
              }

              return (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => undefined}
                >
                  {suggestion}
                </button>
              );
            })}
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
            {!searchParams.get("guide") ? <p className={styles.assistantMsg}>{copy.guide.safety}</p> : null}
          </div>

        </div>
      ) : null}
      <form action="/demo/guide" method="get" className={styles.guideInputRow}>
        <input type="hidden" name="returnTo" value={pathname} />
        <input
          className={styles.input}
          name="q"
          placeholder={copy.guide.placeholder}
          aria-label={copy.guide.placeholder}
        />
        <button type="submit" className={styles.button}>{copy.guide.send}</button>
      </form>
    </aside>
  );
}
