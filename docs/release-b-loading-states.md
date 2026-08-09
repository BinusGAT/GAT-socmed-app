# Release B loading and interaction states

Date: 2026-08-10

## Behavior

- Authentication remains a blocking security transition.
- The first authenticated data load uses a structural dashboard skeleton while navigation remains available.
- Manual database synchronization uses a compact, non-blocking status indicator.
- Mutations use a compact workspace status plus a pending state on primary save controls.
- Export exposes its own pending state and ignores repeated activation while running.
- Identical in-flight API requests are coalesced so rapid repeated activation does not duplicate a request.
- Updating regions expose `aria-busy`, status messages use polite live announcements, and motion respects the user's reduced-motion preference.

## Covered primary actions

- Content record save
- Task save
- Calendar task add/save
- Storyboard draft save
- Meeting memo save
- Database sync
- Database export

## Verification targets

- The authenticated shell stays visible during routine work.
- Initial loading does not cause a large layout jump.
- Pending controls cannot be submitted again until the operation completes.
- Identical API requests share one in-flight promise.
- Loading status remains understandable to screen readers.
