---
version: 1
slug: "src-pages-kiosk-downloads"
primary_target: "src/pages/KioskDownloads.tsx"
related_targets:
  - "src/pages/kiosk-downloads.css"
---

# Kiosk downloads surface brief

Scope: public route `/kiosk-downloads`. Visitor mode: Operate.

Audience and job: a student or school IT helper selects the correct supervised pilot installer for Windows x64, Apple Silicon Mac or Intel Mac, then understands how to install and start an assigned focus session.

Constraints: keep the established MRLC Fieldbook tokens, configurable school identity, light/dark theme, and accessible public navigation. The builds are unsigned GitHub Actions artifacts wrapped in ZIP files; the linked run's artifacts expire after 30 days and may require a GitHub sign-in. After expiry, direct visitors to the build history without promising a current installer. Do not imply device-wide enforcement, signed release status, or native iOS, Android or ChromeOS apps.

Research: Refero Around's desktop download screen for platform and architecture hierarchy; Mobbin Amie's platform-specific download layout. Content follows the actual `kiosk/package.json`, workflow and successful 13 October 2026 run.

Direction: one editorial introduction and explicit pilot notice, followed by ruled installer rows, a three-step setup sequence, and guidance for phones, tablets and Chromebooks. The page reuses the public landing shell and its Fieldbook paper/navy/teal/gold roles; no new visual world or design tokens are introduced.
