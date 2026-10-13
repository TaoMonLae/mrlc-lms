---
version: 1
slug: "src-pages-kiosk-downloads"
primary_target: "src/pages/KioskDownloads.tsx"
related_targets:
  - "src/pages/kiosk-downloads.css"
---

# Kiosk downloads surface brief

Scope: public route `/kiosk-downloads`. Visitor mode: Operate.

Audience and job: a student or school IT helper selects the correct unsigned beta installer for Windows x64, Apple Silicon Mac or Intel Mac, then understands how to install and start an assigned focus session.

Constraints: keep the established MRLC Fieldbook tokens, configurable school identity, light/dark theme, and accessible public navigation. The unsigned beta installers are direct assets of a GitHub prerelease, with a published SHA-256 checksum file. Do not imply device-wide enforcement, signed release status, or native iOS, Android or ChromeOS apps.

Research: Refero Around's desktop download screen for platform and architecture hierarchy; Mobbin Amie's platform-specific download layout. Content follows the actual `kiosk/package.json`, build workflow and beta release assets.

Direction: one editorial introduction and explicit unsigned beta notice, followed by ruled installer rows, a three-step setup sequence, and guidance for phones, tablets and Chromebooks. The page reuses the public landing shell and its Fieldbook paper/navy/teal/gold roles; no new visual world or design tokens are introduced.
