// netlify/functions/submit-onboarding.js

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_CRM_DB_ID = process.env.NOTION_CRM_DB_ID;

// Falls du später auch automatisch Profil-Seiten anlegen willst,
// kannst du zusätzlich eine NOTION_PROFILE_DB_ID als Env-Variable setzen.

exports.handler = async (event) => {
  // Nur POST-Anfragen erlauben
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Body aus dem Formular auslesen (als JSON geschickt)
    const data = JSON.parse(event.body || "{}");

    // Felder aus deinem Formular
    const {
      business_name,
      contact_person,
      email,
      phone,
      website,
      industry,
      services,
      hours,
      socials,
      tone,
      audience,
      calendar,
      notes,
    } = data;

    // Sicherheitscheck: Notion-Key & DB-ID vorhanden?
    if (!NOTION_API_KEY || !NOTION_CRM_DB_ID) {
      console.error("Missing NOTION_API_KEY or NOTION_CRM_DB_ID environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Request an Notion: neuen Eintrag in der CRM-Datenbank erstellen
    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_CRM_DB_ID },
        properties: {
          // ⚠ Diese Property-Namen müssen exakt so heißen wie in deiner CRM-Tabelle

          "Kundenname": {
            title: [
              {
                text: {
                  content: business_name || "Neuer Kunde",
                },
              },
            ],
          },

          "Branche": {
            rich_text: [
              {
                text: { content: industry || "" },
              },
            ],
          },

          "Kontaktperson": {
            rich_text: [
              {
                text: { content: contact_person || "" },
              },
            ],
          },

          "Kontakt-E-Mail": {
            email: email || "",
          },

          "WhatsApp Nummer": {
            phone_number: phone || "",
          },

          "Website": {
            url: website || null,
          },

          "Social Media Links": {
            rich_text: [
              {
                text: { content: socials || "" },
              },
            ],
          },

          "Zielgruppe": {
            rich_text: [
              {
                text: { content: audience || "" },
              },
            ],
          },

          "Dienstleistungen & Preise": {
            rich_text: [
              {
                text: { content: services || "" },
              },
            ],
          },

          "Öffnungszeiten": {
            rich_text: [
              {
                text: { content: hours || "" },
              },
            ],
          },

          "Besondere Hinweise": {
            rich_text: [
              {
                text: { content: notes || "" },
              },
            ],
          },

          "Kalenderlink": {
            url: calendar || null,
          },

          "Tonalität": {
            select: {
              name: tone === "Sie" ? "Sie" : "Du",
            },
          },

          "Onboarding-Status": {
            select: {
              name: "In Einrichtung",
            },
          },
        },
      }),
    });

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error("Notion API error:", errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Notion API error", details: errorText }),
      };
    }

    // Erfolgreich
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
