# MRLC Newsroom redesign

Build target: the existing LMS shell and its editorial design direction, adapted to news discovery and classroom reading.

## Reference lock and decision ledger

| Decision | Reference | Bounded role |
| --- | --- | --- |
| White publication canvas, serif story headings and article text, sans-serif controls | Monocle, Refero style `01655bce-6b25-4a67-81a5-b204d1e75e83` | Primary style. Georgia is its documented Plantin substitute; yellow `#ffc500` is reserved for actions and active navigation. |
| Square surfaces, structural rules, no card shadows | Nofilter.space, style `d2639b27-614d-45cf-b048-6bb76e67159e` | Section framing only; it does not override Monocle's typography. |
| Lead story alongside compact briefing, then archive | Washington Post, screen `ecb72678-40f8-4648-a892-b73939c3c3d4` | Story hierarchy; no copied branding, trending claims or popularity rankings. |
| Compact source/date metadata and persistent view choices | Matter, screen `6bbceb08-8d22-494f-afaa-9c739df47a6a` | Feed controls and scanning behavior. |
| Brief entrance of the first story section | Existing ReactBits AnimatedContent | 14px / 450ms reveal within the application scroll container; existing reduced-motion fallback. |
| Publisher images and graceful image failures | Source data and Refero imagery guidance | Fixed media dimensions in the feed; unavailable reader images collapse. No generated depictions of news events. |
| Text sizing, dictionary selection, homework handoff | Existing MRLC learning workflow | Learning tools beside article text, with compact mobile controls. |

NEON Rated was also reviewed and rejected as the foundation: cinematic full-bleed media and theatrical type would obscure the school feed's source context.

## Behavior

Topic, submitted search, and grid/list view are encoded in the URL. Returning from an article restores those choices. Draft search text cannot change pagination until submitted. Stale responses are ignored, and appended articles are deduplicated. Full content remains sanitized with DOMPurify; summaries link to the credited original publisher.

## Verification

Actual React pages rendered using an isolated temporary preview with sample API responses, not a static HTML reconstruction. Checked at 1440px and 390px, including dark mode, full article, summary, missing/broken images, grid/list, topic filters, submitted search, pagination, return navigation, empty and failed loads, text sizing, and word-definition dialog. The temporary preview is removed before delivery. Live publisher feeds and authenticated production sessions were not exercised in this pass.
