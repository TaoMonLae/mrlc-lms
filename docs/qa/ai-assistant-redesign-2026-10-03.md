# AI assistant redesign — 3 October 2026

## Brief and reference lock

Redesign the existing teacher/admin assistant in place. The user's screenshot and MRLC's current design system are the build target: navy text, gold assistant identity, IBM Plex Sans, and a contextual right-side panel. Preserve the existing role-scoped, read-only AI endpoint and floating-panel coordination.

References reviewed with Refero before implementation:

- [Rows](https://rows.com), style `984071b0-dd6d-4d43-a7b7-e71af93052df`: compact task entry, white surfaces, modest corners, a warm highlighted suggestion.
- [shadcn/ui](https://ui.shadcn.com), style `c14c0a94-1037-449e-bf5b-4cb972656ac7`: quiet borders, readable controls, one clear primary action.
- [Linktree assistant](https://refero.design/pages/33378bc9-fc51-4f4d-9015-8218775b971e): a bounded contextual panel, persistent composer, and response actions beneath the answer.

| Decision | Reference / role | Application |
| --- | --- | --- |
| White canvas and compact entry | Rows | Left-aligned introduction; one featured prompt and four small task shortcuts |
| Navy and gold | Existing MRLC UI | Navy for text/send; gold for assistant identity and the featured prompt |
| Subtle borders and control hierarchy | shadcn/ui | Quiet secondary controls; one visually distinct send action |
| Contextual reading panel | Linktree | 460px panel with optional 720px expansion, full-screen on mobile |
| Functional iconography | Existing Lucide library and craft reference | Consistent line icons in place of emoji; no decorative bitmap assets |
| Composer and keyboard | Craft accessibility reference | Labelled growing textarea, IME-safe Enter, Shift+Enter, Escape, focus restoration |

## Behavior

Prompts populate the composer for editing. Replies use the full reading width, with formatted headings, lists, tables and a copy action. Pending requests expose Stop; failures preserve the question and offer Retry without duplicating the question in conversation history. New conversation clears the view and discards any late response. Closing/reopening preserves the conversation in memory; reloading or changing accounts clears it. Stopping aborts the browser request; it does not guarantee cancellation of upstream model computation.

Desktop stays nonmodal so the underlying school page remains usable. Mobile uses a modal dialog with a fixed composer and independently scrolling content. Reduced-motion settings disable panel transitions and the spinner animation. The assistant remains limited to teachers/admins.

## Validation

- TypeScript passed.
- Ten Playwright cases passed across desktop Chromium and emulated iPhone Chromium: editable prompts, multiline input, focus/Escape, response formatting/copy, follow-up history, retry, cancellation/late responses, new conversation, role visibility, expansion, and 320px layout with long input.
- Axe found no WCAG 2 A/AA or 2.1 AA violations within the assistant panel in the tested light/dark states.
- Visually inspected desktop welcome, mobile welcome, conversation and dark-mode screenshots against the reference lock. Narrow layouts keep the composer available and allow scrolling to lower suggestions.
- Browser tests use mocked authentication, school data and AI responses against a frontend-only Vite server. No live school records or model requests were used. Hardware mobile keyboards and live model latency remain outside this local check.

Run the regression file with the project's usual Playwright setup:

```sh
npx playwright test tests/e2e/ai-assistant.spec.ts
```
