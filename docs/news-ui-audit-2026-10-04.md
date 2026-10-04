# News UI/UX audit and fixes — 4 October 2026

Scope: News feed, article reader and News Sources settings. Reviewed with Impeccable, Mobbin references, source inspection and local browser fixtures. School records were not changed by the UI checks.

## Implementation integrity verdict

Pass after fixes: News retains its established ruled editorial layout, serif headlines, yellow actions and light/dark palettes. Changes concentrate on readable type, reachable reading tools, recoverable failures and source management. Root DESIGN.md describes a separate Discord reference; it is not the visual authority for this existing surface.

## Audit health

Scores are qualitative assessments of this scoped review, not an accessibility certification or performance benchmark.

| Dimension | Before | After | Evidence |
| --- | ---: | ---: | --- |
| Accessibility | 2 | 3 | Named source controls, readable metadata, controlled publisher formatting; axe checks pass on tested feed and reader states. |
| Performance | 3 | 3 | Lazy story images preserved; sanitized article HTML is memoized. Production timing was not profiled. |
| Responsive design | 2 | 3 | Reading tools remain available on mobile; main action targets reach 44px; no overflow at 320px and 200% root text size. |
| Theming | 3 | 4 | Publisher inline colors no longer override article colors; tested light/dark feed and reader states pass contrast checks. |
| Implementation integrity | 3 | 4 | Specific recovery actions and truthful source status; zero deterministic Impeccable findings. |
| **Total** | **13/20** | **17/20** | **Good within the tested scope.** |

## Reference decisions

| Decision | Evidence | Application |
| --- | --- | --- |
| Preserve the lead/briefing hierarchy and topic navigation | [Ghost news screen on Mobbin](https://mobbin.com/screens/756cbee5-cff7-4fe2-9b56-0c6d4e5a6baf), existing News implementation | Keep prominent headlines and secondary story grouping. |
| Keep topics, summaries and source context easy to scan | [Perplexity discovery screen on Mobbin](https://mobbin.com/screens/ec59e633-ba10-46a5-9277-363061007f02) | Preserve filters and source metadata; improve their readability. |
| Use explicit text roles | Impeccable typeset guidance; Refero typography reference | 14px metadata/control labels, 16px summaries/search, 19px default reader text with 17–25px preference (rem-based). |
| Limit line length and support larger text | Impeccable Read-mode guidance | Article prose capped at 70ch; text size persists across visits. Existing multilingual font fallbacks remain. |

## Findings and resolutions

Ten grouped issues: 0 P0, 2 P1, 8 P2, 0 P3. All addressed in this scope.

| Severity | Location | Problem and user impact | Resolution |
| --- | --- | --- | --- |
| P1 | NewsSources.tsx | Add, refresh and remove icon buttons lacked accessible names (WCAG 4.1.2). | Added action/source-specific names, visible Add text, and a table caption. |
| P1 | ArticleReader.tsx | Publisher inline styles could override the reader size controls and dark-mode colors, creating unreadable content. | Strip publisher style/class attributes during sanitization; preserve semantic article HTML and links. |
| P2 | news.css / ArticleReader.tsx | Metadata and controls were 8–12px, including a 12px mobile search input. | Shared 14px secondary type and 16px body/search; enlarged dictionary metadata. |
| P2 | news.css / NewsSources.tsx | Reading, view and source controls used small targets. | Main action targets increased to at least 44px high; icon controls are 44px wide. Topic focus rings stay within their scroll container. |
| P2 | news.css / ArticleReader.tsx | Mobile styles hid dictionary guidance and links; touch-end timing could miss native selection changes. | Keep guidance/links visible and observe document selection changes within the article. |
| P2 | NewsFeed.tsx | Retrying a failed later page reloaded page one. | Retry the failed page next to the retained stories; preserve loaded articles. |
| P2 | ArticleReader.tsx | Any article request error redirected to the news feed and was called “not found.” | Keep the article URL, show a recoverable error, and offer retry/back navigation. |
| P2 | NewsFeed.tsx / NewsSources.tsx | Topic failures silently removed filters; source loading failures could appear as an empty list. | Visible error/retry states, distinct loading state, and refreshed categories after a news refresh. |
| P2 | news.css | Missing images occupied a large image-sized block before the headline, especially costly on phones. | Compact publisher fallback while preserving the normal layout for real images. |
| P2 | NewsSources.tsx | Disabled sources could display stale “Error” status; help text incorrectly said full articles were never stored. | Prioritize Disabled status and explain that full text is available when supplied in a feed. |

Positive behavior preserved: request sequencing prevents stale search responses replacing current results; query/category/layout return links remain intact; images load lazily except lead media; article HTML remains sanitized; existing keyboard focus and reduced-motion behavior remain.

## Detector triage

- Replaced the loading spinner's border markup with the shared Loader2 icon. The original rounded-border warning was a false positive for a spinner; no suppression was added.
- Reduced the quote border to a thin rule and reused the existing serif token for text-size controls.
- Final deterministic scan: **0 findings**.
- **20 advisory notes remain unsuppressed**, chiefly type/palette comparisons against the unrelated root DESIGN.md reference. News' established editorial palette and headline sizes are intentionally retained; design documentation was not rewritten as a side effect.
- No new ignore rules were needed for this UI work. The earlier backend parser-comment ignore in news.ts remains unchanged.

## Verification

- `npm run lint`: passed.
- `git diff --check`: passed.
- `tests/e2e/news.spec.ts`: **8/8 passed** across desktop Chromium and mobile Chromium emulation.
- Tests cover topic retries, query/category/list return state, later-page retry, article retry, reader size limits and persistence, publisher style removal, dictionary selection, disabled source status and named source controls.
- Axe WCAG A/AA checks on light/dark feed and reader fixtures: **0 violations**.
- Layout overflow assertions at normal viewports and at **320px with 200% root text size**: passed.
- Desktop/mobile screenshots inspected for feed/list/reader and dark mode. Fixture articles are illustrative; checks did not exercise live school accounts or native Safari selection behavior.

No release or deployment performed. Future performance profiling or native-device testing would extend coverage; neither is claimed here.
