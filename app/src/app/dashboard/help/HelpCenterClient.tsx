"use client";

import { useMemo, useState } from "react";

type HelpArticle = {
  id: string;
  title: string;
  content: string;
};

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "erste-schritte",
    title: "Erste Schritte",
    content:
      "Legen Sie zuerst Ihre Firmendaten an, teilen Sie den Anfrage-Link und pruefen Sie taeglich neue Leads im Dashboard.",
  },
  {
    id: "anfrage-beantworten",
    title: "Anfrage beantworten",
    content:
      "Oeffnen Sie den Lead, setzen Sie den Status auf kontaktiert und dokumentieren Sie das Ergebnis direkt im Lead.",
  },
  {
    id: "mitarbeiter-einladen",
    title: "Mitarbeiter einladen",
    content:
      "Unter Team koennen Owner Mitarbeiter per E-Mail einladen. Der Zugang wird nach Annahme automatisch aktiv.",
  },
  {
    id: "branding-aendern",
    title: "Branding aendern",
    content:
      "In Einstellungen koennen Sie Firmenlogo, Farben und Signatur anpassen. Diese Daten werden fuer automatische E-Mails genutzt.",
  },
  {
    id: "exportieren",
    title: "Exportieren",
    content:
      "Im Lead-Bereich steht CSV- und Excel-Export fuer Heute, diese Woche, diesen Monat oder einen eigenen Zeitraum bereit.",
  },
  {
    id: "passwort-aendern",
    title: "Passwort aendern",
    content:
      "Wenn Sie Ihr Passwort vergessen haben, nutzen Sie die Funktion Passwort vergessen auf der Login-Seite.",
  },
  {
    id: "abo-kuendigen",
    title: "Abo kuendigen",
    content:
      "Im Billing-Bereich koennen Sie Ihr Abo kuendigen oder wieder aktivieren. Laufende Perioden bleiben bis zum Ende aktiv.",
  },
  {
    id: "support-kontaktieren",
    title: "Support kontaktieren",
    content:
      "Bei Problemen senden Sie Details, betroffene Firma und Zeitpunkt an den Support, damit wir schneller helfen koennen.",
  },
];

export default function HelpCenterClient() {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return HELP_ARTICLES;
    }

    return HELP_ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(normalized) ||
        article.content.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        Suche
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Artikel suchen"
          style={{ minHeight: 44, borderRadius: 8, border: "1px solid #cbd5e0", padding: "0 12px" }}
        />
      </label>

      {filteredArticles.length === 0 ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fff" }}>
          Kein Artikel gefunden.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredArticles.map((article) => (
            <article key={article.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fff" }}>
              <h2 style={{ margin: "0 0 8px" }}>{article.title}</h2>
              <p style={{ margin: 0, color: "#374151" }}>{article.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}