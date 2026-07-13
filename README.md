# ContentManager

ContentManager is a private content operations dashboard for viewing publication performance, planning work, reviewing team memos, and checking analytics in one place. It is built as a focused workspace with a clean top bar, a compact sidebar, and locked sections for sensitive content.

## At A Glance

| Area | Purpose | Notes |
| --- | --- | --- |
| Dashboard | Overview of content performance | Shows summary data in one place |
| Calendar | Planning and schedule view | Useful for timeline-focused work |
| Task List | Task tracking and assignment flow | Appears only when the workspace is unlocked |
| Content Hub | Content records and supporting workflows | Central place for content-related work |
| Meeting Memo | Meeting notes and recaps | Supports date-based editing and review |
| Analytics | Performance reporting and insight | Helps review trends and outcomes |

## Core Experience & Features

The interface is designed to feel immediate and organized:

- **Default Dark Mode:** The visual theme defaults to Dark Mode on first load, maintaining a sleek, modern visual aesthetic.
- **Top Bar Actions:** Keeps the active page title, search bar, date range filters, notifications (emoji-free, clean Google Material Symbols), and profile avatar settings accessible.
- **Bottom Navigation Tab Bar (Mobile):** Replaces the redundant mobile sidebar burger menu toggle, providing streamlined tab switches on smaller viewports.
- **Sandboxed Calendar Image Export:** Renders and downloads a PNG screenshot of your calendar layout. Runs within an isolated sandboxed iframe and automatically strips unsupported Tailwind CSS v4 color formats (`oklab`/`oklch`) and publication status checkmarks (`task_alt`) for clean exports.

## Workspace Roles & Access

Access is secured via a pin-based lock screen with safe server-side timing verification:

- **Viewer (Passcode: `viewer`):** Has read-only access to the Dashboard and Analytics sections. Restricted sidebar triggers, "+ New Post" FABs, edit icons, and delete buttons are completely hidden.
- **Creator:** Authorized to write/edit/delete scheduled tasks, calendar events, drafts, and meeting memos, but cannot save or delete rows in the master publication database (`laporan`).
- **Admin:** Has full read, write, and delete permissions across all tables and database views.

## Rich Text Formatting & Editor

The Meeting Memo section features a WYSIWYG rich text editor with strict paste safety measures:
- **Paste Sanitization:** Intercepts clipboard events to strip out problematic inline formatting (like black text `color` or `background` properties), ensuring pasted copy automatically inherits the current theme text colors.
- **List Style Restoration:** Integrates custom CSS styling overrides to bypass Tailwind's preflight resets, restoring clear bullet and numbered list layout formatting.
- **Form Simplification:** Hides `Platform` and `Views` input boxes when adding new posts to keep the interface clean, making them visible and editable only during subsequent updates.

## Data & Network Resilience

- **Timeout Safety:** Backend api calls to the database integration have a 30-second request timeout threshold to accommodate slower database syncs.
- **Abort Error Handling:** Intercepts network `AbortError` triggers to present helpful, user-friendly instructions rather than raw console stack traces.
- **Session Locking:** A manual refresh or session timeout resets the unlocked workspace state by design to keep restricted content secure.

