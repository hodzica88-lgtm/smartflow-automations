# SPEC-005: Dashboard

## 1. Purpose

Define the first SmartFlow dashboard for local service businesses, focused on incoming inquiries, lead status visibility, and fast manual decision-making.

## 2. Target user

- Business owners and staff who need a quick operational snapshot of new and active leads.
- German-first local service companies that want a simple inquiry control center.
- Teams that need to identify what requires action without a full CRM.

## 3. Dashboard goal

- Surface new and unhandled leads immediately.
- Show current lead status distribution and pending actions.
- Provide one-click access to lead details and follow-up workflows.
- Keep the experience simple, mobile-friendly, and action-oriented.

## 4. Main dashboard sections

The dashboard must include these sections:

- Summary cards for key lead counts.
- A prioritized lead list of recent or urgent inquiries.
- Status filters for the four allowed lead states.
- Notification indicators for unread or unhandled items.
- Recommended next actions or quick links.

## 5. Lead overview cards

The dashboard should display compact overview cards for:

- `Neue Anfragen` — count of leads with status `new`.
- `Kontakt aufgenommen` — count of leads with status `contacted`.
- `Erfolgreich` — count of leads with status `successful`.
- `Nicht erfolgreich` — count of leads with status `unsuccessful`.
- Optional: `Erinnerungen` — count of pending reminders.

Card behavior:

- Cards must be tenant-scoped.
- Each card should link to the filtered lead list for that status.
- New lead count should be visually prominent.
- Use a simple German label and status color or badge.

## 6. Lead list behavior

- Show the most recent leads in a compact, scan-friendly list.
- Each row should show customer name, phone/email, inquiry source/type, status, and created date.
- Prioritize `new` leads at the top by default.
- Display a status badge for each lead.
- Clicking a row opens the lead detail page.
- Keep the list minimal with one click to open and one more click to act.
- Include a text snippet or icon for notes if the lead has commentary.

## 7. Status filters

- Provide filters for the four allowed statuses:
  - `new`
  - `contacted`
  - `successful`
  - `unsuccessful`
- The dashboard should let users filter the lead list by one or more statuses.
- The default filter should show `new` and `contacted` leads as the most actionable subset.
- Status filters should be clearly labeled in German.
- Do not add additional lead statuses or pipeline stages.

## 8. Notification indicators

- Show a clear indicator when there are new leads that were not yet opened or acted on.
- Use the dashboard to highlight the count of unhandled `new` leads.
- If reminders are pending, display a separate reminder indicator.
- Indicators should be visible without cluttering the dashboard.
- Avoid suggesting automatic actions; indicators simply direct the user to leads and reminders.

## 9. Empty states

- If no leads exist, show a friendly German message explaining the dashboard is waiting for new inquiries.
- If no `new` leads exist, show a message like "Keine neuen Anfragen. Hier erscheinen neue Kundenanfragen, sobald sie eingehen."
- If a filtered status has no results, show a simple message and a link to view all leads.
- Provide guidance on the next action, such as "Gehe zur Lead-Übersicht" or "Erstelle eine Erinnerung".

## 10. Loading/error states

- Show a loading skeleton or spinner while dashboard data is fetched.
- Display a German error message if the dashboard fails to load, such as "Dashboard-Daten konnten nicht geladen werden. Bitte Seite neu laden."
- Allow the user to retry data loading.
- Keep error state simple and avoid technical details.

## 11. Database mapping

- Read lead counts and list items from `leads` scoped by `company_id`.
- Use `leads.status` for the four dashboard statuses.
- Use `leads.created_at` for ordering and recency.
- Use `leads.updated_at` or `leads.last_contacted_at` to surface recent activity.
- Use `activities` or `reminders` counts where pending reminders are shown.
- The dashboard should not require new tables; it should use existing `leads`, `activities`, and tenant `settings` or `companies` data.

## 12. UI requirements

- The dashboard must be simple and German-first.
- Use a responsive layout for both desktop and mobile.
- Keep cards and lists uncluttered with strong visual hierarchy.
- Use status badges and clear labels.
- Avoid large charts, analytics panels, or CRM-style dashboards.
- Make the most common action (review new leads) easy to complete in two clicks.
- Ensure the interface is readable in German and uses familiar service-business language.

## 13. Out of scope

- Appointment booking or scheduling.
- Complex analytics, revenue forecasting, or full CRM dashboards.
- Custom widgets or configurable dashboard layouts.
- Multi-company dashboards or shared inbox views.
- Deep drill-down reports beyond current lead and reminder visibility.

## 14. Acceptance criteria

- The dashboard shows tenant-specific lead counts for `new`, `contacted`, `successful`, and `unsuccessful`.
- The dashboard shows a compact, prioritized list of recent leads.
- The dashboard supports filters for the four allowed lead statuses.
- New lead indicators clearly highlight unhandled leads.
- Empty and loading states are user-friendly and German-first.
- The dashboard remains simple, mobile-friendly, and action-focused.
- The dashboard does not introduce additional lead statuses or appointment booking workflows.
