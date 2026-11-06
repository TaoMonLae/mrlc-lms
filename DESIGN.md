# MRLC LMS — Blue & Slate

Approved direction: Blue & Slate, 5 November 2026. School operations should read as a shared workspace with clear actions and quiet content surfaces. Preserve the school logo, multilingual typography and existing workflows.

## Reference lock

Google for Education (Refero style bf4966c6-7f2f-47a2-ac10-8a496c044d5e) informs white content surfaces, blue interactive emphasis and green success. Linear changelog (11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6) informs layered dark surfaces only. Mobbin Circle and Teachable course dashboards informed restrained shell color and clear content boundaries. Do not borrow marketing typography, imagery or brand marks.

## Color roles

| Role | Light | Dark |
|---|---|---|
| Canvas | #f4f6fa | #101722 |
| Content surface | #ffffff | #192332 |
| Main text | #172438 | #edf2fa |
| Supporting text | #526176 | #afbdd0 |
| Primary action | #2457bd | #a7c5ff |
| On primary | #ffffff | #102341 |
| Selection | #e7efff | #223c60 |
| Navigation | #162b49 | #0d1420 |
| Border | #cbd3df | #46566d |
| Input outline | #8291a6 | #71829b |
| Success | #17714d | #8cdbb0 |
| Warning | #945200 | #f2c16b |
| Destructive | #b42335 | #ffa4ad |

`src/index.css` owns the authoritative light/dark tokens. Primary actions and links are blue; secondary controls are neutral. Gold remains a school-brand accent and warning/category color, not the default action. Status always includes text or an icon, not color alone. Charts retain differentiated categories. Legacy aubergine and academic-teal utilities are compatibility aliases for blue interaction colors.

Use existing IBM Plex Sans / Geist and Myanmar/Mon fallbacks. Preserve readable script metrics. Content boundaries use restrained borders on solid backgrounds; remove decorative ledger stripes. Shared controls follow theme tokens. Exam Studio uses blue actions with white text in both modes; student exam paper themes remain separate and selectable. Games retain their authored artwork and category palettes. Printed documents and signatures preserve their ink colors.

Accessibility: validate body text and button text at 4.5:1 or better, focus and input outlines at 3:1 against adjacent surfaces. Preserve keyboard focus, touch targets, reduced-motion behavior and clear loading/error states.
