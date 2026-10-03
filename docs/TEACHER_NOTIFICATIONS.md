# Teacher notifications and email lists

Apply `npx prisma migrate deploy` and regenerate the Prisma client before running this version. Migration `20261003120000_teacher_notifications` adds category preferences and enforces one delivery record per notification/channel.

| Event | Recipients | Destination |
| --- | --- | --- |
| Payroll approved or marked paid | The linked teacher or employee who owns each payslip | `/my-payroll` |
| Teacher assigned to or removed from class | The affected teacher | Class details or `/teacher/classes` |
| Class details changed | Assigned teachers | Class details |
| Schedule created, changed, substituted, cancelled or deleted | Primary/substitute teachers, including previous teachers after reassignment | `/teacher/timetable` |
| Active ALL or TEACHERS announcement published/updated | Active teachers with linked accounts | Announcement details |
| Active CLASS announcement published/updated | Teachers assigned to that class | Announcement details |
| New `CURRENT_RELEASE.id` | Active teacher accounts | `/updates` |

Each recipient has a separate email outbox record. Payroll amounts are omitted from email; recipients must sign in to view their own payslips. Inactive, unlinked and external learner accounts are excluded. Expired, archived and student-only announcements are excluded from teacher mail.

New categories default to enabled. Existing email preferences are preserved: email is opt-in under **Notifications → Email notifications** (`/notifications/settings`), also available in the account profile. Teachers can independently disable Payroll, Classes and announcements, or App updates. Student settings include Homework reminders (including redo requests) and Results and feedback. Topic switches affect both delivery channels; turning off a topic also hides its existing bell entries and unread count. SMTP requires `SMTP_HOST` and the appropriate credentials, port and sender in the environment; `APP_URL` must be the public origin so email links work. Missing SMTP leaves messages queued. Before sending a queued notification, the worker checks that the account is still active and the email channel and topic remain enabled; opted-out mail is cancelled and its body cleared. Password-recovery mail is independent of notification preferences.

Payroll/class writes commit the notification and mail together in one database transaction. The SMTP worker polls every 30 seconds and retains the existing five-attempt retry behavior. A stable source ID prevents repeated requests from queueing the same event again. App updates are synchronized at startup and every five minutes, without waiting for a teacher to log in or open the bell. Change `src/data/releases.ts` with each release. Existing payroll and class history is not retroactively emailed.

Video lesson reminders also use these preferences and the email outbox, with one reminder per student/activity/day.

`GET /api/notifications/preferences` loads preferences independently of notification synchronization. `PUT /api/notifications/preferences` accepts supported booleans only. Both return only the eight preference fields, without database IDs or ownership metadata.

The API requires authentication and scopes reads to the signed-in user. `PATCH /api/notifications/:id/read` returns 404 for another user's notification. `POST /api/notifications/read-all` affects only the caller. Preference updates accept only supported boolean fields; unavailable notification tables return 503 instead of a misleading empty result. Announcement list and detail reads enforce the same audience/class boundary (administrators and authors retain management access).

Local validation covers unit adapters, an isolated PostgreSQL database, and desktop/mobile browser workflows. SMTP behavior is mocked, and a local Nodemailer stream transport verifies MIME generation; no real email is sent. See [the module audit](qa/module-audit-2026-10-03.md). After deployment, verify one approved payslip, a class reassignment/substitution, and a release against test teacher accounts with email enabled; inspect `EmailOutbox` and `NotificationDelivery` for SENT or retry status.

## System Admin email format

All newly queued notification emails and password-reset emails include a personalised greeting, a clear explanation, event-specific next steps, an account link, and a **System Admin — Mon Refugee Learning Centre** sign-off. HTML and plain-text versions contain equivalent information. Notification email includes a preference-management link; password recovery is a transactional account message and does not include that link.

The outgoing display name is **System Admin | MRLC LMS**. `SMTP_FROM` still supplies the configured mailbox, including when an existing setting uses an older display name. SMTP credentials, recipient selection, topic opt-outs and delivery deduplication are unchanged.

App-update emails include the release version and all published highlights and details from `src/data/releases.ts`, rather than only its summary. Payroll notices distinguish approval from recorded payment and continue to omit amounts. Homework, exam, class, timetable, announcement, video and student-support messages explain the next action relevant to each event. All generated messages identify themselves as automated; no monitored reply address is implied.

Templates are maintained in `lib/emailTemplates.ts`; sender parsing is in `lib/emailSender.ts`. Queued email bodies are snapshots: existing outbox content and previously delivered messages are not rewritten or resent. The release ID is unchanged by the template update, so deploying it does not trigger another app-release email for users who already received that release.

Validation covers each category, complete release content, HTML escaping, safe school links, password-reset token encoding, sender mailbox preservation, MIME alternatives, and notification/outbox regressions. Tests use local stream transport and mocks; no live emails are sent.
