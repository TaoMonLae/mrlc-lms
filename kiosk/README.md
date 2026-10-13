# MRLC LMS Kiosk

Desktop companion for Windows x64, Intel macOS, and Apple Silicon macOS. It opens `https://gedmrlc.monrefugeelc.com` in a single Electron window. The window stays closable while the student signs in. When the LMS confirms that student's active focus session, it enters full screen kiosk mode and stays there until a teacher or administrator approves release or the assigned time ends. Staff can adjust the remaining time in `/focus-monitor`.

The LMS must already have the focus-session API deployed (`/api/focus/session` and `/api/focus/watch`). The app needs a working HTTPS connection. It checks the server every five seconds. If the connection drops during a locked session, it remains locked and retries.

## Student installation

Each Windows or macOS computer needs the app installed. The LMS website cannot install it automatically. A student can install the signed school release, or school IT can deploy it through device management. Open the app, sign in with a student account, and leave it running for the assigned session. Teacher and admin accounts do not start a student kiosk session.

Unsigned **pilot** installers are available from the *Kiosk pilot installers* GitHub Actions workflow on the branch or pull request. They are for supervised testing, not schoolwide distribution. Windows SmartScreen and macOS Gatekeeper may warn or block them. The Mac DMG contains the app to drag into Applications; the Windows EXE is a per-user installer. Download the file matching the device architecture.

For iOS, Android, and ChromeOS, use the LMS browser or installed web app. Those devices report focus and full-screen changes to staff, but this desktop kiosk cannot lock them. On student-owned computers, the operating system can still switch apps, force quit, or use another screen. This app controls its own window; it does not claim device-wide enforcement.

## Build pilot installers

```sh
cd kiosk
npm ci
npm test
npm run pilot:mac:arm64  # Apple Silicon Mac
npm run pilot:mac:x64    # Intel Mac
npm run pilot:win:x64    # Windows x64 runner
```

Installers are written to `kiosk/release/`. Build the Windows installer on Windows. The macOS pilot builds can be produced on their matching macOS architecture or by a macOS runner. GitHub Actions builds all three on matching runners and keeps the downloadable artifacts for 30 days.

To run from source for testing, use `npm start`. A pre-login window can be closed normally. To point a development build at local HTTP, set `MRLC_LMS_URL=http://localhost:8000` and `MRLC_KIOSK_ALLOW_LOCALHOST=1`; packaged production defaults to the HTTPS URL in `config.json`.

## Signed school release

Do not publish the unsigned pilot as the school release. When certificates are available, use the `release:*` scripts. They fail early if signing credentials are absent, and `electron-builder` is configured to fail if signing does not happen.

For macOS, provide a Developer ID identity via `CSC_LINK` and `CSC_KEY_PASSWORD`, or `CSC_NAME` for an identity already in the keychain. Also provide Apple notarization credentials using one of the supported `APPLE_API_KEY`/`APPLE_API_KEY_ID`/`APPLE_API_ISSUER`, `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`, or `APPLE_KEYCHAIN`/`APPLE_KEYCHAIN_PROFILE` sets. Run `npm run release:mac:arm64` and `npm run release:mac:x64` on macOS. Verify the signatures and notarization on a clean Mac before distribution.

For Windows, provide `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` (or `CSC_LINK` and `CSC_KEY_PASSWORD`) on a Windows build host, then run `npm run release:win:x64`. Verify the signature and install on a clean Windows computer. Keep certificate files and passwords out of Git and chat.

The app does not self-update. To deploy a new version, build a signed installer with a higher version and distribute it through the school's normal software channel.

## Device policy and recovery

For managed Windows devices, use a kiosk account and application restrictions in addition to this app. [Shell Launcher alone does not block other apps](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/). For managed Macs, use school device management and a supported single-app or assessment configuration. This Electron app does not implement [Autonomous Single App Mode](https://support.apple.com/guide/deployment/autonomous-single-app-mode-payload-settings-dep8a42c4c4a/web).

If the student has not signed in or the school server is down before lock, close the app normally. During a locked session, staff can release the student or set the remaining time to zero in `/focus-monitor`. If the network remains unavailable or staff cannot reach the monitor, a device administrator can use the operating system's management controls to stop the app. Keep that recovery procedure available during testing.
