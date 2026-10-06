import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, CircleHelp, LogOut, Mail, MessageSquare, Wallet } from "lucide-react";
import { apiGet, apiSend } from "@/src/lib/api";
import { useAuth } from "@/src/providers/AuthProvider";
import { useSettings } from "@/src/providers/SettingsProvider";

type Learner = { id: string; name: string; className: string | null; level: string | null; profilePhotoUrl: string | null };
type Attendance = { id: string; date: string; status: string; remarks: string | null };
type Homework = { id: string; title: string; dueDate: string; status: string; subject: string | null; submission: { status: string; score: number | null; feedback: string | null; markedAt: string | null } | null };
type Grade = { id: string; title: string; subject: string | null; marks: number; maxMarks: number; comment: string | null; date: string };
type Fee = { id: string; description: string; amount: number; paidAmount: number; balance: number; status: string; dueDate: string; paidDate: string | null; receiptNumber: string | null; currency: string };
type Announcement = { id: string; title: string; body: string; pinned: boolean; createdAt: string };
type Overview = { student: { id: string; name: string; className: string | null; level: string | null }; asOf: string; attendance: Attendance[]; homework: Homework[]; grades: Grade[]; fees: Fee[]; announcements: Announcement[]; answeredMessages: number };
type FamilyMessage = { id: string; topic: string; body: string; reply: string | null; status: string; repliedByName: string | null; repliedAt: string | null; createdAt: string };

const views = ["Overview", "Attendance", "Learning", "Fees", "Messages"] as const;
type View = typeof views[number];

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", ...options }).format(new Date(date));
const money = (amount: number, currency = "MYR") => new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(amount);
const localDayNumber = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000;
};
const daysUntil = (date: string) => localDayNumber(new Date(date)) - localDayNumber(new Date());
const topicLabel = (topic: string) => ({ ATTENDANCE: "Attendance", LEARNING: "Learning", FEES: "Fees", OTHER: "Other" }[topic] || topic);

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="mb-6 border-b border-academic-navy-deep/15 pb-5">
    <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-academic-teal">{eyebrow}</p>
    <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-academic-navy-deep sm:text-3xl">{title}</h2>
    {description && <p className="mt-2 text-sm leading-6 text-academic-navy-deep/65">{description}</p>}
  </div>;
}

export default function FamilyPortal() {
  const { user, logout } = useAuth();
  const { schoolProfile, brandingSettings } = useSettings();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnersError, setLearnersError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [messagesError, setMessagesError] = useState("");
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState("LEARNING");
  const [body, setBody] = useState("");
  const [success, setSuccess] = useState("");
  const [revision, setRevision] = useState(0);

  const selectedId = learners.some((learner) => learner.id === params.get("student")) ? params.get("student")! : learners[0]?.id;
  const view: View = views.find((item) => item.toLowerCase() === params.get("view")) || "Overview";

  useEffect(() => {
    const controller = new AbortController();
    setLearnersLoading(true);
    apiGet<Learner[]>("/api/family/students", { signal: controller.signal })
      .then((data) => { setLearners(data); setLearnersError(""); })
      .catch((error) => { if (!controller.signal.aborted) setLearnersError(error.message || "Unable to load linked learners"); })
      .finally(() => { if (!controller.signal.aborted) setLearnersLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!selectedId) { setOverview(null); return; }
    const controller = new AbortController();
    setOverviewLoading(true);
    setOverview(null);
    apiGet<Overview>(`/api/family/students/${selectedId}/overview`, { signal: controller.signal })
      .then((data) => { setOverview(data); setOverviewError(""); })
      .catch((error) => { if (!controller.signal.aborted) setOverviewError(error.message || "Unable to load learner information"); })
      .finally(() => { if (!controller.signal.aborted) setOverviewLoading(false); });
    return () => controller.abort();
  }, [selectedId, revision]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const controller = new AbortController();
    apiGet<FamilyMessage[]>(`/api/family/messages?studentId=${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then((data) => { setMessages(data); setMessagesError(""); })
      .catch((error) => { if (!controller.signal.aborted) setMessagesError(error.message || "Unable to load messages"); });
    return () => controller.abort();
  }, [selectedId, revision]);

  const goTo = (nextView: View, studentId = selectedId) => {
    const next = new URLSearchParams();
    if (studentId) next.set("student", studentId);
    if (nextView !== "Overview") next.set("view", nextView.toLowerCase());
    setParams(next);
    setSuccess("");
  };

  const attention = useMemo(() => {
    if (!overview) return [];
    const items: { title: string; detail: string; view: View }[] = [];
    const lateWork = overview.homework.filter((item) => !item.submission && daysUntil(item.dueDate) < 0);
    const dueSoon = overview.homework.filter((item) => !item.submission && daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 3);
    const recentAbsence = overview.attendance.find((item) => item.status === "ABSENT" && daysUntil(item.date) >= -7);
    const dueFees = overview.fees.filter((item) => item.balance > 0 && daysUntil(item.dueDate) <= 7);
    if (lateWork.length) items.push({ title: `${lateWork.length} assignment${lateWork.length > 1 ? "s" : ""} past due`, detail: "Check the learning page and ask the school if needed.", view: "Learning" });
    if (dueSoon.length) items.push({ title: `${dueSoon.length} assignment${dueSoon.length > 1 ? "s" : ""} due soon`, detail: "See what is coming up this week.", view: "Learning" });
    if (recentAbsence) items.push({ title: "Recent absence recorded", detail: `Attendance entry for ${dateLabel(recentAbsence.date)}.`, view: "Attendance" });
    if (dueFees.length) items.push({ title: "Fee balance to review", detail: "Check the due date and payment information.", view: "Fees" });
    return items;
  }, [overview]);

  const upcoming = useMemo(() => overview?.homework.filter((item) => daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 7).slice(0, 4) || [], [overview]);
  const outstanding = useMemo(() => overview?.fees.reduce((sum, item) => sum + item.balance, 0) || 0, [overview]);
  const currency = overview?.fees[0]?.currency || "MYR";

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || body.trim().length < 5) return;
    setSending(true); setMessagesError(""); setSuccess("");
    try {
      await apiSend("/api/family/messages", "POST", { studentId: selectedId, topic, body: body.trim() });
      setBody("");
      setSuccess("Your message was sent to the MRLC office.");
      const latest = await apiGet<FamilyMessage[]>(`/api/family/messages?studentId=${encodeURIComponent(selectedId)}`);
      setMessages(latest);
    } catch (error: any) {
      setMessagesError(error.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  const signOut = () => { logout(); navigate("/login", { replace: true }); };

  return <div className="min-h-screen bg-[#f3f5f2] text-academic-navy-deep">
    <a href="#family-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <header className="border-b border-white/15 bg-academic-navy-deep text-white">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <img src={brandingSettings.logoUrl || "/icon-192.png"} alt="" className="size-10 shrink-0 bg-card object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{schoolProfile.name || "Mon Refugee Learning Centre"}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-academic-gold">Family Portal</p>
          </div>
        </div>
        <button type="button" onClick={signOut} className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-white/25 px-3 text-xs font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold sm:px-4"><LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span></button>
      </div>
    </header>

    <main id="family-main" className="mx-auto max-w-[1240px] px-5 pb-20 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-academic-navy-deep/15 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-academic-teal">Welcome, {user?.name?.split(" ")[0] || "family"}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Your learner, at a glance.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-academic-navy-deep/65">School updates, learning and support in one place.</p>
        </div>
        {learners.length > 0 && <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em]">
          Learner
          <span className="relative block">
            <select aria-label="Choose learner" value={selectedId} onChange={(event) => goTo("Overview", event.target.value)} className="min-h-12 w-full min-w-[230px] appearance-none border border-academic-navy-deep/30 bg-card px-4 pr-10 text-sm font-bold normal-case tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal">
              {learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-4 size-4" aria-hidden="true" />
          </span>
        </label>}
      </div>

      {learnersLoading ? <p className="py-16 text-sm" role="status">Loading your learners…</p>
        : learnersError ? <div className="py-16"><p role="alert">{learnersError}</p><button className="mt-4 font-bold underline" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>
        : !learners.length ? <div className="max-w-2xl py-16"><CircleHelp className="size-10 text-academic-teal" /><h2 className="mt-5 text-3xl font-black">No learner is linked yet.</h2><p className="mt-3 leading-7 text-academic-navy-deep/70">Ask the MRLC office to verify and link your learner to this account. Once linked, their school information will appear here.</p></div>
        : <>
          <nav aria-label="Family Portal sections" className="flex gap-1 overflow-x-auto border-b border-academic-navy-deep/20 py-2">
            {views.map((item) => <button key={item} type="button" onClick={() => goTo(item)} aria-current={view === item ? "page" : undefined} className={`min-h-12 shrink-0 border-b-[3px] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal ${view === item ? "border-academic-teal text-academic-navy-deep" : "border-transparent text-academic-navy-deep/60 hover:text-academic-navy-deep"}`}>{item}</button>)}
          </nav>

          {overviewLoading ? <p className="py-16 text-sm" role="status">Loading learner information…</p>
            : overviewError ? <div className="py-16"><p role="alert">{overviewError}</p><button className="mt-4 font-bold underline" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>
            : overview && <div className="pt-8">
              {view === "Overview" && <>
                <div className="flex flex-col gap-2 border-b border-academic-navy-deep/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-academic-teal">{overview.student.className || "MRLC learner"}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{overview.student.name}</h2></div>
                  <p className="text-xs text-academic-navy-deep/55">School information checked {dateLabel(overview.asOf, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
                  <section className="bg-card p-6 sm:p-8" aria-labelledby="attention-title">
                    <div className="flex items-center gap-3"><span className="grid size-10 place-items-center bg-academic-gold"><ArrowRight className="size-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-academic-teal">Start here</p><h3 id="attention-title" className="text-2xl font-black tracking-[-0.03em]">Needs attention</h3></div></div>
                    <div className="mt-6 border-t border-academic-navy-deep/15">
                      {attention.length ? attention.map((item) => <button key={item.title} onClick={() => goTo(item.view)} className="flex w-full items-center justify-between gap-5 border-b border-academic-navy-deep/15 py-5 text-left hover:text-academic-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal"><span><strong className="block text-base">{item.title}</strong><span className="mt-1 block text-sm text-academic-navy-deep/65">{item.detail}</span></span><ArrowRight className="size-5 shrink-0" /></button>)
                        : <p className="py-6 text-sm leading-6 text-academic-navy-deep/70">Nothing needs attention right now. New work and school updates will appear here.</p>}
                    </div>
                  </section>
                  <section className="border-t-4 border-academic-teal bg-[#dbece7] p-6 sm:p-8" aria-labelledby="week-title">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-academic-teal">Coming up</p><h3 id="week-title" className="mt-2 text-2xl font-black tracking-[-0.03em]">This week</h3>
                    <div className="mt-6 space-y-0 border-t border-academic-navy-deep/15">
                      {upcoming.length ? upcoming.map((item) => <div key={item.id} className="grid grid-cols-[5rem_1fr] gap-4 border-b border-academic-navy-deep/15 py-4 text-sm"><strong>{dateLabel(item.dueDate, { day: "numeric", month: "short" })}</strong><span>{item.title}<span className="mt-1 block text-xs text-academic-navy-deep/60">{item.submission ? "Submitted" : item.subject || "School work"}</span></span></div>) : <p className="py-5 text-sm text-academic-navy-deep/65">No work due in the next seven days.</p>}
                    </div>
                    <button onClick={() => goTo("Learning")} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:underline">View learning <ArrowRight className="size-4" /></button>
                  </section>
                </div>
                <div className="mt-8 grid gap-8 lg:grid-cols-2">
                  <section className="border-t border-academic-navy-deep/20 pt-5"><div className="flex items-center gap-3"><CalendarDays className="size-5 text-academic-teal" /><h3 className="text-xl font-black">Attendance</h3></div><p className="mt-3 text-sm leading-6 text-academic-navy-deep/70">{overview.attendance.length ? `${overview.attendance.filter((item) => item.status === "PRESENT").length} present, ${overview.attendance.filter((item) => item.status === "ABSENT").length} absent, ${overview.attendance.filter((item) => item.status === "LATE").length} late in the last 30 days with recorded attendance.` : "No attendance has been recorded in the last 30 days."}</p><button onClick={() => goTo("Attendance")} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-academic-teal hover:underline">See attendance <ArrowRight className="size-4" /></button></section>
                  <section className="border-t border-academic-navy-deep/20 pt-5"><div className="flex items-center gap-3"><Wallet className="size-5 text-academic-teal" /><h3 className="text-xl font-black">Fees & receipts</h3></div><p className="mt-3 text-sm leading-6 text-academic-navy-deep/70">{overview.fees.length ? `Current recorded balance: ${money(outstanding, currency)}.` : "No fee records are available for this learner."}</p><button onClick={() => goTo("Fees")} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-academic-teal hover:underline">View statement <ArrowRight className="size-4" /></button></section>
                </div>
                <section className="mt-12" aria-labelledby="updates-title"><SectionHeading eyebrow="From MRLC" title="School updates" /><div id="updates-title" className="grid gap-4 sm:grid-cols-2">{overview.announcements.length ? overview.announcements.slice(0, 4).map((item) => <article key={item.id} className="border border-academic-navy-deep/15 bg-card p-6"><p className="text-xs text-academic-navy-deep/55">{dateLabel(item.createdAt)}</p><h3 className="mt-2 text-lg font-bold">{item.title}</h3><p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-academic-navy-deep/70">{item.body}</p></article>) : <p className="text-sm text-academic-navy-deep/65">No school updates are available right now.</p>}</div></section>
              </>}

              {view === "Attendance" && <section><SectionHeading eyebrow={overview.student.name} title="Attendance" description="Recorded attendance from the last 30 days. Contact the school if a record needs review." /><div className="max-w-3xl border-t border-academic-navy-deep/20">{overview.attendance.length ? overview.attendance.map((item) => <div key={item.id} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-academic-navy-deep/15 py-4 sm:grid-cols-[9rem_8rem_1fr]"><span className="text-sm font-semibold">{dateLabel(item.date)}</span><strong className={item.status === "ABSENT" ? "text-rose-700" : item.status === "LATE" ? "text-amber-700" : "text-academic-teal"}>{item.status.toLowerCase()}</strong><span className="text-sm text-academic-navy-deep/65">{item.remarks || ""}</span></div>) : <p className="py-6 text-sm text-academic-navy-deep/65">No attendance records in this period.</p>}</div><button onClick={() => { setTopic("ATTENDANCE"); goTo("Messages"); }} className="mt-7 inline-flex min-h-12 items-center gap-2 bg-academic-navy-deep px-5 text-sm font-bold text-white hover:bg-academic-teal">Ask about attendance <ArrowRight className="size-4" /></button></section>}

              {view === "Learning" && <section><SectionHeading eyebrow={overview.student.name} title="Learning & progress" description="Upcoming class work and the most recent recorded results." /><div className="grid gap-10 lg:grid-cols-2"><div><h3 className="mb-4 flex items-center gap-2 text-lg font-black"><BookOpen className="size-5 text-academic-teal" /> Class work</h3><div className="border-t border-academic-navy-deep/20">{overview.homework.length ? overview.homework.map((item) => <div key={item.id} className="border-b border-academic-navy-deep/15 py-4"><div className="flex justify-between gap-4"><strong>{item.title}</strong><span className="shrink-0 text-xs font-bold text-academic-teal">{item.submission ? item.submission.status.toLowerCase() : daysUntil(item.dueDate) < 0 ? "past due" : "upcoming"}</span></div><p className="mt-1 text-sm text-academic-navy-deep/60">{item.subject || "Class work"} · Due {dateLabel(item.dueDate)}</p>{item.submission?.feedback && <p className="mt-2 text-sm leading-6 text-academic-navy-deep/75">Teacher feedback: {item.submission.feedback}</p>}</div>) : <p className="py-5 text-sm text-academic-navy-deep/65">No recent class work is available.</p>}</div></div><div><h3 className="mb-4 text-lg font-black">Recent results</h3><div className="border-t border-academic-navy-deep/20">{overview.grades.length ? overview.grades.map((grade) => <div key={grade.id} className="border-b border-academic-navy-deep/15 py-4"><div className="flex justify-between gap-4"><strong>{grade.title}</strong><span className="shrink-0 font-black">{grade.marks} / {grade.maxMarks}</span></div><p className="mt-1 text-sm text-academic-navy-deep/60">{grade.subject || "Assessment"} · {dateLabel(grade.date)}</p>{grade.comment && <p className="mt-2 text-sm leading-6 text-academic-navy-deep/75">{grade.comment}</p>}</div>) : <p className="py-5 text-sm text-academic-navy-deep/65">No results are available yet.</p>}</div></div></div></section>}

              {view === "Fees" && <section><SectionHeading eyebrow={overview.student.name} title="Fees & receipts" description="Read-only school fee records. For payment arrangements, contact the MRLC office." /><div className="mb-8 max-w-md border-t-4 border-academic-gold bg-card p-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-academic-teal">Recorded balance</p><p className="mt-3 text-4xl font-black tracking-[-0.05em]">{money(outstanding, currency)}</p></div><div className="max-w-4xl border-t border-academic-navy-deep/20">{overview.fees.length ? [...overview.fees].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((fee) => <div key={fee.id} className="grid gap-2 border-b border-academic-navy-deep/15 py-5 sm:grid-cols-[1fr_auto]"><div><h3 className="font-bold">{fee.description}</h3><p className="mt-1 text-sm text-academic-navy-deep/60">Due {dateLabel(fee.dueDate)} · {fee.status.toLowerCase()}{fee.receiptNumber ? ` · Receipt ${fee.receiptNumber}` : ""}</p></div><div className="text-left sm:text-right"><strong>{money(fee.amount, fee.currency)}</strong><p className="text-sm text-academic-navy-deep/65">{fee.balance > 0 ? `${money(fee.balance, fee.currency)} remaining` : "Settled"}</p></div></div>) : <p className="py-6 text-sm text-academic-navy-deep/65">No fee records are available.</p>}</div><button onClick={() => { setTopic("FEES"); goTo("Messages"); }} className="mt-7 inline-flex min-h-12 items-center gap-2 bg-academic-navy-deep px-5 text-sm font-bold text-white hover:bg-academic-teal">Ask about a fee <ArrowRight className="size-4" /></button></section>}

              {view === "Messages" && <section><SectionHeading eyebrow="MRLC office" title="Messages" description="Send a question about your linked learner. School staff will reply here." /><div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]"><form onSubmit={sendMessage} className="self-start bg-card p-6 sm:p-8"><h3 className="text-lg font-black">New message</h3><label className="mt-5 block text-sm font-bold">Topic<select value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-2 block min-h-12 w-full border border-academic-navy-deep/25 bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal"><option value="LEARNING">Learning</option><option value="ATTENDANCE">Attendance</option><option value="FEES">Fees</option><option value="OTHER">Other</option></select></label><label className="mt-5 block text-sm font-bold">Your message<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={6} className="mt-2 block w-full resize-y border border-academic-navy-deep/25 p-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal" placeholder="What would you like the school to know?" /></label><p className="mt-2 text-xs text-academic-navy-deep/55">For urgent matters, please contact the school directly.</p><button type="submit" disabled={sending || body.trim().length < 5} className="mt-5 inline-flex min-h-12 items-center gap-2 bg-academic-navy-deep px-5 text-sm font-bold text-white hover:bg-academic-teal disabled:cursor-not-allowed disabled:opacity-50"><Mail className="size-4" />{sending ? "Sending…" : "Send to MRLC"}</button>{success && <p role="status" className="mt-4 text-sm font-semibold text-academic-teal">{success}</p>}{messagesError && <p role="alert" className="mt-4 text-sm text-rose-700">{messagesError}</p>}</form><div><h3 className="mb-5 flex items-center gap-2 text-lg font-black"><MessageSquare className="size-5 text-academic-teal" /> Conversation history</h3><div className="space-y-4">{messages.length ? messages.map((message) => <article key={message.id} className="border border-academic-navy-deep/15 bg-card p-5 sm:p-6"><div className="flex flex-wrap justify-between gap-2"><strong>{topicLabel(message.topic)}</strong><span className="text-xs text-academic-navy-deep/55">{dateLabel(message.createdAt)}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-6">{message.body}</p>{message.reply ? <div className="mt-5 border-l-2 border-academic-teal bg-[#e8f4ef] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-academic-teal">MRLC reply · {message.repliedByName || "School staff"}</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{message.reply}</p></div> : <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-academic-navy-deep/50">Awaiting reply</p>}</article>) : <p className="border-t border-academic-navy-deep/15 py-5 text-sm text-academic-navy-deep/65">No messages yet. You can send the school a question here.</p>}</div></div></div></section>}
            </div>}
        </>}
    </main>
  </div>;
}
