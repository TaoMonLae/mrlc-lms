# E-Library dark-mode contrast correction

Scope: correct the unreadable catalogue search panel in the user's 2026-09-14 screenshot, preserving the existing layout, typography, cover art, and ReactBits motion.

Reference lock: the existing Counterprint/Literal.club catalogue implementation remains the primary target. Refero's Spotify style (`654d0238-ed16-49d7-b0af-562a3f1b2cd1`, source [Spotify](https://spotify.com)) contributes only its explicit dark-surface/light-text pairing; its fonts, shapes, accents, and marketing components are not adopted. Refero's bundled color guide supplies contrast and semantic-token checks.

| Decision | Evidence and role |
| --- | --- |
| Use existing dark paper/canvas tokens for the search panel and input | Screenshot showed a light panel caused by reusing the inverted text token as a background. |
| Pair primary and muted text with those dark surfaces | Refero dark-surface/foreground roles; preserve the existing MRLC palette. |
| Fix staff action, badge, and collection-hover pairs | Same inverted-foreground failure in adjacent catalogue elements. |
| Leave light mode and content layout unchanged | User asked for a dark-mode contrast fix, not a redesign. |

Verified the actual EbookList component using isolated sample data at desktop and 390px mobile widths. Dark heading contrast: 16.12:1; label: 8.23:1; entered input text: 16.56:1; placeholder: 8.45:1; upload button: 7.16:1; format badge: 16.12:1. These pairs exceed 4.5:1. Mobile content had no horizontal overflow. Visually checked the search panel, entered text, staff rail, and result badge. Switching to light mode retained the original dark panel and dark-on-white input. Added CSS-token contrast regression tests; removed the temporary fixture after validation. No live school data was accessed or changed.
