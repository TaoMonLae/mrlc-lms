# Internationalization (i18n)

The app supports multiple languages through gettext `.po` catalogs. **Adding a
new `.po` file is all it takes to add a new language** — it appears in the
language switcher (top bar) automatically and translates the whole app.

## How it works

- `locales/*.po` files are auto-discovered at build time (`catalog.ts` via
  `import.meta.glob`). The file's base name is the language code (`my.po` → `my`).
- `I18nProvider` keeps the selected language (persisted in `localStorage`) and
  runs a runtime DOM translator (`domTranslator.ts`) that walks the rendered
  page and replaces any text / `placeholder` / `title` / `aria-label` / `alt`
  whose English source matches a catalog entry. Because it works on the rendered
  output, pages don't need to wrap each string — coverage scales with the
  catalog, not with code changes.
- English is the default and is served straight from the source strings, so
  `en.po` is just the template (empty `msgstr` values).

## Add a new language

1. Copy `locales/en.po` to `locales/<code>.po` (e.g. `th.po` for Thai).
2. Set the header: `"Language: th\n"` and `"Language-Team: ไทย (Thai)\n"`.
3. Fill in each `msgstr` with the translation. Leave any you don't translate
   empty — untranslated strings fall back to English.
4. (Optional) add a friendly name in `KNOWN_NAMES` in `catalog.ts`.

That's it. Rebuild/restart and the language shows up in the switcher.

## Add new translatable strings

The catalog keys are the exact English source strings (whitespace-collapsed).
When you add new UI text, add a matching `msgid`/`msgstr` to each `.po` file.

For dynamic strings or attributes you'd rather translate explicitly in code,
use the hook:

```tsx
import { useT } from '@/src/i18n/I18nProvider';

const t = useT();
<span>{t('Save Changes')}</span>
```

## Notes

- Add `data-no-i18n` to any element subtree that must never be translated
  (the language switcher menu already uses it so language names stay native).
- `code`, `pre`, `textarea`, `script`, `style`, and KaTeX math are skipped.
