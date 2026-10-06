---
version: 1
slug: "src-pages-flashcards"
primary_target: "src/pages/flashcards"
related_targets: []
---

# Flashcards surface brief

Scope: src/pages/flashcards (teacher library, deck editor, deck progress; student/teacher study, quiz, match, spelling). Visitor mode: Operate.

Audience and job: teachers build, assign and track decks; students study assigned decks on phones and shared computers, in English, Burmese and Mon. Success: a student opens a deck and is studying within one tap; a teacher sees which decks are unassigned and who is struggling.

Constraints (user-confirmed): keep every route and URL; no server or API changes; keep $...$ math and card images; keep Space to flip and arrow keys to move.

Research: Quizlet set page and completion summary (Refero 24d39a84, e6e6ea86), Quizlet set editor (Refero 268e8595), Babbel review strength filters and match columns (Mobbin), Gemini Notebook flashcard tally controls (Mobbin 34c51558), Uxcel numbered answer keys (Mobbin 24daecd0).

## Direction contract

THESIS: A deck is an index-card register: one card at a time on the stage, every card accounted for in a numbered register below. Refuses the category default of a floating rounded card with gradient chrome and a grid of deck tiles.

OWN-WORLD: Fieldbook as recorded in DESIGN.md: paper ground, white sheet, 1px rules, navy ink, teal for the selected mode and links, gold for the one primary action, coral for "still learning", 4px corners, no shadows, IBM Plex with tabular numerals.

STORY: The student sees the deck, which cards they still need, and studies. After a round they see what to do next. The teacher sees each deck as a register row with its classes and card count, and acts from there.

FIRST VIEWPORT: Shared deck header (back link, deck title, author and subject, mode tabs: Flashcards, Quiz, Match, Spell, with the current one selected in teal). Below, the stage: a large white index card (min 280px tall) with its card number set in the left margin column, flip on click or Space. Under the card, one control bar: previous, "n / total", next, shuffle, restart, and for students two tally buttons, Still learning (coral) and Know it (teal), each with its running count. A 2px progress rule under the bar. Below the fold: the numbered register of all cards with mastery marks and a filter (All, Not known, Known). "Not known" covers still-learning and new cards together, because both are what a student has left to learn (decided at the finish review).

FORM: Index-card register, position 6 of 7 on the ordered list; seed key 5e7f7e25 (degraded roll, no challengers).

Signature move: mastery tally marks in the margin of the register and on the stage counters, the same mark everywhere a card's state appears and nowhere else (deck and student states use a coral-tinted label instead).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
