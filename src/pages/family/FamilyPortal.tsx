import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Languages, LogOut, Printer, UserRoundSearch } from "lucide-react";
import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/providers/AuthProvider";
import { useSettings } from "@/src/providers/SettingsProvider";
import { useI18n } from "@/src/i18n/I18nProvider";
import { type Learner, type Overview, type ViewKey, views, secondaryButton } from "./familyShared";
import FamilyToday from "./FamilyToday";
import FamilyProgress from "./FamilyProgress";
import FamilyAttendance from "./FamilyAttendance";
import FamilySchedule from "./FamilySchedule";
import FamilyFees from "./FamilyFees";
import FamilyMessages from "./FamilyMessages";
import FamilyPrintSummary from "./FamilyPrintSummary";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function LoadingState() {
  return <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" role="status" aria-label="Loading learner information">
    <div className="space-y-6">{[0, 1].map((key) => <div key={key} className="h-48 animate-pulse rounded-lg border border-border bg-card" />)}</div>
    <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
  </div>;
}

export default function FamilyPortal() {
  const { user, logout } = useAuth();
  const { schoolProfile, brandingSettings } = useSettings();
  const { lang, languages, setLang } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnersError, setLearnersError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [revision, setRevision] = useState(0);
  const [topic, setTopic] = useState("LEARNING");

  const selectedId = learners.some((learner) => learner.id === params.get("student")) ? params.get("student")! : learners[0]?.id;
  const view: ViewKey = views.find((item) => item.key === params.get("view"))?.key || "today";
  const schoolName = schoolProfile.name || "Mon Refugee Learning Centre";

  useEffect(() => {
    const controller = new AbortController();
    setLearnersLoading(true);
    apiGet<Learner[]>("/api/family/students", { signal: controller.signal, timeoutMs: 20000 })
      .then((data) => { setLearners(data); setLearnersError(""); })
      .catch((error) => { if (!controller.signal.aborted) setLearnersError(error.message || "Unable to load your learners"); })
      .finally(() => { if (!controller.signal.aborted) setLearnersLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!selectedId) { setOverview(null); return; }
    const controller = new AbortController();
    setOverviewLoading(true);
    apiGet<Overview>(`/api/family/students/${selectedId}/overview`, { signal: controller.signal, timeoutMs: 25000 })
      .then((data) => { setOverview(data); setOverviewError(""); })
      .catch((error) => { if (!controller.signal.aborted) setOverviewError(error.message || "Unable to load learner information"); })
      .finally(() => { if (!controller.signal.aborted) setOverviewLoading(false); });
    return () => controller.abort();
  }, [selectedId, revision]);

  const goTo = useCallback((nextView: ViewKey, studentId = selectedId) => {
    const next = new URLSearchParams();
    if (studentId) next.set("student", studentId);
    if (nextView !== "today") next.set("view", nextView);
    setParams(next);
    window.scrollTo({ top: 0 });
  }, [selectedId, setParams]);

  const askAbout = (nextTopic: string) => { setTopic(nextTopic); goTo("messages"); };
  const refresh = () => setRevision((value) => value + 1);
  const markRead = () => {
    setLearners((current) => current.map((learner) => learner.id === selectedId ? { ...learner, unreadReplies: 0 } : learner));
    setOverview((current) => current ? { ...current, unreadReplies: 0 } : current);
  };
  const signOut = () => { logout(); navigate("/login", { replace: true }); };
  const selected = learners.find((learner) => learner.id === selectedId);
  const unread = selected?.unreadReplies ?? 0;
  const shown = overview && overview.student.id === selectedId ? overview : null;

  return <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground print:bg-white">
    <a href="#family-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:p-3 focus:text-foreground">Skip to content</a>
    <header className="bg-sidebar text-sidebar-foreground print:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={brandingSettings.logoUrl || "/icon-192.png"} alt="" className="size-10 shrink-0 rounded-md bg-white object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" data-no-i18n>{schoolName}</p>
            <p className="text-xs text-sidebar-foreground/75">Family Portal</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {languages.length > 1 && <label className="relative flex items-center" data-no-i18n>
            <span className="sr-only">Language</span>
            <Languages className="pointer-events-none absolute left-2.5 size-4 text-sidebar-foreground/80" aria-hidden="true" />
            <select value={lang} onChange={(event) => setLang(event.target.value)} className="min-h-10 max-w-[7.5rem] sm:max-w-[10rem] appearance-none rounded-md border border-sidebar-border bg-sidebar-accent py-1 pl-8 pr-3 text-sm font-medium text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              {languages.map((item) => <option key={item.code} value={item.code} className="text-foreground">{item.label}</option>)}
            </select>
          </label>}
          <button type="button" onClick={signOut} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-sidebar-border px-3 text-sm font-medium hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </div>
    </header>

    <main id="family-main" className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6">
      {learnersLoading ? <LoadingState />
        : learnersError ? <div className="py-16"><p role="alert" className="font-medium text-destructive">{learnersError}</p><button type="button" className={`${secondaryButton} mt-4`} onClick={refresh}>Try again</button></div>
        : !learners.length ? <div className="mx-auto max-w-xl py-16">
          <UserRoundSearch className="size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">Welcome, {user?.name?.split(" ")[0] || "family member"}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">Your account is ready, but no learner is linked to it yet. For your learner's safety, the MRLC office checks every family link in person.</p>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground">
            <li>Visit or call the MRLC office.</li>
            <li>Give your name, the email for this account, and your learner's name or student code.</li>
            <li>Once staff link your learner, sign in again and their school information will appear here.</li>
          </ol>
        </div>
        : <>
          <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex min-w-0 items-center gap-4">
              {selected?.profilePhotoUrl ? <img src={selected.profilePhotoUrl} alt="" className="size-14 shrink-0 rounded-full border border-border object-cover" />
                : <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-semibold text-accent-foreground" aria-hidden="true">{initials(selected?.name || "")}</span>}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]" data-no-i18n>{selected?.name}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground"><span data-no-i18n>{[selected?.className, shown?.student.studentCode].filter(Boolean).join(" · ")}</span>{shown && <> · {shown.student.boarding ? "Boarding" : "Day learner"}</>}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {learners.length > 1 && <div role="group" aria-label="Choose learner" className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
                {learners.map((learner) => <button key={learner.id} type="button" onClick={() => goTo(view, learner.id)} aria-pressed={learner.id === selectedId} className={`relative inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${learner.id === selectedId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                  <span data-no-i18n>{learner.name}</span>
                  {learner.unreadReplies > 0 && learner.id !== selectedId && <span className="ml-1.5 size-2 rounded-full bg-destructive" aria-label="new reply" />}
                </button>)}
              </div>}
              <button type="button" onClick={() => window.print()} disabled={!shown} className={secondaryButton}><Printer className="size-4" aria-hidden="true" />Print summary</button>
            </div>
          </div>

          <nav aria-label="Family Portal sections" className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 sm:-mx-6 sm:px-6 print:hidden">
            <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {views.map((item) => <li key={item.key} className="shrink-0">
                <button type="button" onClick={() => goTo(item.key)} ref={view === item.key ? (node) => node?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined} aria-current={view === item.key ? "page" : undefined} className={`relative inline-flex min-h-12 items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${view === item.key ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground after:bg-transparent"}`}>
                  {item.label}
                  {item.key === "messages" && unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-destructive-foreground tabular-nums" aria-label={`${unread} new`}>{unread}</span>}
                </button>
              </li>)}
            </ul>
          </nav>

          <div className="pt-6 print:hidden" aria-busy={overviewLoading}>
            {view === "messages" && selected ? <FamilyMessages studentId={selected.id} studentName={selected.name} topic={topic} setTopic={setTopic} onRead={markRead} alerts={shown?.alerts ?? null} onAlertsChange={(alerts) => setOverview((current) => current ? { ...current, alerts } : current)} />
              : overviewError && !shown ? <div className="py-12"><p role="alert" className="font-medium text-destructive">{overviewError}</p><button type="button" className={`${secondaryButton} mt-4`} onClick={refresh}>Try again</button></div>
              : !shown ? <LoadingState />
              : view === "progress" ? <FamilyProgress overview={shown} goTo={goTo} askAbout={askAbout} />
              : view === "attendance" ? <FamilyAttendance overview={shown} onChanged={refresh} askAbout={askAbout} />
              : view === "schedule" ? <FamilySchedule overview={shown} />
              : view === "fees" ? <FamilyFees overview={shown} askAbout={askAbout} />
              : <FamilyToday overview={shown} goTo={goTo} />}
            {shown && view !== "messages" && <p className="mt-8 text-xs text-muted-foreground">Information as of {new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(shown.asOf))}. Something looks wrong? Send the office a message.</p>}
          </div>
          {shown && <FamilyPrintSummary overview={shown} schoolName={schoolName} />}
        </>}
    </main>
  </div>;
}
