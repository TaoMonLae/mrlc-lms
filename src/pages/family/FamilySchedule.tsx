import { CalendarDays, MapPin } from "lucide-react";
import { type Overview, Panel, EmptyLine, ViewHeading, weekdays, weekdayOf, dayKey, plainDateLabel } from "./familyShared";

const eventLabel: Record<string, string> = { HOLIDAY: "Holiday · school closed", EXAM: "Exam", MEETING: "Meeting", ACTIVITY: "Activity", SCHOOL: "School event" };

export default function FamilySchedule({ overview }: { overview: Overview }) {
  const todayName = weekdayOf(overview.today);
  const days = weekdays.filter((day) => overview.timetable.some((slot) => slot.day === day));
  const ordered = [...days.slice(days.indexOf(todayName) >= 0 ? days.indexOf(todayName) : 0), ...days.slice(0, days.indexOf(todayName) >= 0 ? days.indexOf(todayName) : 0)];

  return <div>
    <ViewHeading title="Schedule" description={`Weekly classes for ${overview.student.className || "your learner's class"}, and school dates for the next two months.`} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel title="Weekly timetable" id="timetable-title">
        {ordered.length ? <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          {ordered.map((day) => <section key={day} aria-labelledby={`day-${day}`} className="border-border px-5 py-4 sm:border-b sm:px-6 sm:odd:border-r">
            <h3 id={`day-${day}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">{day}{day === todayName && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Today</span>}</h3>
            <ol className="mt-2 space-y-2">
              {overview.timetable.filter((slot) => slot.day === day).sort((a, b) => a.start.localeCompare(b.start)).map((slot) => <li key={slot.id} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 text-sm">
                <span className="tabular-nums text-muted-foreground">{slot.start}–{slot.end}</span>
                <span className="min-w-0"><span className="block font-medium text-foreground">{slot.subject || "Class"}</span><span className="block truncate text-muted-foreground">{[slot.teacher, slot.room].filter(Boolean).join(" · ")}</span></span>
              </li>)}
            </ol>
          </section>)}
        </div> : <EmptyLine>The school has not published a timetable for this class yet.</EmptyLine>}
      </Panel>

      <Panel title="School dates" id="dates-title">
        {overview.events.length ? <ul className="divide-y divide-border">
          {overview.events.map((event) => {
            const start = dayKey(event.startDate);
            const end = event.endDate ? dayKey(event.endDate) : null;
            return <li key={event.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 px-5 py-4 sm:px-6">
              <span className="flex flex-col items-center self-start rounded-md border border-border py-1.5 text-center leading-none">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">{plainDateLabel(start, { month: "short" })}</span>
                <span className="mt-1 text-lg font-semibold tabular-nums text-foreground">{Number(start.slice(8))}</span>
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{event.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{eventLabel[event.eventType] || "School event"}{end && end !== start ? ` · until ${plainDateLabel(end, { day: "numeric", month: "short" })}` : ""}</p>
                {event.location && <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{event.location}</p>}
                {event.notes && <p className="mt-1.5 text-sm leading-6 text-foreground">{event.notes}</p>}
              </div>
            </li>;
          })}
        </ul> : <div className="flex items-start gap-3 px-5 py-6 text-sm text-muted-foreground sm:px-6"><CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />No holidays, exams or events are on the school calendar for the next two months.</div>}
      </Panel>
    </div>
  </div>;
}
