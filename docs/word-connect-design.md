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

## First version

12 curated puzzles across four destinations. Every puzzle has a connected crossword, a letter wheel, curated bonus words, definitions and example sentences. Swipe, tap, or focus the wheel and type; Enter submits, Backspace undoes, Escape clears. Hints progress from meaning to sentence to first letter to answer. Stars reward solving with fewer hints; mistakes carry no penalty.

Progress and settings are stored per account in localStorage in this browser, with validation on load. They do not yet sync across devices. Completed levels remain available for reviewing vocabulary; rewards are computed from saved levels so revisiting does not farm stars. School game access and time controls wrap play routes using `WORD_CONNECT`.

## Verification

Unit checks cover solvable crossword layouts, physical letter counts, accepted/bonus/duplicate words, hints, corrupted saves and progression. Browser checks cover touch/keyboard input, saves, completion and mobile layout. No external dictionary/API is necessary for gameplay.
