# Release A UX baseline

Date: 2026-08-10

## Scope

Release A establishes authenticated browser coverage and delivers low-risk accessibility, readability, and feedback-language improvements before the dashboard hierarchy changes planned for later releases.

## Supported test states

- Locked login gate
- Authenticated administrator with representative content and schedule data
- Authenticated empty and larger datasets can reuse the same network fixture pattern
- Desktop Chrome, Pixel 7, 768 × 1024 tablet, and 1440 × 900 wide desktop

The authenticated fixture intercepts API requests inside Playwright only. It does not add an application route, environment flag, credential, or production authentication bypass.

## Release A acceptance criteria

- Sortable table headers are native buttons and expose the current direction with `aria-sort`.
- Sort activation works with keyboard input and retains focus.
- Table selection controls have descriptive accessible names.
- User feedback omits decorative emoji, unnecessary exclamation marks, and raw exception details.
- Legacy 9–11px utility text renders at a minimum of 12px.
- Keyboard focus is visibly indicated on interactive elements.
- Locked and authenticated screens pass automated WCAG A/AA checks.
- Authenticated layouts do not create page-level horizontal overflow at configured viewports.
- Lint, unit, API, production build, and end-to-end checks pass.

## Deferred to later releases

- Localized loading and skeleton states
- Mobile navigation redesign
- Dashboard information hierarchy redesign
- Full Viewer and Creator role workflow coverage
- Manual NVDA, VoiceOver, high-contrast, 200%, and 400% zoom verification
