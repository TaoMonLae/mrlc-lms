# UX Review — MRLC LMS

*A workflow-level review of the application as it exists today, covering the admin, teacher, and student experiences. Written July 2, 2026, after a full walkthrough of every screen and the journeys connecting them.*

---

## 1. What Works Well

**Role-aware landing.** Each role lands somewhere sensible after login: students on their own dashboard, teachers on theirs, librarians directly on the book catalog. Nobody starts their day on a screen built for someone else. This sounds basic, but many school systems dump everyone on the same admin-shaped homepage — this app doesn't.

**The grouped sidebar.** The recent reorganization into collapsible groups (People, Academics, Attendance, Resources, Finance & HR, Operations, System) with accordion behavior turned a 30-item wall of links into something scannable. The group containing your current page opens itself, exactly one item highlights, and the everyday destinations — Dashboard, Chat, Announcements — stay permanently visible at the top. Teachers and students got the same treatment scaled to their smaller worlds.

**The homework loop is a conveyor belt.** A student opens Homework and sees "To do" sorted by due date with overdue items in red; submitting is one tap into a form where the phone camera is the primary input — the right call for a school where most work happens on paper. The teacher's marking view puts the whole roster, each submission, the score box, and the Mark button on one screen; there's no per-student page-hopping. This is the best flow in the app and a good template for the others.

**Attendance is forgiving where it matters.** The save button warns when students are unmarked instead of silently submitting partial data, "mark all present" exists for the common case, and the roster shows photos so a teacher matching faces to names isn't working from text alone.

**Honest destructive actions.** Restoring a database backup demands the admin's password and then tells the truth — that restore must be run by an operator on the server — rather than pretending. Archive actions confirm first and are reversible. The system errs on the side of not letting a tired admin destroy the school's data at 10pm.

**Empty states mostly instruct.** "No homework yet. Enjoy the free time!", "Create the first communication record from the form", "Add teachers in the Teachers module first, then assign them here" — most blank screens say what to do next, not just what's missing.

---

## 2. The Core Tension

**The app has grown two of everything, and it makes the user choose.** Two ways to create an exam (the classic form and the newer authoring studio), two kinds of attendance (Daily and Session) presented as an unexplained dropdown, a search box that works on mobile but is decorative on desktop, and until recently two homes for admissions and assignments. Each pair exists for a historical reason the user can't see. Every time the app offers two paths without saying which one is right, it transfers its own indecision onto a teacher who just wants to give a quiz.

---

## 3. The User's Day

### The teacher

**Today.** A teacher logs in and lands on their dashboard, which does show today's sessions — good. To take attendance: tap Attendance group → Take Attendance → choose a mode ("Daily Attendance" vs "Session Attendance" — a choice nothing explains) → pick a class → mark → save. Four to five taps, one of which is a decision the teacher shouldn't have to make twice a day: the app knows their timetable and knows whether the current period is a scheduled session.

To give an exam, the teacher faces the fork described above. The "Exams → New" path walks through a familiar form and publishes immediately. But scheduling windows, access codes, shuffling, and result-release policies live in a *different* place (the exam2 scheduling page), reachable only if you know to open the exam's menu afterward. A teacher who used the simple form has silently published an exam with no time window and a one-attempt limit they never chose. Total: 7–12 taps across up to four screens, with the most important settings hidden on screens the happy path never visits.

**What it should feel like.** The dashboard's "today" list should be tappable: the 9:00 Math session card takes you straight into session attendance for that class, pre-selected — zero decisions, one tap. Exam creation should be one path: create the basics, then be *carried* to scheduling ("When can students take this? Until when? How many attempts?") before anything is published, with sensible defaults shown rather than hidden. The advanced authoring studio stays available as a "power" door inside that flow, not a parallel universe.

**The gap.** Two taps and one recurring mode-decision on attendance; on exams, an entire second system the teacher must discover by accident.

### The student

**Today.** Login → dashboard → Exams (or Homework) → open the item → work. About four to five taps, which is reasonable, and the dashboard shows real data. The weak moments are at the *ends* of flows: after submitting an exam the student sees a result state that depends on a release policy they know nothing about ("Results are not available yet" with no hint of when), and one dashboard widget (library) is effectively always empty, quietly teaching students that parts of their homepage can be ignored — which trains them to ignore the rest of it too.

**What it should feel like.** The dashboard should behave like a to-do list, not a brochure: "Math exam open until Friday — Start", "2 homework due tomorrow — Submit", "New result released — View". When results aren't released yet, say when or why: "Your teacher will release results after marking." Dead widgets should show something or not exist.

**The gap.** The path in is fine; the app goes quiet exactly at the moments a student most wants to know what happens next.

### The admin

**Today.** The admin's day is broad rather than deep: enroll students (4 taps + form — fine), record fees (fine), manage classes (recently overhauled — assign teachers, subjects, and students all work from one profile page now). The persistent irritant is the big search box in the top bar: on desktop it accepts typing and does nothing. It's the most prominent element on every single page, and it's a mannequin. The mobile search dialog works, but only finds students — type a class name or a teacher and you get nothing, on a screen whose placeholder promises "Search students, classes, records...".

**What it should feel like.** Type "Aung" anywhere, from any page, and get students, teachers, and classes in a dropdown, keyboard-navigable, going straight to the profile. For a school office fielding walk-in questions all day, working global search replaces dozens of list-page visits per week. It is likely the single highest-leverage improvement left in the app.

**The gap.** A promise printed on every page that the app doesn't keep.

---

## 4. What to Cut

**The legacy one-shot exam path as a *peer* of the new system.** Keep the simple creation form — teachers like it — but it should stop being a complete, parallel path that ends in "published". It should end by handing off to scheduling. One system, one mental model. (The retired legacy submit endpoint was already removed; this is the front half of the same cleanup.)

**The "Daily vs Session" mode dropdown as the first question on the attendance screen.** The app can infer the answer: if the teacher has a scheduled session right now, default to it; if their school runs daily-register attendance, default to that with their class pre-picked. The dropdown can live on as a small toggle for the exceptions, not the opening interrogation.

**The decorative desktop search input.** Either wire it to the real search dialog or remove it. A control that looks functional and isn't costs more trust than an absent feature. (Wiring it is strongly preferred — see below.)

**The permanently empty student-dashboard library widget.** Show recent library items for their level, or remove the card. A widget that has never once shown content is dashboard rust.

---

## 5. What's Missing

**Working global search (transforms daily work).** One search index across students, teachers, and classes, opened from the top-bar box on desktop and mobile alike, with keyboard access. Every role benefits; the office benefits most.

**A unified exam pipeline (transforms teacher confidence).** Create → questions → schedule → publish as one guided sequence, with the release policy and attempt limit shown as explicit choices with defaults. The current system has all the pieces; they're just not connected in the order a teacher thinks in.

**"What happens next" at flow endings (big lift for students).** After exam submission: when results come. After homework submission: "Your teacher will mark this — you'll see feedback here." After an admin creates a class: "Next: add subjects and assign a teacher" with buttons, instead of returning to the list.

**Tappable "today" on the teacher dashboard (small build, daily payoff).** Each session card deep-links into attendance for that session. This converts the dashboard from a report into a launcher.

**Student notifications for the things that matter to them (nice-to-have, growing in value).** The bell currently carries announcements only. Homework due tomorrow, a released result, a redo request — these are the events a student actually checks their phone for. The pieces exist; the bell just doesn't know about them.

---

## 6. Priorities

Ordered by how much friction each removes, weighted by how many people hit it how often:

1. **Wire the global search** (every role, every page, many times a day — and it's currently a broken promise).
2. **Unify exam creation into one guided path** (every teacher, every assessment; today it silently produces misconfigured exams).
3. **Deep-link the teacher dashboard's "today" sessions into attendance** and default the attendance mode from the timetable (every teacher, twice a day).
4. **Close the loop at flow endings** — result-release messaging for students, "next step" CTAs after admin creation flows (touches everyone lightly but constantly).
5. **Dashboard hygiene** — fix or remove the empty library widget; make student dashboard cards action-oriented ("Start", "Submit", "View") rather than informational.
6. **Extend the notification bell** to homework and results for students (valuable, but builds on #4).

Surface polish — spacing, icons, color consistency — is genuinely in decent shape thanks to the shared component library and recent fixes (dialog widths, tab headers, single-highlight navigation). The remaining work is structural, and the list above is in the order the structure should be tightened.
