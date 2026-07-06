# SPEC-004: Automation Rules

## 1. Purpose

Define how SmartFlow automations execute around lead intake, owner notifications, customer confirmations, and integration with Make.com and Brevo, while preserving tenant isolation and preventing automated appointment booking.

## 2. Target user

- Tenant administrators who configure and monitor automation behavior.
- Business owners and staff who rely on timely lead notifications and confirmations.
- Operations users who need predictable Make.com and Brevo integration rules.

## 3. Automation principles

- Every submitted inquiry must be stored in the tenant’s Supabase lead table before any automation executes.
- Automations must be explicit, predictable, and transparent to the tenant.
- No automation may book appointments or make qualification decisions automatically.
- Business owner notifications respect configured business hours by default.
- Customer confirmation is immediate after successful form submission.
- Make.com is the orchestration layer for automation workflows.
- Brevo is the email delivery provider.
- Supabase service role keys must never be exposed to the client.
- Tenant data must always be scoped by `company_id`.

## 4. Lead intake automation flow

1. Customer submits the public lead intake form.
2. Server-side logic validates the inquiry and creates the lead record in Supabase.
3. After the lead is successfully stored, trigger automation logic.
4. Immediately send a customer confirmation email or notification if configured.
5. Evaluate tenant business hours for owner notification.
6. Trigger a business owner notification workflow via Make.com when allowed.
7. Record automation metadata and the lead creation event for audit.

## 5. Customer confirmation rules

- The customer confirmation must occur immediately after the lead is stored.
- The confirmation is not dependent on business hours.
- The confirmation may be an email or a simple on-screen message, depending on tenant configuration.
- If email confirmations are enabled, send through Brevo.
- The confirmation must state receipt of the inquiry and set expectations for a later response.
- The confirmation must not imply an appointment has been booked.

## 6. Business owner notification rules

- Business owner notifications are separate from customer confirmations.
- By default, owner notifications are delayed outside business hours.
- Owner notifications are delivered via Make.com workflows.
- The notification payload includes only tenant-scoped lead data and delivery metadata.
- The owner notification must not include service role keys or client-exposed credentials.
- Notification channels may include email (Brevo) and any tenant-configured Make.com destination.
- The automation must support both immediate and delayed owner notification based on business hours.

## 7. Business hours behavior

- Business hours determine when owner notifications are allowed, not whether the lead is created.
- If a lead arrives during business hours, owner notification executes immediately.
- If a lead arrives outside business hours, owner notification is delayed until the next configured opening window.
- The lead remains visible in the tenant dashboard immediately, even if owner notification is delayed.
- If business hours are not configured, default to immediate owner notification.
- Business hours configuration should be tenant-specific and stored with the company.

## 8. Delayed notification behavior

- When outside business hours, enqueue the owner notification for the next opening time.
- The system should persist the delay decision in tenant-scoped automation state or metadata.
- The delayed notification is triggered automatically when business hours resume.
- If the tenant changes business hours while a notification is delayed, use the updated hours to determine the next delivery time.
- The delay should not block customer confirmation nor lead creation.
- If owner notification fails after the business hours window opens, retry according to default Make.com retry behavior and log the failure.

## 9. Make.com integration rules

- Make.com orchestrates external automation workflows for notifications, reminders, and other non-core actions.
- Use Make.com only after the lead is stored in Supabase.
- Automation trigger payloads must include `company_id`, lead identifiers, lead status, and relevant tenant metadata.
- Keep tenant data minimal: do not send unnecessary PII beyond what is needed for notification or follow-up.
- Use Make.com scenarios for:
  - owner notification delivery
  - sending emails through Brevo when configured
  - downstream reminders or follow-up actions
- Do not use Make.com for appointment booking or automatic qualification.
- Make.com workflows may be tenant-enabled or tenant-disabled based on settings.

## 10. Brevo/email rules

- Brevo is the email provider for customer confirmations and owner notifications when email is used.
- Email templates should be defined in tenant settings or default German-first templates.
- Customer confirmation emails must reference the inquiry receipt and expected response timing.
- Owner notification emails must reference a new lead and include a direct link to the lead detail view.
- Keep email content concise and avoid implying appointments or automatic decisions.
- Use transactional email sending through secure server-side integration.
- Do not expose Brevo API credentials to the client.

## 11. Error handling

- If lead creation fails, the automation stops and returns a server-side error.
- If customer confirmation fails after lead creation, log the failure and surface a tenant-visible error if appropriate, but the lead remains stored.
- If owner notification fails, record the failure and allow retry via Make.com or tenant automation logs.
- If a delayed notification cannot be scheduled because business hours are misconfigured, log the issue and notify the tenant administrator.
- Provide German-first error messages for tenant-facing automation failures.
- Do not retry indefinitely without logging and surface status to the tenant.

## 12. Database mapping

- `leads` stores the incoming lead and is the first point of persistence.
- `leads.company_id` enforces tenant scope.
- `leads.source` or dedicated inquiry type data identifies the intake source.
- `companies.business_hours` stores the tenant’s business hours configuration.
- `settings` may store automation flags such as `brevo_enabled`, `make_enabled`, and owner notification preferences.
- `activities` or another metadata table may store automation events, notification scheduling, and status change history.
- Automation payloads should reference lead IDs and `company_id`, never raw credentials.
- Any automation state or delayed notification schedule must be tenant-scoped.

## 13. Security rules

- Never expose Supabase service role keys or Brevo API secrets to the client.
- All automation triggers must execute server-side or within a secure automation layer.
- Tenant isolation must be enforced by `company_id` on every automation payload and database lookup.
- Do not allow the client to pass `company_id` directly for automation execution.
- Use server-side validation of tenant context before triggering Make.com or Brevo.
- Ensure email and notification payloads include only necessary data.

## 14. Out of scope

- Automatic appointment booking.
- Automatic customer qualification decisions.
- Emergency or escalation mode.
- WhatsApp behavior outside future/out-of-scope planning.
- Custom workflow builders or per-tenant automation editors.
- Complex orchestration beyond the lead intake notification path.

## 15. Acceptance criteria

- Leads are stored before any automation runs.
- Customer confirmation occurs immediately after successful lead storage.
- Business owner notifications are delayed outside business hours and executed at the next opening window.
- Make.com is used for workflow orchestration, and Brevo is used for email delivery.
- No automated appointment booking or customer qualification occurs.
- Supabase service role keys and Brevo secrets are not exposed to the client.
- Tenant isolation is preserved across all automation payloads.
