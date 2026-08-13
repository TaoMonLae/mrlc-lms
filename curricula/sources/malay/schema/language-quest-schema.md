# Learning Quest content schema

Each unit is one JSON file: `units/<unit-id>.json`. Shape:

```jsonc
{
  "id": "a1-u1-salam-perkenalan",
  "level": "A1",
  "order": 1,
  "title": "Salam & Perkenalan",
  "englishTitle": "Greetings & Introductions",
  "canDo": ["..."],           // CEFR-style can-do statements for this unit
  "lifeBenefit": "...",       // one sentence: why this matters in real life (SDT hook)
  "estMinutes": 60,           // total estimated study time for the whole unit
  "vocab": [ VocabItem, ... ],
  "lessons": [ Lesson, ... ],
  "scenario": Scenario,
  "speakingPrompts": [ SpeakingPrompt, ... ],
  "unitQuiz": Quiz
}
```

**VocabItem**
```jsonc
{
  "id": "v-...",             // unique across the whole course
  "type": "vocab",           // vocab | phrase | grammar | minimalPair
  "ms": "...",               // Malay (KL colloquial spelling as spoken, unless register=standard)
  "en": "...",               // English gloss
  "mon": null,                // placeholder for Mon gloss, filled by MRLC staff
  "register": "colloquial",   // colloquial | standard | rojak
  "example": "...",           // example sentence in Malay
  "exampleEn": "...",         // English translation of example
  "phonetic": "...",          // rough pronunciation guide (not full IPA, learner-friendly)
  "audioUrl": "/audio/ms/<id>.mp3",   // placeholder path, audio to be recorded
  "minimalPairWith": null      // id of a contrasting item, for pronunciation drills
}
```

**Lesson**
```jsonc
{
  "id": "a1-u1-l1",
  "order": 1,
  "title": "...",
  "estMinutes": 10,
  "sections": ["review", "input", "practice", "quiz", "speaking"],
  "itemIds": ["v-...", "v-..."],   // subset of the unit's vocab introduced/drilled in this lesson
  "practiceExercises": [ Exercise, ... ]
}
```

**Exercise**
```jsonc
{
  "type": "matching" | "clozeGap" | "listenToPicture" | "translate" | "minimalPairChoice" | "reorder",
  "prompt": "...",
  "itemIds": ["v-..."],       // items this exercise drills
  "answer": "..."             // for cloze/translate/reorder types
}
```

**Scenario**
```jsonc
{
  "id": "a1-u1-...",
  "setting": "...",
  "roles": ["...", "..."],
  "script": [ {"role": "...", "ms": "...", "en": "..."}, ... ],
  "aiPrompt": "..."            // system prompt for the Gemini/Ollama AI conversation partner persona
}
```

**SpeakingPrompt**
```jsonc
{
  "id": "...",
  "type": "shadowing" | "roleplay" | "pronunciation" | "presentation",
  "instructions": "...",
  "targetAudioUrl": "/audio/ms/....mp3",
  "rubric": ["...", "..."]
}
```

**Quiz** (end-of-unit checkpoint, reuses the existing exam engine)
```jsonc
{
  "id": "...",
  "passMark": 0.7,
  "questions": [
    {"type": "mcq", "prompt": "...", "options": ["...","..."], "answerIndex": 0},
    {"type": "listening", "audioUrl": "...", "prompt": "...", "options": ["...","..."], "answerIndex": 0},
    {"type": "translate", "prompt": "...", "answer": "..."}
  ]
}
```

Per-user `reviewState` (SRS) and `progress` records are NOT authored here — they are generated at runtime by the app per the schema shown in the Learning Quest research report.
