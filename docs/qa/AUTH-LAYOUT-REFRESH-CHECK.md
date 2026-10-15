# Shared authentication layout refresh

15/10/2026. User requested direct redesign of Login/Register/Recover/Google and a better language-switch position. Applied ui-ux workflow to the existing brand/components; reused existing copy and assets, without new wireframes under the user's standing direct-implementation instruction.

## UI

- Shared AuthFrame now has a full-width brand/locale header, outside the marketing/form columns. Locale stays in the upper-right across login, registration, recovery, verification and password reset.
- A single paired panel aligns the story and form. Existing local moodboard photo adds visual context; tablet/mobile stack the panels and remove the decorative photo/detail to prioritize the form.
- Consolidated auth CSS instead of stacking another set of overrides. Tighter form gaps/help text and consistent field/button sizes retain focus/validation affordances.
- Login puts Google before email/password, with a divider and clear account/recovery links. Official Google chooser still initializes only on request; nonce, account linking and consent logic are unchanged. Initial SDK button width fits the available form width.
- Registration Google controls inherit the shared layout; terms/version gate is retained. No new fields, provider configuration or auth API semantics.

## Validation

- FE unit suite: 35/35 PASS (includes separately committed Calendar regression).
- check-stitch-auth: five auth screens at 375/768/1024/1280/1440, register/verification gate, expired/single-use tokens, generic recovery, lost-register/reset response lock, capabilities retry and linked Google login PASS.
- check-auth-locale: VI/EN draft/value preservation, password visibility labels, locale persistence/lang attribute, five English screens/five widths, Google discard/error localization PASS. Repeated with dark colorScheme PASS.
- Browser tests use isolated Mongo/API, fake Google SDK/verifier, no real SMTP/provider delivery. This does not attest a fresh live Google OAuth login or inbox delivery.
- Inspected desktop/mobile login and dark English screenshots under .local/stitch-auth and .local/auth-locale.
- Build/budget PASS: initial423232/425000, gzip132883; largest chunk395860. No budget increase.

## Scope

No business data mutation on dev. Calendar/Inbox data-loss fix is a separate commit and QA note. Full product multi-account write/lost-permission/network acceptance continues after this requested UI repair; this is not final product acceptance or deployment approval.
