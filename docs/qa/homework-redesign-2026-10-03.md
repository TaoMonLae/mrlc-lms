# Homework workspace redesign — 3 October 2026

## Brief and reference lock

Design for teachers scanning a class roster, reviewing long responses and recording paper work, and students finding and submitting homework. Retain MRLC's navy/teal identity, existing access rules, protected attachment delivery and separate refreshable review routes.

Primary product reference: [Linear issue list and detail view on Refero](https://refero.design/pages/c2cf5972-9d5b-4078-a1fb-09e7b463b7e9). Preserve compact rows, thin separators, text hierarchy and separation of list summaries from full content. Retain the existing LMS color tokens rather than importing another brand's palette.

Secondary references:

- [Plain tasks on Mobbin](https://mobbin.com/screens/defd2114-8885-46fd-964e-796e112c3212): status views above the list and dedicated detail space.
- [Productboard tasks on Mobbin](https://mobbin.com/screens/6ca218fe-d545-49fd-abff-a0032ab03d2a): long descriptions belong in the detail view, not every row.
- Refero style `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6`, [Linear changelog](https://linear.app/changelog): compact type, subtle borders and layered dark surfaces.
- Refero style `64bb1262-e0d5-4ca7-b5fc-9d560bd8a552`, [Udemy](https://www.udemy.com): readable learning content, restrained 8px surfaces and consistent hierarchy.
- [React Bits Animated List](https://reactbits.dev/components/animated-list), including its source: selected-row emphasis. Do not transplant its window-level Tab interception or scroll entrance effects into a grading interface. Existing adapted React Bits AnimatedContent remains in student composition and focus sections, with reduced-motion support.

## Decisions

| Decision | Evidence and purpose |
| --- | --- |
| One short preview per student | User screenshot, Linear and Productboard: prevent essay length from determining row height. |
| Counted status controls | Plain: make pending, marked, returned and missing work immediately discoverable. |
| Scores and feedback in the review route | Linear: focused reading and grading with fewer competing controls. |
| Paper work uses the same review form | Preserve the existing ability to mark students without online submissions. |
| Responsive roster cards | Existing mobile requirements: no wide grading table to pan horizontally. |
| Compact teacher list and student cards | Udemy's content hierarchy, adapted to existing MRLC colors and components. |
| One-line excerpts, full unmodified responses in review | Summarize only presentation; never truncate stored submission text. |

## Implementation and validation

The roster links to review routes for both online and paper submissions. Paper work can be scored and marked; requesting changes requires an existing submission and feedback. Existing failed-save retention, zero-score handling, protected previews, file validation and review-queue advancement remain in place.

No new packages, schema changes or API changes. Browser checks use synthetic student data and an isolated local Vite server; they do not mutate school records.

Validation completed: `npm run lint`, `npm run build`, and 20 Playwright checks across desktop/mobile Chromium passed. The roster regression includes a long essay, full-answer review, status/search reset, paper marking and failed-save retry. Screenshots were visually inspected; capture now uses the normal viewport instead of mutating layout ancestors during navigation.
