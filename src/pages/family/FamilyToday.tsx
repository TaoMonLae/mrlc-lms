import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, CalendarClock, ChevronRight, Clock, MessageSquareText, Wallet, GraduationCap, CalendarCheck2, Check } from "lucide-react";
import {
  type Overview, type ViewKey, Panel, EmptyLine, linkButton, can, attendanceStats, dateLabel, dayKey, daysBetween, addDays, weekdayOf,
  gedSubjects, readinessSteps, money, labelOf, absenceTypes, plainDateLabel,
} from "./familyShared";

type Props = { overview: Overview; goTo: (view: ViewKey) => void };

export default function FamilyToday({ overview, goTo }: Props) {
  const today = overview.today;
  const [openUpdate, setOpenUpdate] = useState<string | null>(null);

  const todayNotice = overview.absences.find((notice) => notice.status !== "CANCELLED" && notice.startDate.slice(0, 10) <= today && today <= notice.endDate.slice(0, 10));

  const attention = useMemo(() => {
    const items: { id: string; icon: typeof AlertCircle; title: string; detail: string; view: ViewKey; tone: "alert" | "info" }[] = [];
    if (overview.unreadReplies > 0) items.push({ id: "replies", icon: MessageSquareText, title: overview.unreadReplies === 1 ? "The school replied to your message" : "The school replied to your messages", detail: "Read the reply in Messages.", view: "messages", tone: "info" });
    const unexplained = overview.attendance.filter((record) => record.status === "ABSENT" && daysBetween(dayKey(record.date), today) <= 7 && !overview.absences.some((notice) => notice.status !== "CANCELLED" && notice.startDate.slice(0, 10) <= dayKey(record.date) && dayKey(record.date) <= notice.endDate.slice(0, 10)));
    if (unexplained.length) items.push({ id: "absence", icon: AlertCircle, title: unexplained.length === 1 ? "An absence was recorded this week" : `${unexplained.length} absences were recorded this week`, detail: `Most recent: ${dateLabel(unexplained[0].date, { weekday: "long", day: "numeric", month: "short" })}. Tell the school the reason if you know it.`, view: "attendance", tone: "alert" });
    const late = overview.homework.filter((item) => !item.submission && daysBetween(dayKey(item.dueDate), today) > 0);
    if (late.length) items.push({ id: "late", icon: BookOpen, title: late.length === 1 ? "1 piece of class work is past due" : `${late.length} pieces of class work are past due`, detail: "Ask your learner about it, or message the teacher.", view: "progress", tone: "alert" });
    const dueSoon = overview.homework.filter((item) => !item.submission && daysBetween(today, dayKey(item.dueDate)) >= 0 && daysBetween(today, dayKey(item.dueDate)) <= 3);
    if (dueSoon.length) items.push({ id: "soon", icon: Clock, title: dueSoon.length === 1 ? "1 piece of class work is due soon" : `${dueSoon.length} pieces of class work are due soon`, detail: "Due within the next 3 days.", view: "progress", tone: "info" });
    const fees = overview.fees.filter((fee) => fee.balance > 0 && daysBetween(today, dayKey(fee.dueDate)) <= 7);
    if (fees.length) {
      const total = fees.reduce((sum, fee) => sum + fee.balance, 0);
      const overdue = fees.some((fee) => daysBetween(today, dayKey(fee.dueDate)) < 0);
      items.push({ id: "fees", icon: Wallet, title: overdue ? "A fee is past its due date" : "A fee is due this week", detail: `${money(total, fees[0].currency)} to review.`, view: "fees", tone: overdue ? "alert" : "info" });
    }
    const booked = overview.readiness.filter((row) => row.status === "TEST_SCHEDULED");
    if (booked.length) items.push({ id: "booked", icon: GraduationCap, title: "A GED test is booked", detail: booked.map((row) => labelOf(gedSubjects.map((s) => ({ key: s.key, label: s.short })), row.subject)).join(", "), view: "progress", tone: "info" });
    return items;
  }, [overview, today]);

  const learning = can(overview, "LEARNING");
  const attendanceShared = can(overview, "ATTENDANCE");
  const showStudy = learning && overview.student.hasLmsAccount;
  const reviewedRows = overview.readiness.length;
  const todaysClasses = overview.timetable.filter((slot) => slot.day === weekdayOf(today)).sort((a, b) => a.start.localeCompare(b.start));
  const stats = attendanceStats(overview.attendance);
  const readyCount = overview.readiness.filter((row) => ["READY", "TEST_SCHEDULED", "PASSED"].includes(row.status)).length;
  const passedCount = overview.readiness.filter((row) => row.status === "PASSED").length;
  const week = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const studied = new Set(overview.studyDays.map((row) => row.day));
  const studiedThisWeek = week.filter((key) => studied.has(key)).length;

  const comingUp = useMemo(() => {
    const work = overview.homework
      .filter((item) => !item.submission && daysBetween(today, dayKey(item.dueDate)) >= 0 && daysBetween(today, dayKey(item.dueDate)) <= 14)
      .map((item) => ({ id: `w-${item.id}`, key: dayKey(item.dueDate), title: item.title, detail: `${item.subject || "Class work"} due`, kind: "work" as const }));
    const events = overview.events
      .filter((event) => daysBetween(today, dayKey(event.startDate)) <= 21)
      .map((event) => ({ id: `e-${event.id}`, key: dayKey(event.startDate) < today ? today : dayKey(event.startDate), title: event.title, detail: event.eventType === "HOLIDAY" ? "School closed" : event.eventType === "EXAM" ? "Exam" : event.eventType === "MEETING" ? "Meeting" : "School event", kind: "event" as const }));
    return [...work, ...events].sort((a, b) => a.key.localeCompare(b.key)).slice(0, 6);
  }, [overview, today]);

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
    <div className="flex flex-col gap-6">
      <Panel title="Needs your attention" id="attention-title">
        {attention.length ? <ul className="divide-y divide-border">
          {attention.map((item) => {
            const Icon = item.icon;
            return <li key={item.id}>
              <button type="button" onClick={() => goTo(item.view)} className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
                <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-md ${item.tone === "alert" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">{item.title}</span><span className="mt-0.5 block text-sm leading-6 text-muted-foreground">{item.detail}</span></span>
                <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </li>;
          })}
        </ul> : <EmptyLine>Nothing needs attention right now. Late work, absences, fees and school replies will show here first.</EmptyLine>}
      </Panel>

      <Panel title={<span>Today at school <span className="font-normal text-muted-foreground">· {dateLabel(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}</span></span>} id="today-title">
        {todayNotice && <p className="flex items-start gap-3 border-b border-border bg-accent/60 px-5 py-3 text-sm text-accent-foreground sm:px-6"><CalendarCheck2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Your absence notice covers today ({labelOf(absenceTypes, todayNotice.type).toLowerCase()}, {plainDateLabel(todayNotice.startDate, { day: "numeric", month: "short" })} to {plainDateLabel(todayNotice.endDate, { day: "numeric", month: "short" })}).</span></p>}
        {todaysClasses.length ? <ol className="divide-y divide-border">
          {todaysClasses.map((slot) => <li key={slot.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-5 py-3 text-sm sm:px-6">
            <span className="font-medium tabular-nums text-muted-foreground">{slot.start}–{slot.end}</span>
            <span className="min-w-0"><span className="block font-semibold text-foreground">{slot.subject || "Class"}</span><span className="block truncate text-muted-foreground">{[slot.teacher, slot.room].filter(Boolean).join(" · ")}{slot.substituted && <span className="ml-1 font-medium text-warning">· cover teacher</span>}</span></span>
          </li>)}
        </ol> : <EmptyLine>No classes are on the timetable today.</EmptyLine>}
      </Panel>

      <Panel title="Coming up" id="coming-title" action={<button type="button" onClick={() => goTo("schedule")} className={linkButton}>Full schedule <ChevronRight className="size-4" aria-hidden="true" /></button>}>
        {comingUp.length ? <ul className="divide-y divide-border">
          {comingUp.map((item) => <li key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 px-5 py-3 sm:px-6">
            <span className="text-sm font-semibold tabular-nums text-foreground">{item.key === today ? "Today" : plainDateLabel(item.key, { day: "numeric", month: "short" })}</span>
            <span className="min-w-0 text-sm"><span className="block font-medium text-foreground">{item.title}</span><span className="flex items-center gap-1.5 text-muted-foreground">{item.kind === "event" ? <CalendarClock className="size-3.5" aria-hidden="true" /> : <BookOpen className="size-3.5" aria-hidden="true" />}{item.detail}</span></span>
          </li>)}
        </ul> : <EmptyLine>No class work or school events in the next two weeks.</EmptyLine>}
      </Panel>
    </div>

    <div className="flex flex-col gap-6">
      {overview.access.basis === "ADULT_NO_CONSENT" && <Panel title="An adult learner" id="adult-title">
        <p className="px-5 pt-4 text-sm leading-6 text-muted-foreground sm:px-6">{overview.student.name} is 18 or older, so the school asks them before showing learning, attendance or fee records to family. They have not given an answer yet.</p>
        <p className="px-5 pb-4 pt-2 text-sm leading-6 text-muted-foreground sm:px-6">You can still read school updates, see the schedule, send messages and report an absence.</p>
      </Panel>}
      {(attendanceShared || learning) && <Panel title="At a glance" id="glance-title">
        <dl className="divide-y divide-border">
          {attendanceShared && <div className="px-5 py-4 sm:px-6">
            <dt className="text-sm text-muted-foreground">Attendance, last 3 months</dt>
            <dd className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-xl font-semibold tabular-nums text-foreground">{stats.rate == null ? "No records" : `${stats.rate}%`}</span>
              <button type="button" onClick={() => goTo("attendance")} className={linkButton}>Details</button>
            </dd>
            {stats.rate != null && <dd className="text-sm text-muted-foreground">{stats.present} present · {stats.late} late · {stats.absent} absent</dd>}
          </div>}
          {learning && <div className="px-5 py-4 sm:px-6">
            <dt className="text-sm text-muted-foreground">GED subjects ready or passed</dt>
            <dd className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-xl font-semibold tabular-nums text-foreground">{reviewedRows ? `${readyCount} of 4` : "Not assessed yet"}</span>
              <button type="button" onClick={() => goTo("progress")} className={linkButton}>Progress</button>
            </dd>
            <dd className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">
              {gedSubjects.map((subject) => {
                const row = overview.readiness.find((item) => item.subject === subject.key);
                const step = readinessSteps.findIndex((item) => item.key === (row?.status || "NOT_READY"));
                return <span key={subject.key} className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${((step + 1) / readinessSteps.length) * 100}%` }} /></span>;
              })}
            </dd>
            <dd className="mt-1.5 text-sm text-muted-foreground">{reviewedRows ? `${passedCount ? `${passedCount} passed. ` : ""}A learner needs all four GED tests to earn the diploma.` : "Teachers have not recorded readiness yet. This is normal for new learners."}</dd>
          </div>}
          {showStudy && <div className="px-5 py-4 sm:px-6">
            <dt className="text-sm text-muted-foreground">Self-study in the LMS, last 7 days</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{studiedThisWeek} of 7 days</dd>
            <dd className="mt-2">
              <ol className="grid grid-cols-7 gap-1.5" aria-label="Study days this week">
                {week.map((key) => <li key={key} className="flex flex-col items-center gap-1">
                  <span className={`grid size-8 place-items-center rounded-md border text-xs font-semibold ${studied.has(key) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`} aria-label={`${weekdayOf(key)}: ${studied.has(key) ? "studied" : "no activity"}`}>{studied.has(key) && <Check className="size-4" aria-hidden="true" />}</span>
                  <span className="text-[11px] text-muted-foreground" aria-hidden="true">{weekdayOf(key).slice(0, 2)}</span>
                </li>)}
              </ol>
            </dd>
            <dd className="mt-2 text-xs leading-5 text-muted-foreground">Only counts lessons, videos and class work done in the LMS app. Classes, books, paper homework and group study are not counted, so a day without a tick does not mean no study.</dd>
          </div>}
        </dl>
      </Panel>}

      <Panel title="School updates" id="updates-title">
        {overview.announcements.length ? <ul className="divide-y divide-border">
          {overview.announcements.slice(0, 5).map((item) => {
            const open = openUpdate === item.id;
            return <li key={item.id} className="px-5 py-4 sm:px-6">
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{dateLabel(item.createdAt)}{item.pinned && <span className="font-semibold text-foreground">· Pinned</span>}{item.audience === "CLASS" && <span>· {item.className || "Class"} only</span>}</p>
              <h3 className="mt-1 font-semibold text-foreground">{item.title}</h3>
              <p className={`mt-1.5 whitespace-pre-line text-sm leading-6 text-muted-foreground ${open ? "" : "line-clamp-3"}`}>{item.body}</p>
              {item.body.length > 180 && <button type="button" onClick={() => setOpenUpdate(open ? null : item.id)} aria-expanded={open} className={linkButton}>{open ? "Show less" : "Read more"}</button>}
            </li>;
          })}
        </ul> : <EmptyLine>No school updates right now.</EmptyLine>}
      </Panel>
    </div>
  </div>;
}
