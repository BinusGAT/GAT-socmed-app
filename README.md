# GAT ContentManager

GAT ContentManager is a private content operations dashboard for viewing publication performance, planning work, reviewing team memos, and checking analytics in one place. It is built as a focused workspace with a clean top bar, a compact sidebar, and locked sections for sensitive content.

## At A Glance

| Area | Purpose | Notes |
| --- | --- | --- |
| Dashboard | Overview of content performance | Shows summary data in one place |
| Calendar | Planning and schedule view | Useful for timeline-focused work |
| Task List | Task tracking and assignment flow | Appears only when the workspace is unlocked |
| Content Hub | Content records and supporting workflows | Central place for content-related work |
| Meeting Memo | Meeting notes and recaps | Supports date-based editing and review |
| Analytics | Performance reporting and insight | Helps review trends and outcomes |

## Core Experience

The interface is designed to feel immediate and organized:

- The top bar keeps the active section and main actions visible.
- The sidebar makes navigation fast and highlights the current view.
- The date range control lets you narrow what data is shown without leaving the page.
- The dark mode toggle switches the visual theme while staying in the same workspace.
- The refresh action reloads the current data state when you need a clean update.
- The export action lets you download content performance data to Excel.

## Workspace Flow

1. Open the dashboard and review the summary view.
2. Switch to Calendar, Task List, Content Hub, Meeting Memo, or Analytics from the sidebar.
3. Use the date filter to focus on the period you need.
4. Unlock the workspace when you need access to restricted content tools.
5. Export or refresh data from the top bar as needed.

## Interface Details

- Sidebar navigation stays consistent across all views.
- Restricted sections remain hidden until unlock is completed.
- Global banners display success, warning, info, and error messages.
- A loading overlay appears while the dashboard is syncing data.
- Meeting-related screens can open date pickers and modal dialogs for supporting actions.

## Data And Access Behavior

- The app syncs with a backend data source for content, schedule, draft, meeting, and analytics records.
- Sensitive areas stay hidden until the workspace is unlocked.
- A refresh resets the unlock state by design so restricted content is not left open.
- Cached or offline data can keep the dashboard populated when it is available.
