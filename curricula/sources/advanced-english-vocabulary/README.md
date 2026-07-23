# Advanced English vocabulary source

The generated advanced Language Quest courses use a ranked selection from
[`Isomorpheuss/advanced-english-vocabulary`](https://github.com/Isomorpheuss/advanced-english-vocabulary)
at upstream commit `7d1bfdb`.

Only individual words, their reported Zipf frequencies, and aggregate list
intersection counts are retained. Definitions come from the LMS's bundled
Princeton WordNet database; definitions from the commercial lists aggregated
by the upstream project are not copied.

To refresh and revalidate the ranked selection:

```bash
git clone --depth 1 https://github.com/Isomorpheuss/advanced-english-vocabulary.git /tmp/advanced-english-vocabulary
ADVANCED_ENGLISH_VOCAB_PATH=/tmp/advanced-english-vocabulary/output/9ormore-withfreqandlistcount-413.csv npm run generate:language-quest-advanced-english
```

Without `ADVANCED_ENGLISH_VOCAB_PATH`, the generator uses the committed
validated selection snapshot.
