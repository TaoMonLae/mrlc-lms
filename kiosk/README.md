# MRLC LMS Kiosk

A Windows and macOS desktop companion for `https://gedmrlc.monrefugeelc.com`. It opens one LMS window in Electron kiosk mode, rejects off-site navigation and new windows, blocks common browser exit shortcuts, and checks the LMS focus-session API every five seconds. It closes only after the server reports that staff approved release or the assigned time ended.

## Prepare the LMS

Deploy the current MRLC-LMS code and run `npx prisma migrate deploy` on the server first. The kiosk uses `/api/focus/session` and `/api/focus/watch`. Staff approve release or change remaining time at `/focus-monitor`. The kiosk needs a working HTTPS certificate and a network connection to the LMS.

## Run from source

```sh
cd kiosk
npm ci
npm start
```

The app opens immediately in kiosk mode. Use a supervised test computer and have a teacher or administrator ready to release the test student from the LMS. To point a development build at local HTTP, set `MRLC_LMS_URL=http://localhost:8000` and `MRLC_KIOSK_ALLOW_LOCALHOST=1`. Production accepts HTTPS only. The packaged app uses `config.json` as its default LMS origin.

## Package

On macOS, run `npm run pack:mac:arm64` for Apple Silicon or `npm run pack:mac:x64` for Intel. For Windows x64, run `npm run pack:win:x64`. Output is in `kiosk/out/`. Packaging on another OS can create the files, but a school should validate the app on actual Windows and macOS student devices.

The packages created here are unsigned. Before distributing to students, sign the Windows executable and sign and notarize the macOS app using the school's certificates. Restrict installation and updates to school administrators.

## Device policy and recovery

Electron kiosk mode controls its own window. An unmanaged student account may still use operating system controls, another monitor, task switching, or force quit. For Windows desktop apps, use a managed kiosk account with [Shell Launcher](https://learn.microsoft.com/en-us/windows/configuration/kiosk/) on a supported edition and add application and keyboard restrictions; [Shell Launcher alone does not block other apps](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/). On macOS, use device management and a supported single-app or assessment configuration; this Electron app does not implement Apple's [Autonomous Single App Mode](https://support.apple.com/guide/deployment/autonomous-single-app-mode-payload-settings-dep8a42c4c4a/web).

If the LMS or network is unavailable, the window stays locked and retries. If a student is unable to sign in or staff cannot release the session, a device administrator can use the operating system's management controls to stop the app. Keep that recovery procedure available at school.
