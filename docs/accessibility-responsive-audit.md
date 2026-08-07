# Accessibility and responsive-browser audit

Audit date: 2026-08-08  
Target: production build of the GAT dashboard  
Standard: WCAG 2.1 Level A and AA automated rules, supplemented by keyboard, landmark, responsive overflow, and source-structure review

## Scope

The authenticated application is protected by organization credentials. Runtime testing therefore covers the complete unauthenticated login gate. The authenticated shell was reviewed statically for landmark, navigation-state, skip-link, and live-region behavior. Authenticated workflows require a dedicated non-production test account before their data-dependent states can receive equivalent automated coverage.

## Browser and viewport matrix

| Profile | Viewport | Engine | Checks |
| --- | --- | --- | --- |
| Mobile | Pixel 7 preset | Chromium | WCAG A/AA, keyboard order, horizontal overflow, control visibility, security headers |
| Tablet | 768 × 1024 | Chromium | WCAG A/AA, keyboard order, horizontal overflow, control visibility, security headers |
| Desktop | Desktop Chrome preset | Chromium | WCAG A/AA, keyboard order, horizontal overflow, control visibility, security headers |
| Wide desktop | 1440 × 900 | Chromium | WCAG A/AA, keyboard order, horizontal overflow, control visibility, security headers |

## Findings and remediation

| Severity | Finding | Resolution |
| --- | --- | --- |
| Serious | Login button contrast was 4.46:1, below the required 4.5:1 ratio. | Changed the button background to `#4f46e5`, retaining white text and providing compliant contrast. |
| Moderate | The locked screen lacked a main landmark and used a level-two heading as its page heading. | Added a `main` landmark and promoted the gate heading to `h1`. |
| Moderate | Authentication and lockdown errors were not guaranteed to be announced. | Added assertive `role="alert"` live regions and hid decorative icons from assistive technology. |
| Moderate | The authenticated shell had no keyboard bypass for repeated navigation. | Added a focus-visible “Skip to main content” link and a focusable main target. |
| Minor | Mobile navigation did not expose its purpose or current item programmatically. | Added an accessible navigation label and `aria-current="page"`. |
| Minor | The email field prevented useful credential-manager semantics. | Changed autocomplete metadata to `username`. |

## Verification results

- Automated Axe scan: no detected WCAG 2.1 A or AA violations in the tested login gate.
- Keyboard: email → NIM → Clear → Login focus order is logical in every configured viewport.
- Responsive layout: no horizontal document overflow in any configured viewport.
- Controls: login inputs and actions remain visible and operable at mobile, tablet, desktop, and wide-desktop widths.
- Browser console: no same-origin application errors during the tested flow.
- Security policy: CSP, framing protection, MIME sniffing protection, referrer policy, and permissions policy are present in production responses.

## Remaining manual work

- Repeat Axe, keyboard, zoom, screen-reader, and responsive checks after authentication using a dedicated test account and non-production data.
- Manually verify modal focus trapping, focus restoration, table navigation, chart alternatives, and announcement of asynchronous save/delete results.
- Test at 200% and 400% browser zoom across authenticated dashboard views.
- Validate Windows High Contrast Mode, VoiceOver/Safari, NVDA/Firefox, and reduced-motion behavior.

