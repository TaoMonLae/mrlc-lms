# MRLC LMS Kiosk 0.2.0-beta.1

**Unsigned beta for supervised school testing.** This is not the signed school release. Ask school IT before installing it on a managed device.

## Installers

- `MRLC-LMS-Kiosk-0.2.0-beta.1-win-x64.exe` — Windows x64, per-user installer.
- `MRLC-LMS-Kiosk-0.2.0-beta.1-mac-arm64.dmg` — Apple Silicon Mac.
- `MRLC-LMS-Kiosk-0.2.0-beta.1-mac-x64.dmg` — Intel Mac.
- `SHA256SUMS.txt` — checksums for the three installers. Compare the downloaded file's SHA-256 hash before opening it.

Windows SmartScreen and macOS Gatekeeper may warn or block these unsigned files. Device management policy may prevent installation. Do not disable school security settings to install this beta.

## What to expect

Launch the app and sign in with a student school account. Before a focus session starts, its window can close normally. When the LMS confirms an active assigned session, the app enters full-screen kiosk mode. Staff can adjust time or approve release in Focus Monitor. The app unlocks after it receives the server's confirmation that the session was released or its time ended.

The app needs a working HTTPS connection to the school LMS. If the connection drops during a locked session, it remains locked and retries. If staff cannot reach Focus Monitor, a device administrator can stop the app through operating-system management controls. Keep that recovery path available during testing.

This app controls its own window; it does not enforce a device-wide lockdown. iOS, Android and ChromeOS use the LMS web app instead. There is no automatic updater; install later versions manually. See the [kiosk guide](https://github.com/TaoMonLae/mrlc-lms/blob/main/kiosk/README.md) for more detail.
