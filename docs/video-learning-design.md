# Video learning workspace

Brief: extend MRLC's existing responsive web lesson player for students, teachers,
and admins. Direct build against the current MRLC design system, not a new brand.
Make the journey clear: watch → check understanding → submit homework.

## Reference lock / decision ledger

| Decision | Source | Role / constraint | Adaptation |
| --- | --- | --- | --- |
| Compact sans-serif controls, flat bordered panels | Refero shadcn style c14c0a94-1037-449e-bf5b-4cb972656ac7 | Typography and surface foundation | Existing MRLC fonts, 14px body, 16px section titles, 12px corners, 16px padding |
| Player remains dominant; metadata stays secondary | Refero Vimeo style 260ed304-25ca-401f-a0a8-c40f63f9e4fd | Media composition only | Real provider player and existing thumbnails; no decorative imagery |
| Ordered chapters and activities beneath the video | Apollo tutorial screen 4226d1f8-4dd3-48d1-8a11-65a2ad2fd2af | Learning navigation and hierarchy | Clickable timestamp list, watch/quiz/homework status strip |
| Labeled authoring fields and explicit Save | Teachable quiz screen a33c3fc3-1198-41ba-8aff-14756ce5b820 | Form pattern, not its AI feature | Attach existing assessments/homework; keep their authoritative access and scoring |
| Instructions → attempt → result → return | Preply flow 9233 | Journey logic | Explicit quiz link; no automatic exam start or fabricated pass status |
| Brief section entrance | React Bits AnimatedContent (official TS source) + Refero motion guide | Continuity only | GSAP 200ms/6px; reduced motion skips animation; content never hidden waiting for scrolling |

Preserve MRLC navy surfaces, teal links, gold primary actions, light/dark tokens,
thin borders and maximum 1200px detail width. Reject decorative gradients,
unnecessary backgrounds, heavy shadows and full-page animation. Watch completion
is a playback signal, not proof of learning. Quiz grading remains server-owned.

New schema is additive. Deploy migrations and regenerate Prisma before using
playlists, activities, notes and enhanced reporting. No production data is modified
as part of implementation or testing.

## Using the workspace

- YouTube lessons save playback inside the app and resume at the last position.
  Furthest progress is kept separately, so rewinding does not erase it. Uploads
  retain their existing tracking. Vimeo embeds cannot report playback yet.
- The lesson owner or admin chooses **Configure Activities** to attach an
  existing same-class quiz/homework and add chapter timestamps. Set the quiz's
  pass mark in Assessments before requiring a pass. Assessment start windows,
  individual assignments, attempts and result release rules remain authoritative.
  Watching alone never marks a required quiz passed.
- Students open the linked quiz or homework in their existing workspaces. The
  **Refresh Status** control updates activity and report statuses after returning.
- Notes are visible only to their author. Questions and teacher replies are shared
  with the author, lesson owner (with class access) and admin, not classmates.
  Timestamps can be typed or taken from the player, then clicked to revisit.
- **Playlists & Units** in the library groups existing lessons. Select lessons and
  use accessible up/down buttons to order them. Students see only lessons their
  account may read. Deleting a playlist does not delete lessons.
- The learning report separates watch, quiz and homework progress. Confirmed
  targeted reminders create in-app notifications only, at most once per
  student/activity/Malaysia calendar day. Draft/closed activities cannot be
  advertised with reminders. There is no automatic email campaign.
- **Playback Check** in lesson creation/editing previews the source without
  autoplay, reports upload conversion status, and explains provider playback
  errors. Embed restrictions and privacy blocking still vary by viewer.

## Deployment and verification

Run `npx prisma migrate deploy` and `npx prisma generate` against the deployment's
configured database before starting this build. The migration only adds tables
and the nullable resume position; existing watch progress remains intact.

`tests/integration/video-learning.test.ts` is guarded to use an explicitly
configured disposable localhost PostgreSQL database on port 55439. Browser tests
use a deterministic YouTube API fixture: they verify our event handling, not
YouTube's external availability or a particular video's licensing restrictions.
