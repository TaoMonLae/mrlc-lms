# Production build size optimization — 2 October 2026

Measured on the local checkout, which includes optional, untracked high-resolution
animal PNG exports. Production savings depend on which source assets are present.

| Item | Before | After |
| --- | ---: | ---: |
| Deployment directory, filesystem usage (`du -sh dist`) | 349 MiB | 62 MiB |
| Language Quest PNG icon payload | 272.8 MiB | 10.2 MiB |
| Server entry | 5,484,330 bytes | approximately 1,832,221 bytes |
| Main browser CSS (Vite report) | 622.84 kB | 596.41 kB |
| Server source map in deployment | 14.0 MiB | None; maps retained locally outside `dist` |

## Changes

- `npm run build` retains Vite and runs `scripts/build-production.mjs` afterward.
- Only production copies of PNG icons in `dist/icons/LanguageQuests_Graphics`
  are resized to fit 1024 × 1024 and recompressed. Names, URLs and alpha channels
  remain intact; originals and SVGs are untouched. Smaller originals are not enlarged.
- The 29-course deferred catalogue is bundled into the private
  `dist/.server/language-quest-courses.cjs` chunk. It loads only when official
  courses are ensured. Shared English vocabulary data remains in the main entry
  because the vocabulary-practice module uses its metadata at startup.
- All course contents, ordering, retirement codes and seeding behavior are retained.
  Splitting the catalogue reduces startup work; it does not delete curriculum data.
- Source maps omit embedded source contents and move to ignored `.build-debug/`
  alongside the server bundle analysis. They are available for manual debugging,
  but are no longer automatically linked from the production runtime.
- Tailwind scans `src`, root `components`, `hooks`, `lib`, `shared`, and `index.html`
  explicitly, avoiding unrelated examples, tests and documentation.
- The production static server rejects server `.cjs` bundles and private chunks.

## Deployment

Use the existing `npm run build` and PM2 restart commands. Deploy the entire `dist`
folder, including its hidden `.server` directory. Do not copy only `dist/*` or
`server.cjs`. The Dockerfile already copies the complete directory.

Original local artwork remains untracked and is not part of this commit. A clean
checkout with no optional PNG exports still builds correctly.

## Verification

- TypeScript and production build pass.
- 74 focused tests cover course content, registration/retirement, and icon resizing.
- Imported the compiled CommonJS catalogue through dynamic import and compared all
  contents against the source catalogue; the data matches exactly.
- Bundle metadata confirms large Mandarin and math datasets are absent from the
  main server entry; no source map remains in `dist`.
- Eight targeted production browser checks passed on desktop and mobile, covering
  light/dark layouts, media/math, restored answers, review and submission. The broad
  run was stopped after stalling between projects; it is not counted as a pass.
- Compiled production-server smoke test passed with an isolated unreachable test
  database and disabled email: browser entry served, private bundle URLs (including
  encoded paths) returned 404, then the server was stopped.
- Production browser tests use Vite preview with mocked APIs; no production student
  data or live database is changed. This is not a measured network/startup benchmark.

Sources: [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files),
[esbuild source maps](https://esbuild.github.io/api/#sourcemap),
[Vite public assets](https://vite.dev/guide/assets.html).
