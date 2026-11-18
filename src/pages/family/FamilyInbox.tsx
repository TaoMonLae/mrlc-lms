import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Check, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { apiGet, apiSend } from "@/src/lib/api";

type InboxMessage = {
  id: string; topic: string; body: string; reply: string | null; status: string;
  createdAt: string; repliedAt: string | null; repliedByName: string | null; guardianReadAt: string | null;
  guardian: { firstName: string; lastName: string; email: string };
  student: { preferredName: string | null; studentCode: string; user: { firstName: string; lastName: string } | null };
};
type InboxNotice = {
  id: string; type: string; startDate: string; endDate: string; reason: string; status: string; staffNote: string | null;
  acknowledgedByName: string | null; acknowledgedAt: string | null; createdAt: string;
  guardian: { firstName: string; lastName: string; email: string };
  student: { preferredName: string | null; studentCode: string; class: { name: string } | null; user: { firstName: string; lastName: string } | null };
};

type FamilyLink = {
  id: string;
  guardian: { name: string; email: string; active: boolean };
  student: { id: string; name: string; code: string; className: string | null };
  age: number | null; adultFrom: string | null; basis: "MINOR" | "AGE_UNKNOWN" | "ADULT_CONSENT" | "ADULT_NO_CONSENT"; scopes: string[];
  consent: { scopes: string[]; at: string | null; byName: string | null; note: string | null };
};
const scopeOptions = [{ key: "LEARNING", label: "Learning and results" }, { key: "ATTENDANCE", label: "Attendance" }, { key: "FEES", label: "Fees" }];
const basisLabel: Record<FamilyLink["basis"], string> = { MINOR: "Under 18 · family sees everything", AGE_UNKNOWN: "Date of birth missing · family sees everything", ADULT_CONSENT: "18+ · learner's choice recorded", ADULT_NO_CONSENT: "18+ · waiting for learner's choice" };
const topicLabel: Record<string, string> = { LEARNING: "Learning", ATTENDANCE: "Attendance", WELLBEING: "Wellbeing", FEES: "Fees", OTHER: "Other" };
const typeLabel: Record<string, string> = { ILLNESS: "Illness", MEDICAL: "Medical appointment", FAMILY: "Family matter", TRAVEL: "Travel", HOME_VISIT: "Home visit", OTHER: "Other" };
const personName = (person: { firstName: string; lastName: string } | null | undefined) => [person?.firstName, person?.lastName].filter(Boolean).join(" ");
const learnerName = (student: { preferredName: string | null; studentCode: string; user: { firstName: string; lastName: string } | null }) => student.preferredName || personName(student.user) || student.studentCode;
const plainDate = (value: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
const stamp = (value: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium" }).format(new Date(value));
const fieldClass = "mt-1.5 block w-full resize-y rounded-md border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const primaryButton = "inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export default function FamilyInbox() {
  const [tab, setTab] = useState<"messages" | "absences" | "links">("messages");
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [consentDraft, setConsentDraft] = useState<Record<string, string[]>>({});
  const [excuse, setExcuse] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [notices, setNotices] = useState<InboxNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      apiGet<InboxMessage[]>("/api/family/inbox", { signal: controller.signal }),
      apiGet<InboxNotice[]>("/api/family/absences/inbox", { signal: controller.signal }),
      apiGet<FamilyLink[]>("/api/family/links", { signal: controller.signal }),
    ])
      .then(([messageData, noticeData, linkData]) => { setMessages(messageData); setNotices(noticeData); setLinks(linkData); setError(""); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message || "Unable to load the family inbox"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  const reply = async (id: string) => {
    const text = drafts[id]?.trim();
    if (!text || text.length < 2) return;
    setSaving(id); setError("");
    try {
      await apiSend(`/api/family/inbox/${id}`, "PATCH", { reply: text });
      setDrafts((current) => ({ ...current, [id]: "" }));
      setRevision((value) => value + 1);
    } catch (reason: any) {
      setError(reason.message || "Unable to send reply");
    } finally { setSaving(null); }
  };

  const acknowledge = async (id: string) => {
    setSaving(id); setError("");
    try {
      await apiSend(`/api/family/absences/${id}/acknowledge`, "PATCH", { staffNote: drafts[id]?.trim() || undefined, markExcused: excuse[id] !== false });
      setDrafts((current) => ({ ...current, [id]: "" }));
      setRevision((value) => value + 1);
    } catch (reason: any) {
      setError(reason.message || "Unable to acknowledge notice");
    } finally { setSaving(null); }
  };

  const saveConsent = async (link: FamilyLink) => {
    const scopes = consentDraft[link.id] ?? link.consent.scopes;
    const note = drafts[`consent-${link.id}`]?.trim() || "";
    if (note.length < 3) { setError("Add a short note saying how the learner gave their answer, for example: signed form, 19 Nov."); return; }
    setSaving(link.id); setError("");
    try {
      await apiSend(`/api/family/links/${link.id}/consent`, "PUT", { scopes, note });
      setDrafts((current) => ({ ...current, [`consent-${link.id}`]: "" }));
      setRevision((value) => value + 1);
    } catch (reason: any) {
      setError(reason.message || "Unable to save the learner's choice");
    } finally { setSaving(null); }
  };

  const waitingLinks = links.filter((link) => link.basis === "ADULT_NO_CONSENT").length;
  const sortedLinks = useMemo(() => [...links].sort((a, b) => {
    const rank = { ADULT_NO_CONSENT: 0, AGE_UNKNOWN: 1, ADULT_CONSENT: 2, MINOR: 3 } as const;
    return rank[a.basis] - rank[b.basis] || a.student.name.localeCompare(b.student.name);
  }), [links]);
  const turning18 = (link: FamilyLink) => link.basis === "MINOR" && link.adultFrom && new Date(link.adultFrom).getTime() - Date.now() < 60 * 86_400_000;

  const openMessages = messages.filter((message) => message.status === "OPEN").length;
  const newNotices = notices.filter((notice) => notice.status === "SUBMITTED").length;
  const sortedNotices = useMemo(() => [...notices].sort((a, b) => (a.status === "SUBMITTED" ? 0 : 1) - (b.status === "SUBMITTED" ? 0 : 1) || a.startDate.localeCompare(b.startDate)), [notices]);

  const tabClass = (active: boolean) => `relative inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${active ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground after:bg-transparent"}`;
  const count = (value: number) => value > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground tabular-nums">{value}</span>;

  return <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
    <header>
      <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.02em] text-foreground"><MessageSquare className="size-6 text-primary" aria-hidden="true" />Family inbox</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Messages and absence notices from verified guardian accounts.</p>
    </header>

    <div role="tablist" aria-label="Family inbox" className="flex gap-1 border-b border-border">
      <button type="button" role="tab" aria-selected={tab === "messages"} onClick={() => setTab("messages")} className={tabClass(tab === "messages")}>Messages{count(openMessages)}</button>
      <button type="button" role="tab" aria-selected={tab === "absences"} onClick={() => setTab("absences")} className={tabClass(tab === "absences")}>Absence notices{count(newNotices)}</button>
      <button type="button" role="tab" aria-selected={tab === "links"} onClick={() => setTab("links")} className={tabClass(tab === "links")}>Family links{count(waitingLinks)}</button>
    </div>

    {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="ml-2 font-semibold underline">Try again</button></p>}

    {loading ? <div className="space-y-4" role="status" aria-label="Loading family inbox">{[0, 1, 2].map((key) => <div key={key} className="h-36 animate-pulse rounded-lg border border-border bg-card" />)}</div>
      : tab === "messages" ? (!messages.length ? <p className="py-10 text-sm text-muted-foreground">No family messages yet.</p>
        : <ul className="space-y-4">{messages.map((message) => <li key={message.id} className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">{personName(message.guardian)} <span className="font-normal text-muted-foreground">about</span> {learnerName(message.student)}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{topicLabel[message.topic] || message.topic} · {stamp(message.createdAt)} · {message.guardian.email}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${message.status === "OPEN" ? "text-warning" : "text-success"}`}>{message.status === "OPEN" ? "Awaiting reply" : message.guardianReadAt ? <><Check className="size-4" aria-hidden="true" />Read by family</> : "Answered"}</span>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-foreground">{message.body}</p>
          {message.reply && <div className="mt-4 rounded-md bg-muted px-4 py-3"><p className="text-xs font-semibold text-foreground">{message.repliedByName}{message.repliedAt && <span className="font-normal text-muted-foreground"> · {stamp(message.repliedAt)}</span>}</p><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground">{message.reply}</p></div>}
          <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor={`reply-${message.id}`}>{message.reply ? "Update reply" : "Reply to guardian"}</label>
          <textarea id={`reply-${message.id}`} value={drafts[message.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [message.id]: event.target.value }))} rows={3} maxLength={2000} className={fieldClass} placeholder="Write a clear, short reply. Many families read in Burmese or Mon." />
          <button type="button" onClick={() => reply(message.id)} disabled={saving === message.id || (drafts[message.id]?.trim().length ?? 0) < 2} className={`${primaryButton} mt-3`}><Send className="size-4" aria-hidden="true" />{saving === message.id ? "Sending…" : "Send reply"}</button>
        </li>)}</ul>)
      : tab === "absences" ? (!sortedNotices.length ? <p className="py-10 text-sm text-muted-foreground">No absence notices in the last 30 days.</p>
        : <ul className="space-y-4">{sortedNotices.map((notice) => {
          const sameDay = notice.startDate.slice(0, 10) === notice.endDate.slice(0, 10);
          return <li key={notice.id} className={`rounded-lg border bg-card p-5 sm:p-6 ${notice.status === "SUBMITTED" ? "border-primary/50" : "border-border"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CalendarX2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground">{learnerName(notice.student)}{notice.student.class && <span className="font-normal text-muted-foreground"> · {notice.student.class.name}</span>}</h2>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{sameDay ? plainDate(notice.startDate) : `${plainDate(notice.startDate)} – ${plainDate(notice.endDate)}`} · {typeLabel[notice.type] || notice.type}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">From {personName(notice.guardian)} · sent {stamp(notice.createdAt)}</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${notice.status === "SUBMITTED" ? "text-warning" : notice.status === "CANCELLED" ? "text-muted-foreground" : "text-success"}`}>{notice.status === "SUBMITTED" ? "New" : notice.status === "CANCELLED" ? "Cancelled by family" : `Acknowledged${notice.acknowledgedByName ? ` by ${notice.acknowledgedByName}` : ""}`}</span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-foreground">{notice.reason}</p>
            {notice.staffNote && <p className="mt-3 rounded-md bg-muted px-4 py-3 text-sm leading-6 text-foreground"><span className="font-semibold">Note to family:</span> {notice.staffNote}</p>}
            {notice.status === "SUBMITTED" && <>
              <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor={`note-${notice.id}`}>Note to the family <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea id={`note-${notice.id}`} value={drafts[notice.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [notice.id]: event.target.value }))} rows={2} maxLength={1000} className={fieldClass} placeholder="For example: Thank you. Please bring a clinic letter when they return." />
              <label className="mt-3 flex items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={excuse[notice.id] !== false} onChange={(event) => setExcuse((current) => ({ ...current, [notice.id]: event.target.checked }))} className="mt-1 size-4 accent-[var(--primary)]" />Change any "Absent" records on these days to "Excused"</label>
              <button type="button" onClick={() => acknowledge(notice.id)} disabled={saving === notice.id} className={`${primaryButton} mt-3`}><Check className="size-4" aria-hidden="true" />{saving === notice.id ? "Saving…" : "Acknowledge"}</button>
              <p className="mt-2 text-xs text-muted-foreground">The family gets an alert. Teachers already see this notice next to the learner when they take attendance, with Excused filled in.</p>
            </>}
          </li>;
        })}</ul>) : null}

    {!loading && tab === "links" && <div className="space-y-4">
      <p className="max-w-[70ch] text-sm leading-6 text-muted-foreground">Learners aged 18 or over decide what their family can see. Ask the learner in person, then record their answer here. Families of adult learners can always read school updates, see the schedule, send messages and report absences.</p>
      {!sortedLinks.length ? <p className="py-10 text-sm text-muted-foreground">No guardian accounts are linked to learners yet.</p>
        : <ul className="space-y-4">{sortedLinks.map((link) => {
          const adult = link.basis === "ADULT_CONSENT" || link.basis === "ADULT_NO_CONSENT";
          const draft = consentDraft[link.id] ?? link.consent.scopes;
          return <li key={link.id} className={`rounded-lg border bg-card p-5 sm:p-6 ${link.basis === "ADULT_NO_CONSENT" ? "border-primary/50" : "border-border"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">{link.student.name}<span className="font-normal text-muted-foreground"> · {[link.student.className, link.student.code, link.age != null ? `age ${link.age}` : null].filter(Boolean).join(" · ")}</span></h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Guardian: {link.guardian.name} · {link.guardian.email}{!link.guardian.active && " · account disabled"}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${link.basis === "ADULT_NO_CONSENT" ? "text-warning" : link.basis === "AGE_UNKNOWN" ? "text-warning" : "text-muted-foreground"}`}><ShieldCheck className="size-4" aria-hidden="true" />{basisLabel[link.basis]}</span>
            </div>
            {turning18(link) && <p className="mt-3 text-sm text-foreground">Turns 18 on {new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(link.adultFrom!))}. Ask the learner before then, or the family will see less from that day.</p>}
            {link.basis === "AGE_UNKNOWN" && <p className="mt-3 text-sm text-foreground">Add the learner's date of birth in their student record so the right sharing rule applies.</p>}
            {adult && <>
              {link.consent.at && <p className="mt-3 text-sm text-muted-foreground">Recorded by {link.consent.byName} on {stamp(link.consent.at)}{link.consent.note ? ` · ${link.consent.note}` : ""}</p>}
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-foreground">The learner agrees to share</legend>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {scopeOptions.map((option) => <label key={option.key} className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={draft.includes(option.key)} onChange={(event) => setConsentDraft((current) => ({ ...current, [link.id]: event.target.checked ? [...draft, option.key] : draft.filter((item) => item !== option.key) }))} className="size-4 accent-[var(--primary)]" />{option.label}</label>)}
                </div>
              </fieldset>
              <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor={`consent-${link.id}`}>How the learner answered</label>
              <input id={`consent-${link.id}`} value={drafts[`consent-${link.id}`] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [`consent-${link.id}`]: event.target.value }))} maxLength={500} className={`${fieldClass} min-h-10`} placeholder="For example: Signed consent form in the office, 19 Nov" />
              <button type="button" onClick={() => saveConsent(link)} disabled={saving === link.id} className={`${primaryButton} mt-3`}><ShieldCheck className="size-4" aria-hidden="true" />{saving === link.id ? "Saving…" : draft.length ? "Save the learner's choice" : "Record: share nothing"}</button>
            </>}
          </li>;
        })}</ul>}
    </div>}
  </div>;
}
