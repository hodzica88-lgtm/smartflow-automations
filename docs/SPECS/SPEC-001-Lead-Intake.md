# SPEC-001: Lead Intake

## Purpose

Define how SmartFlow captures customer inquiries and converts them into tenant-scoped leads.

## Target user

- Local service business owners and staff who receive customer inquiries.
- German-first small service businesses that need a simple lead intake process.

## Business rules

- Inquiry forms must remain short and simple.
- Required fields are: first name, last name, address, phone, email, inquiry type.
- Description is optional only.
- SmartFlow focuses on lead intake, not automatic appointment booking.
- The business owner decides whether a lead becomes an appointment or job.

## Required fields

- first name
- last name
- address
- phone
- email
- inquiry type

## Optional fields

- description

## User flow

1. Customer opens the inquiry form.
2. Customer fills required contact and inquiry fields.
3. Customer submits the inquiry.
4. The system creates a new lead scoped to the tenant company.
5. The business receives the lead in the dashboard.

## Database impact

- Create a lead record in `leads` with tenant `company_id`.
- Persist contact fields and inquiry source metadata.
- Record timestamps for `created_at` and `updated_at`.

## Automation impact

- Capture the inquiry source for downstream automations.
- Trigger follow-up reminders or email notifications if configured.
- Ensure tenant isolation in any automation payloads.

## UI requirements

- Keep the form minimal and mobile-friendly.
- Clearly indicate required fields.
- Use German-first labels and copy.
- Provide inline validation for missing required inputs.

## Out of scope

- Automatic appointment booking.
- Complex quoting or pricing workflows.
- Multi-company membership or shared inbox.

## Acceptance criteria

- A lead can be created from an inquiry form using only the required fields plus optional description.
- Invalid or missing required fields prevent submission.
- The lead is stored with `company_id` tenant scope.
- The lead intake flow does not create appointments automatically.
