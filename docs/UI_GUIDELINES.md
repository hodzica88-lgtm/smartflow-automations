# SmartFlow UI Guidelines

## Purpose

This document defines the UI and UX principles that shape SmartFlow interfaces.

## Design Principles

- Build mobile-first experiences.
- Keep interfaces clean, uncluttered, and focused on outcomes.
- Use clear visual hierarchy to make status and action items obvious.
- Minimize cognitive load for service-based users.
- Favor clarity over novelty.

## Layout and Navigation

- Use well-defined sections for dashboard metrics, lead lists, and actions.
- Keep primary product actions prominent and easy to access.
- Ensure onboarding is guided and reduces setup friction.
- Use consistent spacing, typography, and card layouts.

## Content and Copy

- Use conversational, user-focused language.
- Keep labels direct and task-oriented.
- Avoid technical terminology in customer-facing screens.
- Use positive confirmation language for successful actions.
- Provide contextual help when needed, but keep it unobtrusive.

## Accessibility

- Ensure all text meets minimum contrast requirements.
- Support keyboard navigation for interactive elements.
- Use semantic HTML and accessible form controls.
- Provide meaningful labels for buttons and links.
- Keep focus states visible and consistent.

## Mobile Behavior

- Design for vertical scrolling and thumb-friendly controls.
- Keep primary actions detectable without deep navigation.
- Ensure dashboard cards and forms resize gracefully.
- Minimize required form fields in onboarding and lead entry.

## Status and Feedback

- Surface critical statuses clearly, such as `new`, `contacted`, `pending`, and `archived`.
- Use color sparingly to indicate actionable priority and alerts.
- Confirm user actions with simple success messages.
- Handle errors with clear remediation suggestions.

## Visual Language

- Use a restrained palette with strong emphasis on readability.
- Keep text legible across viewports and device sizes.
- Use iconography only when it improves comprehension.
- Keep brand identity subtle and product-focused.

## Interaction Patterns

- Keep forms simple and validate input immediately where appropriate.
- Prefer progressive disclosure for advanced settings.
- Group related actions together.
- Avoid deep modal chains; prefer in-page workflows for primary tasks.

## Component Guidance

- Reuse shared UI primitives from `src/shared/ui` whenever possible.
- Keep feature-specific styles encapsulated in feature folders.
- Use CSS modules or scoped styling to avoid global side effects.
- Keep page-level styles limited to layout and spacing.

## Documentation and Design Handoff

- Document UI behaviors and interaction expectations in `docs/UI_GUIDELINES.md`.
- Keep the visual language aligned with product voice and business goals.
- Update guidelines as new interface patterns are introduced.
