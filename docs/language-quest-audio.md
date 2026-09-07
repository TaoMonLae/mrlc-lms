# Saved language-course audio

The current selection is **published English courses, vocabulary only**. Malay,
Chinese, subject courses, question narration and stories are outside this batch.

Course recordings live in `data/language-quest-audio/`. Keep this directory in
local backups. It is ignored by Git and is not a public static directory. The
authenticated lesson and final-exam endpoints serve recordings from disk.
Playback never calls ElevenLabs and works without its API key. Missing clips
use the existing local Kokoro service when configured, or browser speech.
Final-exam dictation is eligible only when its protected recording is available
or local Kokoro supports its language.

## Generate only missing English vocabulary

Place `ELEVENLABS_API_KEY` in `.env.local` (not in frontend variables). The batch
script needs Text to Speech access and User: Read to check included credits.
Optional `ELEVENLABS_VOICE_ENGLISH` overrides the default Alice educator voice.
The model is `eleven_flash_v2_5`, with speed 0.9. Existing recordings are kept
even if voice settings later change; rerunning does not replace or repay them.

Preview the current published database content without generating audio:

```sh
node --import tsx scripts/generate-language-quest-audio.ts --language English --vocabulary-only
```

After checking the displayed selection and estimated credit usage:

```sh
node --import tsx scripts/generate-language-quest-audio.ts --language English --vocabulary-only --generate
```

`--snapshot path/to/courses.json` uses a saved course snapshot instead of querying
the database. `--limit N` limits the run to N missing recordings. Course text is
normalized and deduplicated across courses; recordings have hashed filenames.
Each completed MP3 and index update is saved atomically. `plan.json` records the
selected text and estimated cost; `last-run.json` records the latest result.
Provider credit reporting may be delayed immediately after a run.

The generator checks that the selection fits the remaining included allowance.
It does not enable overage or change the subscription. Do not run other paid
generation concurrently if relying on this allowance check.

If interrupted, check the process ID in `generation.lock` before removing a
stale lock. A `.pending` file identifies a request whose result may be uncertain;
check ElevenLabs history before retrying it to avoid paying twice. A completed
MP3 with an interrupted index update is automatically recovered on the next run.
