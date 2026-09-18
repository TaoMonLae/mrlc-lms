# Exam workflow audit and reference lock

Designing exam entry, recovery and grading for students and teachers on the existing MRLC web app. Goal: make every exam state actionable and preserve answers through failures. Direct build within the existing Fieldbook system.

Primary target: existing MRLC typography, canvas/card/border/primary tokens, dark mode and compact controls. Preserve its palette, typography and navigation. No new brand palette or imagery.

Research: Refero Google for Education style bf4966c6-7f2f-47a2-ac10-8a496c044d5e; Goodnotes style 20a06982-45ea-4df0-ae36-7cb6de2b6a4b; Duolingo rules screen 3fd769a0-5822-49bb-89f6-be768a5d9374; Preply progress screen e418aa3d-474a-4a68-bb20-e16de27f349b and placement test flow 9215.

| Decision | Reference | Role and purpose |
| --- | --- | --- |
| Flat bordered panels and readable secondary copy | Goodnotes + existing MRLC | Content surfaces; keep primary accent for actions |
| Start/resume details before creating an attempt | Preply welcome/readiness flow | Explicit user action starts the clock, bookmarks do not |
| Inline access-code form and named navigation | Duolingo rules + existing controls | Recoverable entry without browser prompts or lost exam context |
| Visible errors, retry, distinct empty states | User's reliability brief | Never equate failed requests with no exams or submitted answers |
| Compact summary and 180ms reduced-motion-aware entrance | Installed licensed React Bits Pro components/blocks/dashboard-11.tsx | Student overview only; never animate answers or timers |
| Responsive actions and wrapping metadata | Existing MRLC + Refero craft | Keep long titles, tabs and actions reachable on phones |

Reject: decorative effects during timed work, unrelated rebranding, tiny all-caps controls, placeholder help buttons. Media strategy: code-native icons and real exam data; no bitmap assets needed.

## Verification

- TypeScript check and production build pass.
- Full unit suite: 338 passed, with a subsequent focused run of 24 exam tests for scoring, schedules, attempt limits, assignment visibility, permission-query failures, and server-authoritative expiry reconciliation.
- Browser regression checks: 34 passed across desktop/mobile Chromium (installed Brave) and WebKit. API fixtures isolate workflows from real student data; these are not live-database end-to-end checks.
- Verified teacher tabs and grading navigation, legacy deep links, access-code retry, resume/history with zero marks, failed player loads/saves, final answer submission at expiry, result request retry, time extensions, and failed schedule loading.
- Visually inspected readiness, student overview, teacher filters, save recovery, and dark-mode player captures. Corrected mobile tab wrapping and removed floating chat/assistant widgets from the active player after observing that chat obscured Submit.
- Reused the project's installed React Bits Pro dashboard-11 overview/entrance pattern. Motion respects reduced-motion preferences; exam answers and timers are not animated.

No schema migration or deployment is part of this change. Backend route changes take effect after restarting the application server.

## Exam Studio follow-up

Brief: teachers need a reachable, trustworthy editor for questions, settings, schedules and result release. The supplied screenshot showed a largely empty workspace, an isolated purple palette and an always-visible publish action. The existing MRLC Fieldbook app is the locked visual target.

Additional Refero research:
- [Linear style](https://linear.app), style `554b801c-3b31-4086-a7e5-ae613cdd618b`: compact spacing, restrained borders and layered surfaces. Borrow density and hierarchy only; do not import lime CTA colors or the dark-only palette.
- [Perplexity style](https://perplexity.ai), style `b95e58ce-d00e-4de1-ad6b-6f1c7d7a5593`: clear active navigation and text-led controls. Borrow legibility, not its monochrome brand palette.
- [Acuity form editor](https://refero.design/pages/1b0e181b-1844-48d8-a7af-948a164bcaca) and [creation flow 9862](https://refero.design/flows/9862): visible question-type palette, named save/preview actions, explicit saved confirmation and a return path.

Reference lock: MRLC foreground/card/muted/border tokens; navy hierarchy and teal active controls; 6–8px control/panel corners; 8/12/16/24px spacing; no decorative imagery. Preserve light/dark theme selection from the application, not the OS media query. Use the installed React Bits Pro dashboard-11 entrance pattern (180ms, 6px, reduced-motion aware) only for the empty question chooser.

| Decision | Implementation |
| --- | --- |
| Question types should be one click away in an empty exam | Eight labeled starter cards; reusable keyboard-accessible type dialog |
| Editor space is more important than a narrow preview | Container-width responsive layout; full preview remains reachable in the toolbar |
| Small screens need alternatives to dragging | Move up/down, duplicate, descriptive outline labels and delete confirmation |
| A success message must mean the required writes succeeded | Visible saving/saved/incomplete state; publishing waits for schedule, policy and accommodations |
| Do not silently substitute defaults or fake questions | Load retry blocks editing on failed reads; AI failure preserves content |
| Authoring must preserve existing data | Dedicated question mapping tests; preserve hidden/scheduled policies, settings, question identities and advanced scoring metadata |
| Preview controls must respond | MCQ, multi-select, text, dropdown and drag/tap word placements; Escape/focus handling; no real attempt created |
| Exposed settings must match player behavior | Remove inert auto-grade/regrade/late-penalty/gradebook/pause toggles; explain accommodation-based breaks; link advanced authoring and scheduling |

Visual QA found floating assistant/chat buttons covering the mobile Generate action; they are excluded from Studio and its edit alias. The initial three-panel layout was also too narrow beside an expanded app sidebar, so the breakpoint now considers actual workspace width.

Verification uses isolated API fixtures, not production student records. Browser coverage includes all eight question types, editing, duplication/reordering/deletion, preview inputs, failed loads, failed publication, retry, accommodations, release times, and AI failure/success. Unit tests cover choice keys (including numeric labels), multiple answers, manual question types, drag blank order, publication readiness, row identity retention and foreign-ID isolation. Backend changes require an application-server restart; no schema migration is needed.

Final follow-up results: TypeScript and production build passed; 349 unit tests passed; 36 combined exam/Studio browser tests passed on desktop and mobile Chromium (Brave). Light and dark editor captures were visually inspected. These checks cover mocked API flows and pure persistence logic; live-database writes and the external AI provider were intentionally not exercised.
