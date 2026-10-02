# E-library catalogue redesign — 2 October 2026

## Reference lock

Primary: Counterprint via Refero, style `ddfce4fb-080f-4fb7-8302-88e3b7dbab05` (https://www.counter-print.co.uk). Preserve compact, cover-led catalogue grids, restrained controls and readable metadata. Reject oversized marketing headings and rotated, cropped covers.

Secondary: Literal via Refero, style `ab2a33d2-8a04-4cd5-9d63-f629ddcf0940` (https://literal.club). Borrow the reading-progress emphasis and quiet surface hierarchy. MRLC's teal is reserved for actions and reading progress.

Mobbin: https://mobbin.com/screens/90957d45-508a-4e71-8765-eaded9f3e141 — inspected Literal's currently-reading shelf, upright covers and compact book metadata.

React Bits / Pro research: https://www.reactbits.dev/get-started/index and https://pro.reactbits.dev/docs/blocks/showcase/showcase-8. Adapt a horizontal scroll-snap shelf with native controls for continuing reading. Remove the WebGL circular catalogue and implementation-specific labels. No paid source or new dependency used.

## Changes

- Compact E-library heading, real collection counts, direct staff links, search/sort and collection filters.
- Show actual book tiles by default; display 24 titles initially and allow readers to reveal more.
- Keep series grouped inside collections and preserve title/author sorting and search matching.
- Upright, contained covers, modest typography and lightweight hover feedback.
- Smaller responsive book details; preserve read, download, assignment, edit and confirmed deletion actions.
- Delete also removes the book from the local continue-reading shelf.
- Preserve existing upload, import, analytics and reader destinations. These separate screens were not redesigned in this change.

## Verification

TypeScript and production build passed. Desktop/mobile browser checks use mocked library data and cover catalogue loading, author search, collection filters, series expansion, book details, online-only restrictions, edit destination, return to all books, dark-mode overflow and resume-reading navigation. Actual file downloads and production data were not exercised.
