# Focus sessions on iOS, Android, and ChromeOS

The LMS has a dedicated voluntary [MRLC Focus beta](https://gedmrlc.monrefugeelc.com/focus-app) for personal phones and tablets. It is an installable web app with its own home-screen entry point, not an APK or App Store app. A school student signs in normally; that starts or resumes the assigned focus session. The focus page shows the remaining time, opens the learning dashboard and lets a student request release. Teachers and administrators can adjust time and approve release in the LMS monitor.

## Student-owned devices

1. Open <https://gedmrlc.monrefugeelc.com/focus-app> in the device browser.
2. On iPhone or iPad, use Safari's Share menu and **Add to Home Screen**, then open the new MRLC Focus icon. On Android or ChromeOS, use the browser's **Install app** or **Add to Home screen** menu if offered. Sign in with a school student account from the installed app; it may have a separate sign-in from your browser.
3. Keep the LMS open during the assigned session. The LMS sends focus and connection status to staff. When the page loses focus, staff receive a warning; the warning cannot name the other tab or app.
4. Request release in the LMS when needed. A teacher or administrator can approve the LMS session release.

An installed web app is a cleaner view, not an operating system lock. Students can switch apps, close the web app, disconnect, or uninstall it. The staff monitor labels this mode **Installed web app**, and a missing heartbeat becomes a connection warning. Neither the web app nor the teacher's LMS release control can force a personal device into kiosk mode or control its system exit.

On a personal iPhone or iPad, the family may voluntarily enable Guided Access for a single app. Its exit is controlled on the device by the passcode or biometric settings chosen there, not by LMS teacher approval. Android screen pinning has similar local exit limitations. These are optional device settings, not part of the LMS enforcement.

## School-managed devices

True device restrictions must be configured by the school's device administrator. The LMS remains the website shown inside that managed environment:

| Platform | Managed setup | Exit control |
| --- | --- | --- |
| iOS/iPadOS | Supervise devices and use MDM App Lock with a dedicated LMS app or a managed browser configured to allow the LMS site. App Lock selects an app; site restrictions need separate configuration. | MDM/device administrator controls the OS lock. |
| Android | Enroll as fully managed dedicated devices and allowlist a dedicated LMS app or restricted browser in Android Lock Task mode. Site restrictions need separate configuration. | Device policy controller controls Lock Task. |
| ChromeOS | Enroll devices and configure the LMS URL as a web app kiosk in Google Admin console. Review any allowed external origins. | Google Admin/device administrator controls kiosk exit. |

LMS release approval ends only the LMS focus session. It does not remotely disable an Apple, Android, or ChromeOS system kiosk. Coordinate any device unlock with the school's device administrator.

The managed configurations above are described in [Apple's App Lock deployment guide](https://support.apple.com/en-ie/guide/deployment/dep80a981/web), [Android's Lock Task documentation](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode), and [Google's ChromeOS web app kiosk guide](https://support.google.com/chrome/a/answer/9781496?hl=en).
