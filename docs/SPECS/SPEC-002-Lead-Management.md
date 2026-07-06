# SPEC-002: Lead Management

## 1. Purpose

Define how SmartFlow manages each lead after intake, keeps the workflow lean, and enables the business owner to manually contact the customer and decide whether the inquiry becomes successful or unsuccessful.

## 2. Target user

- Local German-first service business owners and team members who process inbound leads.
- Small service-business staff who need a simple lead board, clear status, and quick follow-up actions.

## 3. Lead list behavior

- Show inbound leads in a single tenant-scoped list filtered to the current company.
- Display the most important fields in the list: customer name, phone, email, inquiry type/source, status, created date, and last contacted date.
- Support quick filtering by the four main states: `new`, `contacted`, `successful`, `unsuccessful`.
- Allow sorting by newest first and by status.
- Provide a clear badge or label for each lead state.
- Clicking a lead opens the detail view.
- Keep the list interface minimal: one click to open, one click to change status from the detail view.

## 4. Lead detail behavior

- Show all intake and contact details from the original inquiry.
- Show the current lead state and any selected outcome immediately at the top.
- Include the inquiry description, source, and any assigned user.
- Provide direct controls to:
  - mark the lead as `contacted`
  - mark the lead as `successful` and select a successful outcome
  - mark the lead as `unsuccessful` and select an unsuccessful outcome
  - add notes or history entries
  - create follow-up activities or reminders
- Display a chronological activity/history timeline for this lead.
- Do not show appointment booking controls in the lead detail view.

## 5. Lead status rules

- The allowed lead states are exactly:
  - `new`
  - `contacted`
  - `successful`
  - `unsuccessful`
- `new` is the default status when the lead is created.
- `contacted` means the business has attempted or completed first contact with the customer.
- `successful` means the inquiry has been converted to a positive business outcome.
- `unsuccessful` means the inquiry did not convert to a positive business outcome.
- Status changes must be explicit and manual.
- Status may move forward from `new` to `contacted` to either `successful` or `unsuccessful`.
- Status may also move directly from `new` to `successful` or `unsuccessful` when the business owner decides immediately.
- No automatic status transitions are allowed.

## 6. Successful outcome rules

- Successful outcomes are a separate category attached to `successful` leads.
- Allowed successful outcomes are exactly:
  - `appointment_scheduled`
  - `offer_created`
  - `job_won`
- Selecting a successful outcome is required when a lead status is set to `successful`.
- `appointment_scheduled` means the business has agreed to schedule an appointment, not that SmartFlow booked it automatically.
- `offer_created` means the business has prepared a quote or offer document.
- `job_won` means the customer accepted the work and the lead is now a won opportunity.
- The UI should show the chosen successful outcome clearly on the lead detail.

## 7. Unsuccessful outcome rules

- Unsuccessful outcomes are a separate category attached to `unsuccessful` leads.
- Allowed unsuccessful outcomes are exactly:
  - `price_comparison`
  - `no_interest`
  - `unreachable`
  - `outside_service_area`
  - `too_expensive`
  - `other`
- Selecting an unsuccessful outcome is required when a lead status is set to `unsuccessful`.
- `price_comparison` means the customer is comparing quotes.
- `no_interest` means the customer no longer wants the service.
- `unreachable` means the customer could not be reached after a reasonable number of attempts.
- `outside_service_area` means the customer request falls outside the tenant’s service area.
- `too_expensive` means the price was not acceptable.
- `other` is a catch-all for any valid business reason not covered by the other categories.
- The chosen unsuccessful outcome should be stored and visible on the detail view.

## 8. Required lead actions

The interface must support these required actions for each lead:

- Review the inquiry details.
- Contact the customer manually by phone or email.
- Mark the lead as `contacted` after the first contact attempt.
- Choose either `successful` or `unsuccessful` when a final decision is made.
- Record the selected successful or unsuccessful outcome.
- Add notes or activity entries describing the contact or next steps.
- Optionally assign a user to the lead if tenant teams are used.

## 9. Activity/history behavior

- Every lead detail view includes an activity/history timeline.
- The timeline records at minimum:
  - lead creation
  - status changes
  - selected outcome changes
  - notes added
  - contact attempts and follow-up activities
- Each entry should include timestamp, user, action, and optional comment text.
- The timeline must be ordered newest first or clearly show chronology.
- Activity entries should be easy to add from the lead detail page without deep navigation.
- History is read-only except for adding new entries and editing notes if allowed by the tenant.

## 10. Database mapping

Map lead management behavior to Supabase tables as follows:

- `leads.status` stores the main lead state: `new`, `contacted`, `successful`, `unsuccessful`.
- `leads.company_id` keeps the tenant scope.
- `leads.assigned_user_id` optionally stores the owner assigned to the lead.
- `leads.first_name`, `leads.last_name`, `leads.email`, `leads.phone`, `leads.notes` store intake contact details and free-form notes.
- `leads.source` stores inquiry type or public form source metadata.
- `leads.created_at` and `leads.updated_at` track creation and modifications.
- If a dedicated outcome field is added, store successful and unsuccessful outcome categories in that field (e.g. `leads.outcome` or `leads.result`).
- If no dedicated outcome field exists yet, persist the selected outcome value in a constrained metadata field or in structured notes with explicit labeling.
- `activities` stores follow-up actions and timeline entries with `activity_type`, `details`, `lead_id`, `company_id`, `assigned_user_id`, `created_at`, and `updated_at`.
- `leads.last_contacted_at` is updated whenever the business records first contact or a meaningful follow-up attempt.

## 11. UI requirements

- Use German-first labels and status text.
- Keep the lead list and detail screens uncluttered.
- Display a concise summary card on lead detail containing contact data, inquiry source, and current status/outcome.
- Use a simple status panel with discrete buttons or dropdowns for: `Kontakt aufgenommen`, `Erfolgreich`, `Nicht erfolgreich`.
- When `successful` or `unsuccessful` is selected, immediately require choosing a specific outcome.
- Keep clicks minimal: the most common path should be open lead → update status/outcome → save.
- Show validation messages in German.
- Do not include appointment scheduling controls anywhere in the lead management UI.

## 12. Validation rules

- A lead must always have one of the main statuses: `new`, `contacted`, `successful`, or `unsuccessful`.
- `successful` leads must include one of the successful outcome values.
- `unsuccessful` leads must include one of the unsuccessful outcome values.
- `contacted` leads may remain without an outcome until final decision.
- `new` leads must preserve intake contact details.
- `last_contacted_at` should be updated only when a user explicitly records contact or follow-up.
- Status and outcome changes should only be allowed from the detail view and must be validated server-side.
- The UI should show a German error if required outcome selection is missing.

## 13. Out of scope

- Automatic appointment booking.
- Any workflow that expands the lead pipeline beyond the four core states.
- Pricing, quoting, or billing automation beyond recording the selected successful outcome `offer_created`.
- Embedded customer self-service portals or customer accounts.
- External CRM sync or multi-company shared inbox functionality.
- Complex sales forecasting or revenue pipeline reporting.

## 14. Acceptance criteria

- The tenant lead board displays all leads and supports filtering by `new`, `contacted`, `successful`, and `unsuccessful`.
- A lead detail page shows inquiry details, current status, and status-specific outcome.
- Status changes are explicit, manual, and do not create appointments automatically.
- `successful` status requires one of: `appointment_scheduled`, `offer_created`, `job_won`.
- `unsuccessful` status requires one of: `price_comparison`, `no_interest`, `unreachable`, `outside_service_area`, `too_expensive`, `other`.
- Lead activity/history records are visible in the detail view.
- All lead data remains tenant-scoped through `company_id`.
- The UI is simple, German-first, and supports minimal clicks for the common lead management path.
