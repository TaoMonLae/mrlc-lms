# English words source

The generated Learning Quest English vocabulary courses select words from
[`dwyl/english-words`](https://github.com/dwyl/english-words), validated against
`words_alpha.txt` from upstream commit `20f5cc9`.

The full 370,105-word source list is intentionally not vendored into this LMS.
To revalidate the curated selection while regenerating the courses:

```bash
git clone --depth 1 https://github.com/dwyl/english-words.git /tmp/english-words
ENGLISH_WORDS_ALPHA_PATH=/tmp/english-words/words_alpha.txt npm run generate:language-quest-english-words
```

Without `ENGLISH_WORDS_ALPHA_PATH`, the generator uses the selection already
validated and stored in its course specification. Definitions come from the
LMS's bundled Princeton WordNet database.
