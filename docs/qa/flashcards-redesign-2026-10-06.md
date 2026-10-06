# Flashcards audit and redesign — 6 October 2026

The flashcards module was audited with Impeccable and rebuilt as an **index-card register** inside the School Operations Fieldbook system. Routes, the API, `$...$` math, card images and the Space/arrow shortcuts are unchanged.

## Audit before the redesign

| # | Dimension | Before | After | Key finding (before) |
|---|---|---|---|---|
| 1 | Accessibility | 1 | 4 | The flip card's `aria-label="Flip card"` replaced its content, so screen readers never heard the term; both faces were in the DOM, so the hidden answer could be read out early. No live feedback in quiz, match or spelling; card fields had placeholders but no labels. |
| 2 | Performance | 2 | 4 | An animated canvas border (`ElectricBorder`) ran continuously around the study card. |
| 3 | Responsive | 2 | 3 | 28px action buttons; a 4-column shuffled match grid with long definitions on phones. |
| 4 | Theming | 2 | 4 | Purple glow and aubergine fills outside the Fieldbook palette; emerald/rose/amber states. |
| 5 | Implementation integrity | 2 | 4 | Seven pages each re-implemented loading, errors and mode links; failed loads showed "No decks yet"; `window.confirm` for delete. |
| | **Total** | **9/20 (Poor)** | **19/20 (Excellent)** | |

Dev-only bug also fixed: opening `/flashcards` in development returned the source of `flashcards.ts` instead of the page, because Vite resolved the URL to the root module. `server.ts` now serves the app shell for browser navigations before Vite runs.

## What changed

- **One deck page for every mode.** `DeckShell` gives Flashcards, Quiz, Match and Spell the same header, back link and mode tabs, with the current mode selected in teal.
- **Study stage.** A white index card with its number in a ledger margin, flip on click or Space (cross-fade under reduced motion), one control bar (previous, n / total, next, shuffle, restart) and, for students, **Still learning** and **Know it** buttons that keep a running tally.
- **Card register.** Every card listed below the stage with its number and mastery mark, filterable by All / Not known / Known; selecting a row jumps the stage to that card.
- **Tally mark.** One mark for card state everywhere it appears: teal = known, coral = still learning, rule = new. Large decks collapse it into a proportional bar.
- **Quiz.** Numbered answers with keys 1–4, a check or cross on the answer itself, spoken feedback through a live region, and focus moved to Next.
- **Match.** Terms and definitions in two columns instead of a shuffled grid, so long definitions stay readable on a phone; matched pairs stay in place with a teal mark.
- **Spelling.** Starts on a tap (browsers block speech until a user gesture), with a setting to turn read-aloud off; the student's attempt stays readable after checking.
- **Results.** One summary for all three modes: score line, next steps first, then the items to review with math rendered.
- **Teacher library.** A ruled table (deck, cards, classes, updated) with search, an "isn't assigned" notice, Preview/Progress buttons and a menu for edit, export and delete; delete uses a dialog that says what will be lost.
- **Editor.** Numbered card rows with labelled Term, Definition and Image fields, a dashed "Add card" row and a sticky save bar showing how many cards are ready and how many classes will see the deck.
- **Progress.** A one-line summary, a sortable table with each student's tally, best scores per mode and a "Not started" label.
- **States.** Skeletons while loading and a retry panel when a request fails, everywhere.

## References

Researched before building: Quizlet's set page, completion summary and set editor ([Refero](https://refero.design/pages/24d39a84-605a-4348-a9fb-75dc092fc299), [summary](https://refero.design/pages/e6e6ea86-3206-4a8c-ab6e-9fdaaf736372), [editor](https://refero.design/pages/268e8595-522e-4e33-9334-e7ae5188fa1f)); Babbel's review strength filters and match columns, Gemini Notebook's flashcard tally controls and Uxcel's numbered answers ([Mobbin](https://mobbin.com/screens/34c51558-a1fa-4db3-a2c6-2ec7ef560b06)).

## Verification

- TypeScript passes; Impeccable detector reports no findings on `src/pages/flashcards`; icon-button label check passes.
- Axe WCAG 2.1 AA scans of all eight screens (student decks, study, quiz, match, spelling; teacher library, editor, progress) in light and dark: no violations.
- Captured at 1440 and 390 wide in light and dark. An independent Impeccable finish review returned **ship** after two fix rounds (all eight material findings resolved).
- Not covered: Burmese and Mon rendering of this surface was not captured, and no real-device touch testing was done.
