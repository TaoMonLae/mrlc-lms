# Word Connect Adventure

## Reference lock

Research inspected actual screens from Refero and Mobbin before implementation. Exact Word Connect/Wordscapes screens were not available in the searches; the references below inform individual interactions, not a copied game.

| Reference | Adopt | Adapt / avoid |
| --- | --- | --- |
| [Duolingo learning path, Mobbin](https://mobbin.com/screens/2656db04-1eb5-4568-9e7d-132256423855) | Winding progression, one obvious next node, muted locked levels | Use MRLC teal/navy/gold; no lives or paywalls |
| [Duolingo desktop, Refero](https://refero.design/pages/940b2f47-08f0-4706-ac0d-b9ffb16a1b7a) | Central path with supporting progress alongside it | Retain the LMS navigation and fonts |
| [Apple News crossword, Mobbin](https://mobbin.com/screens/57fcc0a4-5f6e-4253-ae06-fb09f14c11c6) | Large readable cells and clear selected-word feedback | Letter wheel instead of a full keyboard; no timer pressure |
| [Quartiles tutorial, Refero](https://refero.design/screens/752ee02b-514e-439c-a55d-3f40316ab224) | One concrete visual example and concise instructions | One optional help screen, always available again |
| [Duolingo completion, Refero](https://refero.design/screens/aa871eca-62d2-4e49-bbf2-0ce2c16bd879) | Character celebration, earned result, clear Continue | One completion dialog instead of many reward interstitials |
| [Duolingo lesson flow, Mobbin](https://mobbin.com/flows/706ba483-579e-4628-9903-ba0809870d18) | Immediate feedback and recovery after mistakes | No punishment for experimenting; staged vocabulary hints |

Style anchors: Refero Duolingo style `9457a848-2905-4fe8-bb58-e168049120cf` (tactile buttons, legibility), Wayfinder `168f20ae-b58e-4781-b9b8-46b2d9b81b5f` (nature journey), Quizlet `d6523b05-a53f-4a2a-8829-d65a5c3724e9` (clear learning hierarchy). Original generated mascot: Pip, a teal pangolin explorer; asset `public/games/word-connect/pip.png`.

## Current version

100 puzzles across four 25-level stages, labelled B1, B2, C1 and C2. Every puzzle has a connected crossword, a letter wheel, bonus words, definitions and example sentences. Swipe, tap, or focus the wheel and type; Enter submits, Backspace undoes, Escape clears. Hints progress from meaning to sentence to first letter to answer. Stars reward solving with fewer hints; mistakes carry no penalty. Stage tabs replace the short three-node paths so learners can navigate a long course without scrolling through all 100 levels.

The stage themes follow the [Council of Europe CEFR vocabulary-range descriptors](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4), from familiar topics and a reasonable range at B1 to broad, precise and idiomatic expression at C2. The [English Vocabulary Profile](https://englishprofile.org/?menu=english-vocabulary-profile) attaches levels to particular *meanings* of words. We have not verified each generated word sense against that profile, so the game explicitly describes its stage labels as CEFR-inspired progression rather than certified word-level assignments. Content is built locally from the repository's existing English vocabulary courses and WordNet with `scripts/generate-word-connect-levels.mjs`; its output is `levels.generated.json`. The generator rejects unspellable and disconnected boards, and the unit suite validates all 100.

Pip has seven visual treatments (exploring, thinking, studying, determined, surprised, discovering and cheering). The default treatment rotates across levels; correct, bonus, duplicate and unsuccessful attempts change Pip's reaction immediately. On mobile, Pip's reaction appears before the crossword. Buttons, level tiles and letters use raised shadows with pressed states; keyboard focus remains visible and reduced-motion preferences are respected.

Progress and settings are stored per account in localStorage in this browser, with validation on load. The 100-level course uses a v2 key so obsolete 12-level completions cannot unlock unrelated new puzzles. The old data remains in its v1 key. Progress does not yet sync across devices. Completed levels remain available for reviewing vocabulary; rewards are computed from saved levels so revisiting does not farm stars. School game access and time controls wrap play routes using `WORD_CONNECT`.

## Verification

Unit checks cover solvable crossword layouts, physical letter counts, accepted/bonus/duplicate words, hints, corrupted saves and progression. Browser checks cover touch/keyboard input, saves, completion and mobile layout. No external dictionary/API is necessary for gameplay.
