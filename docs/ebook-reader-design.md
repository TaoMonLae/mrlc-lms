# PDF and EPUB reader interaction reference

Build target: the existing MRLC reader in the supplied September 30 screenshot.
Preserve its navy dark theme, light theme, typography, book content, fullscreen
controls, highlighting, search, and reading progress.

## References and decisions

| Decision | Source | Adaptation |
| --- | --- | --- |
| Narrow, independently scrollable page preview pane on the left | [Zillow, Mobbin](https://mobbin.com/screens/3881291a-7f10-438a-8bc7-7c47ed187a76), [Missive, Refero](https://refero.design/pages/b14045d0-6f3d-4e2e-8a9d-ca581cf66a61) | Numbered PDF thumbnails, a clear active page, and a hide/show control. EPUB uses chapter previews because its pages reflow. |
| Restrained surface layering and compact controls | [Linear changelog style, Refero](https://linear.app/changelog), existing MRLC design system | Keep MRLC colors and fonts; use borders to separate the pane from the reading surface. |
| Scroll through the book and navigate without toolbar clicks | User request, [Missive navigation, Refero](https://refero.design/pages/29eeffa2-325a-4ddb-9b06-a5363fd152f4) | Continuous PDF pages, continuous EPUB chapters, arrow keys, Page Up/Down, and Home/End. Keep an optional EPUB paginated mode. |
| Preview pane hides by default on small screens | Existing responsive reader and reading-space constraint | Show it as a dismissible overlay on mobile; reserve a column on desktop. |
| Render only nearby PDF pages and thumbnails | The supplied 223-page book and browser memory constraint | Retain page-sized placeholders and load canvases near each scroll viewport. |

Research also examined Dovetail's page chooser and Gemini Notebook's slide rail on
Mobbin. Their card and right-rail layouts are secondary references; the left rail
from Zillow and Missive is the dominant layout.

Keyboard handling must respect text inputs, chapter controls, open menus/dialogs,
and text selection. EPUB chapter events occur inside iframes, so handle keys there
as well as in the outer reader. Scrolling, thumbnail jumps, search results, saved
positions, and keyboard navigation must all update the same reading position.
