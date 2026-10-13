# Focus monitor

School student accounts start a 60 minute supervised session when they sign in to the LMS. A second login resumes an active period without resetting its end time. Teachers can monitor students in their assigned classes; administrators can monitor all school students. Staff can add or remove 15 minutes, approve release, or decline a release request.

In a regular browser, the student page asks the student to enter full screen when the Fullscreen API is available; it requires a user gesture. On phones and other browsers without that API, students can install the LMS web app for a cleaner standalone view. The page reports visibility, window focus, presentation mode, and a heartbeat every 15 seconds. Staff see a connection warning after 45 seconds without contact. Focus loss, full screen exit, and release requests create in-app staff alerts. The presentation mode is reported by the student's device and is not proof of a device lock. The browser cannot identify another tab or app, stop one from opening, prevent leaving full screen, or prevent closing the LMS. The companion app in `kiosk/` keeps the LMS in one kiosk window and checks this session's read-only watch status before exiting. Operating system restrictions still require device management.

For iOS, Android, and ChromeOS device setup and the limits on student-owned devices, see [mobile and ChromeOS focus setup](mobile-chromeos-focus.md).

Deploy the `20261013090000_focus_sessions` and `20261013120000_focus_presentation_mode` Prisma migrations before starting the updated server (`npx prisma migrate deploy`). The monitor is at `/focus-monitor` for teachers and administrators.
