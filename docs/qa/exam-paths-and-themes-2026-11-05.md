# Exam paths and question themes — 5 November 2026

## Reported paths

- `/exam2/:examId/invigilator`
- `/exams/:id/results`
- `/exams/:id/studio`
- Student preview and live attempt question themes

## Findings and changes

1. Studio saved `settings.questionTheme`, but omitted it from its full-screen `StudentPlayer` / `ExamPaper` props. Its compact preview also used only Studio colors. Both previews now receive the selected theme.
2. The shared question stylesheet only changed secondary text for focus and corner rounding for colorful, with no classic variant. All four options now have distinct light and dark tokens. Focus uses monochrome text, strong borders and focus indicators. Classic uses a blue paper palette. Colorful uses green surfaces and larger rounded answer controls. GED retains the existing neutral paper. No generated background imagery is needed for these reading surfaces.
3. The read-only preview endpoint omitted theme metadata. It now returns only `questionTheme` in addition to existing safe metadata, and the preview renders it. Other exam settings remain excluded.
4. The app shell initialized every route at zero opacity and depended on an animation completing to reveal the content. Removed this dependency and the same behavior in the empty Studio editor. The live reported intermittent blank was not conclusively reproduced. This removes a concrete path to invisible content and is tested with animation frames suspended.
5. Exam management routes now have a render-error boundary with retry, reload and a return link. Empty/malformed results and invigilator responses produce recovery states. Access, Studio setup, response review and preview reads have a 20-second timeout and cancel stale requests. Writes and student answer submission are unchanged.
6. The theme selector now has an accessible name and a sample using the same tokens as the student paper. Existing save controls and permission rules remain in place.

## Design reference lock

Targeted repair of existing MRLC exam UI. Preserve the navy/teal shell, IBM Plex question typography, exam content, navigation, owner/editor permissions and save flow.

- Mobbin [Cal.com appearance](https://mobbin.com/screens/f561880a-1845-4179-904d-3c3aa8941090) and [Featurebase theme settings](https://mobbin.com/screens/93d7b140-d287-454a-8ff4-425abab1eb25) show appearance choices beside visual samples. Borrow that structure only, retaining the LMS selector and adding one selected sample.
- Refero [Clearful appearance](https://refero.design/pages/79fefc18-0a0e-4b8f-9767-5663951dd602) distinguishes theme palettes from light/dark modes. Preserve that separation: the exam theme works within the user's light/dark preference.
- Refero mono (`4b3c372c-aff6-4608-bafb-1dde853c4805`) provides monochrome ink/border guidance for the explicitly high-contrast option. Attio (`9f0c028b-6b11-415e-ab92-f32e4597cbe2`) provides restrained surface/interaction roles. Do not import their marketing typography or decorative imagery.
- Impeccable hardening and craft guidance used for visible-by-default rendering, recovery actions, keyboard focus and responsive checks.

## Deployment

Code change only. No database migration. Commit to local main does not deploy the fixes to the live school site.

## Verification

- 84 exam unit tests passed. The preview metadata assertion also confirms unrelated settings are not returned.
- 88 desktop/phone browser checks passed in Brave across Studio, profile navigation and student exam tests.
- New checks cover selecting every theme, save/reload, compact/full previews, dark focus mode, live student focus colors, animation-independent navigation, malformed response recovery, render-error retry and access-request timeout/retry.
- TypeScript and production build passed.
- Desktop light focus/colorful and phone dark focus screenshots reviewed. The old animation-dependent blank could not be tied conclusively to the user's live event. No production records or settings were changed during browser inspection.
