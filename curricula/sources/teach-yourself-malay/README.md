# Teach Yourself Malay - MRLC Learning Quest Course

This package converts the user-supplied **Teach Yourself Malay** EPUB into an emoji-free, speaking-first MRLC Learning Quest course.

## Curriculum size

- 17 units: pronunciation foundation plus all 16 source chapters
- 68 lessons
- 408 challenges
- 4 recurring lesson formats per unit: vocabulary, conversation, sentence practice, and daily scenario
- 3 speakable Malay options per challenge
- exactly one correct answer per challenge
- `audioText` supplied for every answer option
- no emojis in course metadata or answer options

## Main files

- `curricula/language-quest/teach-yourself-malay.generated.json` - deployable curriculum
- `languageQuestTeachYourselfMalayCourse.ts` - TypeScript wrapper
- `scripts/generate-language-quest-teach-yourself-malay.mjs` - validator and generator
- `PATCH_EXISTING_FILES.diff` - repository integration patch
- `COURSE_GUIDE.md` - teaching and assessment guide
- `SOURCE_REFERENCE.md` - source and adaptation notes
- `course-content-index.tsv` - all 408 activities for review

The original EPUB is not included in this package.
