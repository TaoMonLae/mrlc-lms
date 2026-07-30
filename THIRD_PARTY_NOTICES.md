# Third-party notices

## Lingo / duolingo-clone

MRLC Language Quest was informed by the concepts and interface patterns in
[`sanidhyy/duolingo-clone`](https://github.com/sanidhyy/duolingo-clone).
The Spanish Foundations course adapts the Spanish seed curriculum from
[`TaoMonLae/duolingo-clone`](https://github.com/TaoMonLae/duolingo-clone),
including its two-unit lesson structure and vocabulary challenges. The LMS
implementation uses its own Express/Prisma backend, authentication, course
editor, learner UI, progress model, emoji visuals, and browser speech support.

## English word courses

Everyday English Word Quest, Academic English Word Quest, and English Word
Power select terms from [`dwyl/english-words`](https://github.com/dwyl/english-words)
at upstream commit `20f5cc9`. The repository's `LICENSE.md` dedicates its
software to the public domain under the Unlicense, while its README notes that
copyright in the underlying compiled word list remains with its original
source. MRLC includes only a curated 180-word selection. Definitions come from
the separately acknowledged Princeton WordNet database bundled with the LMS.

## Advanced English vocabulary courses

Advanced English: Core, Mastery, and Expert select 180 individual ranked word
entries from
[`Isomorpheuss/advanced-english-vocabulary`](https://github.com/Isomorpheuss/advanced-english-vocabulary)
at upstream commit `7d1bfdb`. That repository does not include a license file
and aggregates several commercial vocabulary lists. MRLC therefore retains
only individual words, frequency values, and aggregate intersection counts;
it does not copy definitions or other expressive content from those lists.
Course definitions come from the separately acknowledged Princeton WordNet
database and MRLC-authored clarifications for ambiguous senses.

## Chinese dictionary

The Chinese-English dictionary feature (in the standalone Dictionary page and
the Language Quest in-lesson lookup tool) is built on
[CC-CEDICT](https://cc-cedict.org), the community-maintained Chinese-English
dictionary published by MDBG and referenced by
[`sotch-pr35mac/syng`](https://github.com/sotch-pr35mac/syng) and most other
open Chinese dictionary software. CC-CEDICT is licensed under a
[Creative Commons Attribution-ShareAlike license](https://creativecommons.org/licenses/by-sa/4.0/):
reuse (including commercial reuse) is permitted with attribution, and any
redistributed/modified copy of the data must carry the same license.

MDBG's own download page for the current CC-CEDICT release prohibits
automated/scripted access, so the snapshot bundled in
`prisma/seed-data/chinese-dictionary.json` was instead pulled via `git clone`
from a public GitHub mirror of the CC-CEDICT text file. That mirror carried a
2013-08-28 snapshot (107,619 entries) rather than the current ~124,700-entry
release — see `prisma/seedChineseDictionary.ts` for details and for how to
reload a fresher export.

## School-provided Mandarin curriculum

The Mandarin Complete Course is generated from `duolingo-chinese.md`, supplied
to the project by its owner. The source file does not include a license notice.
Confirm the curriculum's redistribution rights before distributing it outside
the school's authorized use.

## OpenBMB VoxCPM

Language Quest optionally integrates with
[`OpenBMB/VoxCPM`](https://github.com/OpenBMB/VoxCPM) as a separately installed
multilingual text-to-speech service. VoxCPM and its model weights are not
bundled in this repository. The upstream project is licensed under the
[Apache License 2.0](https://github.com/OpenBMB/VoxCPM/blob/main/LICENSE).

Copyright 2024 OpenBMB

## Linguify CEFR vocabulary courses

English Vocabulary A1: Foundations through English Vocabulary C2: Mastery
adapt the 18 CEFR vocabulary sets from
[`AyeNyeinSan22/linguify`](https://github.com/AyeNyeinSan22/linguify).
MRLC groups the source sets into six level-based courses and converts each
word, definition, example sentence, part of speech, and IPA transcription into
native Language Quest lessons and challenges.

MIT License

Copyright (c) 2026 AyeNyeinSan22

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

MIT License

Copyright (c) 2024 Sanidhya Kumar Verma

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
