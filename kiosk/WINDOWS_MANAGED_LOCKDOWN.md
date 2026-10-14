# Windows lockdown for school-managed devices

The MRLC kiosk controls its own window. Pressing the Windows key can still open the Start menu because Windows handles that key before Electron receives a page input event. The existing focus heartbeat reports a switch away from the LMS to teachers and administrators; it cannot prevent the switch on a student-owned computer.

## Supported device setup

Use this setup only on a school-managed Windows 10 or 11 **Education, Enterprise, or IoT Enterprise** device. [Keyboard Filter](https://learn.microsoft.com/en-us/windows/configuration/keyboard-filter/) is available on those editions. It is not available on ordinary Windows Home or Pro installations. Do not install device-wide keyboard restrictions on a student's personal computer.

1. Create a dedicated **standard** Windows account for student kiosk use and keep a separate administrator account for maintenance and recovery. Install the MRLC kiosk for the student account.
2. Configure an [Assigned Access restricted user experience](https://learn.microsoft.com/en-us/windows/configuration/kiosk/) for that account, allowing only the MRLC kiosk and any required support applications. This supplies an operating-system app allowlist. If IT instead uses Shell Launcher to replace Explorer with the MRLC kiosk, add a separate app allowlist: [Shell Launcher alone does not prevent access to other apps](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/).
3. Enable Windows **Keyboard Filter** under *Turn Windows features on or off → Device Lockdown → Keyboard Filter*, then restart. Configure its [predefined keys](https://learn.microsoft.com/en-us/windows/configuration/keyboard-filter/predefined-key-combinations) for the student account, including `Windows`, `Alt+Tab`, `Ctrl+Esc`, and `Shift+Ctrl+Esc`. Blocking `Windows` covers both Windows keys. Keep Keyboard Filter disabled for administrator accounts and confirm that IT can reach the sign-in screen using the [breakout sequence](https://learn.microsoft.com/en-us/windows/configuration/keyboard-filter/#keyboard-breakout) before giving the device to students.
4. On a test device, sign in as the student and check the Windows key, Alt+Tab, Start menu, Task Manager, app launch, kiosk relaunch, network loss, and teacher-approved release. Sign in as an administrator and verify the recovery procedure. Roll out the policy only after those checks pass.

Windows policies are managed by school IT and are not switched on or off by a focus session. When a teacher releases a session, the MRLC app closes, but the restricted Windows account remains restricted until IT signs it out or changes the policy. Keep this account for assigned school sessions only.

On student-owned Windows devices, the supported mode remains **supervised focus tracking**: the app enters full screen and resists its own close shortcuts, while the LMS reports focus loss to staff. It cannot guarantee that the student stays in the app or prevent the student from using another device.
