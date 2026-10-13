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

### Windows certificate and release

The recommended Windows route is an **organization-validated (OV) Authenticode code-signing certificate** issued to the school's registered legal entity, with its private key held on a USB token. Order one from a public certificate authority such as [DigiCert](https://docs.digicert.com/en/certcentral/order-and-manage-certificates/request-certificates/request-a-code-signing-or-ev-code-signing-certificate/request-code-signing-certificate.html), Sectigo, or GlobalSign. In the order, choose **Code Signing**, the school's organization, and the **USB token** delivery option. Complete the authority's organization and contact verification. The certificate's publisher name will be the verified legal name, so confirm that name before ordering. A new OV certificate does not require the more expensive EV tier for this release, and neither tier guarantees an immediate SmartScreen pass.

When the token arrives, use a trusted Windows x64 computer with Node.js 22, install the token software supplied by the authority, insert the token, and confirm that Windows can see the code-signing certificate:

```powershell
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
  Format-Table Subject, Thumbprint, NotAfter
```

If the authority installs it in the machine store, use `Cert:\LocalMachine\My` instead. Copy the 40-character **Thumbprint** shown for the school's certificate. In PowerShell, from this repository:

```powershell
cd kiosk
npm ci
npm test
$env:MRLC_WIN_CERT_SHA1 = 'PASTE_THE_40_CHARACTER_THUMBPRINT_HERE'
npm run release:win:x64
```

The token may ask for its PIN while signing. The release command signs the app and NSIS installer, then checks both Authenticode signatures and their certificate thumbprints. It stops if either check fails. The signed installer is `kiosk/release/MRLC-LMS-Kiosk-<version>-win-x64.exe`. Test installation and publisher display on a clean Windows computer before distributing it to students. Keep the token and PIN with authorized school staff; do not put the PIN, certificate keys, or token backups in Git or chat.

An existing exportable PFX certificate is also supported with `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` (or `CSC_LINK` and `CSC_KEY_PASSWORD`). New publicly trusted OV certificates normally use a hardware token or HSM, so do not order one expecting a PFX export. If the school's legal entity is in Malaysia, Microsoft [currently excludes Malaysia from Artifact Signing Public Trust eligibility](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart); the public CA route above is suitable.

The app does not self-update. To deploy a new version, build a signed installer with a higher version and distribute it through the school's normal software channel.

## Device policy and recovery

For managed Windows devices, use a kiosk account and application restrictions in addition to this app. [Shell Launcher alone does not block other apps](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/). For managed Macs, use school device management and a supported single-app or assessment configuration. This Electron app does not implement [Autonomous Single App Mode](https://support.apple.com/guide/deployment/autonomous-single-app-mode-payload-settings-dep8a42c4c4a/web).

If the student has not signed in or the school server is down before lock, close the app normally. During a locked session, staff can release the student or set the remaining time to zero in `/focus-monitor`. If the network remains unavailable or staff cannot reach the monitor, a device administrator can use the operating system's management controls to stop the app. Keep that recovery procedure available during testing.
