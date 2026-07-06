# SPEC-001: Lead Intake

## 1. Feature goal

Provide a short, German-first public inquiry form that captures customer contact details and inquiry intent, creates a tenant-scoped lead in Supabase, and confirms submission without creating appointments.

## 2. Target users

- Local German-first service providers and their customers.
- Business owners in trades such as handymen, electricians, plumbers, HVAC, roofers, auto workshops, barbers, hair salons, and cleaning companies.
- Customers seeking a fast, simple way to request service.

## 3. Public customer form fields

The public form must include the following fields:

- Vorname (first name)
- Nachname (last name)
- Adresse (address)
- Telefon (phone)
- E-Mail (email)
- Anfrage-Typ (inquiry type)
- Beschreibung (description)

## 4. Required fields

- first_name
- last_name
- address
- phone
- email
- inquiry_type

## 5. Optional fields

- description

## 6. Validation rules

- All required fields must be filled.
- `email` must be a valid email address.
- `phone` must include digits and may support common phone formatting.
- `inquiry_type` must be selected from configured inquiry categories.
- `description` may be empty.
- The form must prevent submission when required values are missing or invalid.
- Errors should be shown inline in German.

## 7. Inquiry type options

Inquiry type values should be short, service-focused categories appropriate for local businesses. Example options include:

- Reparatur
- Wartung
- Installation
- Reinigung
- Beratung
- Sonstiges

The exact values should remain simple and relevant to the tenant’s service business.

## 8. Success confirmation text

After successful submission, the customer sees:

"Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns während unserer Geschäftszeiten bei Ihnen."

## 9. Customer confirmation email behavior

- The customer may receive an immediate confirmation email when the feature is enabled.
- The email should confirm receipt of the inquiry and set expectations for a response during business hours.
- The confirmation email must not imply an appointment is booked.

## 10. Business owner notification behavior

- The business owner should be notified of a new lead only during configured business hours by default.
- If the inquiry arrives outside business hours, notification delivery is delayed until the next opening time.
- The lead is still created immediately in Supabase.

## 11. Business hours behavior

- Business hours determine owner notification timing, not lead creation.
- Outside of business hours, the customer still receives the same submission confirmation text.
- Notifications are queued or deferred until business hours resume.

## 12. Supabase table mapping

Map public form fields to the `leads` table as follows:

- `first_name` → `leads.first_name`
- `last_name` → `leads.last_name`
- `address` → `leads.notes` or a dedicated address field if available in the application schema; otherwise `leads.notes` with the address clearly labeled.
- `phone` → `leads.phone`
- `email` → `leads.email`
- `inquiry_type` → `leads.source` or a dedicated inquiry type field if available; if no dedicated field exists, use `leads.source` for inquiry type and add a separate descriptive marker.
- `description` → `leads.notes`
- tenant `company_id` → `leads.company_id`
- `status` → `leads.status` set to `new`
- `priority` → `leads.priority` defaulted to `normal`
- `created_at`, `updated_at` → timestamps managed by Supabase
- `source` → should reflect `web` or `public_form`

## 13. Server/API behavior

- The public form submits to a server-side endpoint or server action.
- The server validates all required fields and the email format.
- The server resolves the tenant context and ensures the lead is created under the correct `company_id`.
- Do not expose Supabase service role keys or tenant scoping details to the client.
- The server returns a success response only after the lead is stored.

## 14. Error handling

- Validation failures should return field-specific German messages.
- Server-side errors should return a generic German error message such as:
  "Beim Absenden Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal."
- The form should not lose already-entered values on recoverable errors.

## 15. Security/RLS considerations

- The public inquiry form is unauthenticated, so tenant mapping must be enforced server-side.
- Do not allow clients to supply arbitrary `company_id` values.
- Store lead data in tenant-scoped tables with RLS protecting internal access.
- Keep email and phone data secure and only exposed to authorized tenant users.

## 16. UI requirements

- The form must feel short and take about two minutes to complete.
- Use German-first labels and button text.
- Indicate required fields clearly with labels or markers.
- Provide a clear submit button and confirmation state.
- Do not include calendars, budgets, payments, file uploads, or customer accounts.
- Keep the design mobile-friendly and uncluttered.

## 17. Out of scope

- Automatic appointment booking.
- Calendar scheduling.
- Payment or quote collection.
- Customer accounts or login.
- File uploads.
- Complex multi-step forms.

## 18. Acceptance criteria

- The public form includes the required fields and optional description.
- Validation prevents submission if required fields are missing or invalid.
- Successful submission creates a `leads` row in Supabase with `company_id` and `status = new`.
- The customer sees the exact confirmation text.
- Business owner notification is delayed outside business hours.
- No appointment is created automatically.

## 19. Future extensions

- Add configurable inquiry type values per tenant.
- Add a dedicated `address` field in the `leads` table.
- Add explicit confirmation email templates.
- Add a business hours configuration interface.
- Add a public inquiry widget for website embedding.
