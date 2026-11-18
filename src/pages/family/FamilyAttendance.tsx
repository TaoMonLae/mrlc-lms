import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Minus, X, Send } from "lucide-react";
import { apiSend } from "@/src/lib/api";
import {
  type Overview, type AttendanceRecord, Panel, EmptyLine, ViewHeading, SharingNotice, can, attendanceStats, dateLabel, plainDateLabel, dayKey, addDays,
  absenceTypes, labelOf, primaryButton, secondaryButton, fieldClass, keyToUtc, linkButton,
} from "./familyShared";

type Props = { overview: Overview; onChanged: () => void; askAbout: (topic: string) => void };

const severity: Record<AttendanceRecord["status"], number> = { ABSENT: 4, LATE: 3, EXCUSED: 2, PRESENT: 1 };
const statusMeta: Record<AttendanceRecord["status"], { label: string; icon: typeof Check; cell: string; text: string }> = {
  PRESENT: { label: "Present", icon: Check, cell: "bg-success/12 text-success border-success/30", text: "text-success" },
  LATE: { label: "Late", icon: Clock, cell: "bg-warning/12 text-warning border-warning/40", text: "text-warning" },
  ABSENT: { label: "Absent", icon: X, cell: "bg-destructive/10 text-destructive border-destructive/40", text: "text-destructive" },
  EXCUSED: { label: "Excused", icon: Minus, cell: "bg-muted text-muted-foreground border-border", text: "text-muted-foreground" },
};
const noticeStatus: Record<string, string> = { SUBMITTED: "Sent, waiting for the office", ACKNOWLEDGED: "Received by the office", CANCELLED: "Cancelled" };

export default function FamilyAttendance({ overview, onChanged, askAbout }: Props) {
  const today = overview.today;
  const stats = attendanceStats(overview.attendance);
  const months = useMemo(() => [0, 1, 2].map((offset) => {
    const [y, m] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 - offset, 1));
    return date.toISOString().slice(0, 7);
  }), [today]);
  const [monthIndex, setMonthIndex] = useState(0);
  const month = months[monthIndex];

  const byDay = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    overview.attendance.forEach((record) => {
      const key = dayKey(record.date);
      const existing = map.get(key);
      if (!existing || severity[record.status] > severity[existing.status]) map.set(key, record);
    });
    return map;
  }, [overview.attendance]);

  const noticeFor = (key: string) => overview.absences.find((notice) => notice.status !== "CANCELLED" && notice.startDate.slice(0, 10) <= key && key <= notice.endDate.slice(0, 10));

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const offset = (new Date(keyToUtc(first)).getUTCDay() + 6) % 7;
    const [y, m] = month.split("-").map(Number);
    const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array(offset).fill(null), ...Array.from({ length }, (_, index) => addDays(first, index))];
  }, [month]);

  const monthRecords = overview.attendance.filter((record) => dayKey(record.date).startsWith(month));

  const boardingOnly = overview.student.boarding ? absenceTypes : absenceTypes.filter((type) => type.key !== "HOME_VISIT");
  const [type, setType] = useState<string>("ILLNESS");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (endDate < startDate) { setError("The last day must be on or after the first day."); return; }
    setSending(true); setError(""); setSent("");
    try {
      await apiSend("/api/family/absences", "POST", { studentId: overview.student.id, type, startDate, endDate, reason: reason.trim() });
      setReason("");
      setSent("Absence notice sent. The office will see it today.");
      onChanged();
    } catch (reasonError: any) {
      setError(reasonError.message || "Unable to send the notice. Check your connection and try again.");
    } finally { setSending(false); }
  };

  const cancel = async (id: string) => {
    setCancelling(id); setError("");
    try {
      await apiSend(`/api/family/absences/${id}/cancel`, "POST");
      onChanged();
    } catch (reasonError: any) {
      setError(reasonError.message || "Unable to cancel the notice.");
    } finally { setCancelling(null); }
  };

  const monthLabel = new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(keyToUtc(`${month}-01`)));

  return <div>
    <ViewHeading title="Attendance" description="Daily attendance from the last three months, and notices you have sent about absences." action={<a href="#report-title" className={`${secondaryButton} lg:hidden`}>Report an absence</a>} />

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {!can(overview, "ATTENDANCE") ? <SharingNotice overview={overview} scope="ATTENDANCE" /> : <div className="flex flex-col gap-6">
        <Panel>
          <dl className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
            <div className="px-5 py-4"><dt className="text-sm text-muted-foreground">Attendance rate</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.rate == null ? "–" : `${stats.rate}%`}</dd></div>
            <div className="px-5 py-4"><dt className="text-sm text-muted-foreground">Present</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.present}</dd></div>
            <div className="border-t border-border px-5 py-4 sm:border-t-0"><dt className="text-sm text-muted-foreground">Late</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.late}</dd></div>
            <div className="border-t border-border px-5 py-4 sm:border-t-0"><dt className="text-sm text-muted-foreground">Absent</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.absent}</dd></div>
          </dl>
        </Panel>

        <Panel title={monthLabel} id="calendar-title" action={<div className="flex gap-1">
          <button type="button" onClick={() => setMonthIndex((value) => Math.min(value + 1, months.length - 1))} disabled={monthIndex === months.length - 1} aria-label="Previous month" className="grid size-10 place-items-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => setMonthIndex((value) => Math.max(value - 1, 0))} disabled={monthIndex === 0} aria-label="Next month" className="grid size-10 place-items-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"><ChevronRight className="size-5" /></button>
        </div>}>
          <div className="px-3 pb-4 pt-3 sm:px-5">
            <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted-foreground" aria-hidden="true">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <ol className="grid grid-cols-7 gap-1">
              {cells.map((key, index) => {
                if (!key) return <li key={`blank-${index}`} aria-hidden="true" />;
                const record = byDay.get(key);
                const notice = noticeFor(key);
                const meta = record ? statusMeta[record.status] : null;
                const Icon = meta?.icon;
                const isToday = key === today;
                const future = key > today;
                const label = `${plainDateLabel(key, { weekday: "long", day: "numeric", month: "long" })}: ${meta ? meta.label : future ? "upcoming" : "no record"}${notice ? ", absence notice sent" : ""}`;
                return <li key={key} aria-label={label} className={`relative flex h-12 flex-col sm:h-14 items-center justify-center rounded-md border text-xs ${meta ? meta.cell : "border-transparent text-muted-foreground"} ${notice ? "outline-2 outline-dashed outline-offset-[-3px] outline-primary/60" : ""} ${isToday ? "ring-2 ring-foreground" : ""} ${future ? "opacity-60" : ""}`}>
                  <span className="font-semibold tabular-nums">{Number(key.slice(8))}</span>
                  {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                </li>;
              })}
            </ol>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {(Object.keys(statusMeta) as AttendanceRecord["status"][]).map((status) => {
                const Icon = statusMeta[status].icon;
                return <li key={status} className="inline-flex items-center gap-1.5"><span className={`grid size-5 place-items-center rounded border ${statusMeta[status].cell}`}><Icon className="size-3" aria-hidden="true" /></span>{statusMeta[status].label}</li>;
              })}
              <li className="inline-flex items-center gap-1.5"><span className="size-5 rounded outline-2 outline-dashed outline-offset-[-3px] outline-primary/60" />Notice sent</li>
            </ul>
          </div>
          {monthRecords.some((record) => record.status !== "PRESENT" || record.remarks) && <ul className="divide-y divide-border border-t border-border">
            {monthRecords.filter((record) => record.status !== "PRESENT" || record.remarks).map((record) => <li key={record.id} className="grid grid-cols-[7.5rem_5.5rem_minmax(0,1fr)] gap-3 px-5 py-3 text-sm sm:px-6">
              <span className="text-foreground">{dateLabel(record.date, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className={`font-semibold ${statusMeta[record.status].text}`}>{statusMeta[record.status].label}</span>
              <span className="text-muted-foreground">{record.remarks || ""}</span>
            </li>)}
          </ul>}
          <div className="border-t border-border px-5 py-3 sm:px-6"><button type="button" onClick={() => askAbout("ATTENDANCE")} className={linkButton}>Question about a record? Message the office</button></div>
        </Panel>
      </div>}

      <div className="flex flex-col gap-6">
        <Panel title="Report an absence" id="report-title">
          <form onSubmit={submit} className="px-5 pb-6 pt-4 sm:px-6" noValidate>
            <fieldset>
              <legend className="text-sm font-semibold text-foreground">Reason</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {boardingOnly.map((item) => <label key={item.key} className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${type === item.key ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border text-foreground hover:bg-muted"}`}>
                  <input type="radio" name="absence-type" value={item.key} checked={type === item.key} onChange={() => setType(item.key)} className="sr-only" />{item.label}
                </label>)}
              </div>
            </fieldset>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-foreground">First day
                <input type="date" required value={startDate} min={addDays(today, -14)} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value); }} className={fieldClass} />
              </label>
              <label className="block text-sm font-semibold text-foreground">Last day
                <input type="date" required value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} />
              </label>
            </div>
            <label className="mt-5 block text-sm font-semibold text-foreground">Note for the office
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} required className={`${fieldClass} py-2.5 font-normal`} placeholder="For example: fever since last night, will return Monday." />
            </label>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">You can report days up to 14 days ago. For emergencies, call the school as well.</p>
            <button type="submit" disabled={sending || reason.trim().length < 3 || !startDate || !endDate} className={`${primaryButton} mt-5 w-full sm:w-auto`}><Send className="size-4" aria-hidden="true" />{sending ? "Sending…" : "Send absence notice"}</button>
            {sent && <p role="status" className="mt-3 text-sm font-medium text-success">{sent}</p>}
            {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}
          </form>
        </Panel>

        <Panel title="Your notices" id="notices-title">
          {overview.absences.length ? <ul className="divide-y divide-border">
            {overview.absences.map((notice) => {
              const sameDay = notice.startDate.slice(0, 10) === notice.endDate.slice(0, 10);
              const canCancel = notice.status === "SUBMITTED" && notice.startDate.slice(0, 10) >= today;
              return <li key={notice.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-semibold text-foreground">{sameDay ? plainDateLabel(notice.startDate, { weekday: "short", day: "numeric", month: "short" }) : `${plainDateLabel(notice.startDate, { day: "numeric", month: "short" })} – ${plainDateLabel(notice.endDate, { day: "numeric", month: "short" })}`}</p>
                  <p className={`text-sm font-medium ${notice.status === "ACKNOWLEDGED" ? "text-success" : notice.status === "CANCELLED" ? "text-muted-foreground line-through" : "text-foreground"}`}>{noticeStatus[notice.status]}</p>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{labelOf(absenceTypes, notice.type)} · {notice.reason}</p>
                {notice.staffNote && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm leading-6 text-foreground"><span className="font-semibold">{notice.acknowledgedByName || "Office"}:</span> {notice.staffNote}</p>}
                {canCancel && <button type="button" onClick={() => cancel(notice.id)} disabled={cancelling === notice.id} className={`${secondaryButton} mt-3 min-h-10`}>{cancelling === notice.id ? "Cancelling…" : "Cancel notice"}</button>}
              </li>;
            })}
          </ul> : <EmptyLine>No absence notices yet.</EmptyLine>}
        </Panel>
      </div>
    </div>
  </div>;
}
