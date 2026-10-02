# About page redesign — 2 October 2026

## Reference lock
Primary Refero reference: Spacelab (https://spacelab.co.uk), style de162c4d-f3e5-489f-b9eb-ac31b8e0412e. Preserve its restrained sans-serif, photographic emphasis, clear column alignment, flat surfaces and fine rules. Adapt to MRLC's existing navy/teal palette and the user's explicit request for smaller typography: 28–40px heading, 22–28px section headings, 15px body. Reject oversized display type, decorative initials, animated entrances and saturated full-page panels.

Secondary Refero reference: Gustavo Faria (https://gustavo.work), style 14c1ab6c-8462-43a1-a112-af9e07d78085: borrow compact biography / descriptive registry structure only; reject its oversized numerals and distorted portrait treatment.

Mobbin: Codecademy team page https://mobbin.com/screens/4141bdb3-5cc2-4cab-a512-c7743566a963 — inspected its real profile photos, concise role labels and grouped team content. Adapt to a single named developer with biography and source links.

## Decisions
- Retain configurable school identity, location, hero photo and logo fallback.
- Add section jump links and a disclosure for technical foundations; keep all source/license acknowledgements visible.
- Use the verified GitHub avatar from https://api.github.com/users/TaoMonLae (avatar https://avatars.githubusercontent.com/u/46114260?v=4&s=320). Store a local copy to avoid third-party requests on page load.
- Support light/dark themes and narrow screens; no new dependencies.

## Validation
- TypeScript check passed (`npm run lint`).
- Production build passed (`npm run build`); server entry remains 1.75 MiB.
- Two temporary Playwright checks passed on desktop Chromium and iPhone-sized Chromium with mocked auth/settings. Verified 40px headline cap, no document overflow, developer avatar load, section navigation, foundations disclosure and license content.
- Inspected desktop, mobile and dark-mode screenshots. Browser fixtures exercised the school branding fallback; live production classroom-photo configuration was not accessed.
