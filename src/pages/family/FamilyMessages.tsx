import { useEffect, useState } from "react";
import { BellRing, Send } from "lucide-react";
import { apiGet, apiSend } from "@/src/lib/api";
import { type FamilyMessage, Panel, ViewHeading, dateLabel, labelOf, messageTopics, primaryButton, fieldClass } from "./familyShared";

type Alerts = { emailEnabled: boolean; email: string | null };
type Props = { studentId: string; studentName: string; topic: string; setTopic: (topic: string) => void; onRead: () => void; alerts: Alerts | null; onAlertsChange: (alerts: Alerts) => void };

export default function FamilyMessages({ studentId, studentName, topic, setTopic, onRead, alerts, onAlertsChange }: Props) {
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState("");
  const toggleEmail = async () => {
    if (!alerts) return;
    setAlertSaving(true); setAlertError("");
    try {
      const saved = await apiSend<{ emailEnabled: boolean }>("/api/family/preferences", "PUT", { emailEnabled: !alerts.emailEnabled });
      onAlertsChange({ ...alerts, emailEnabled: saved.emailEnabled });
    } catch (reason: any) {
      setAlertError(reason.message || "Unable to save. Try again.");
    } finally { setAlertSaving(false); }
  };
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<FamilyMessage[]>(`/api/family/messages?studentId=${encodeURIComponent(studentId)}`, { signal: controller.signal, timeoutMs: 20000 })
      .then((data) => {
        setMessages(data); setLoadError("");
        if (data.some((message) => message.status === "ANSWERED" && !message.guardianReadAt)) {
          apiSend("/api/family/messages/read", "POST", { studentId }).then(onRead).catch(() => undefined);
        }
      })
      .catch((reason) => { if (!controller.signal.aborted) setLoadError(reason.message || "Unable to load messages"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [studentId, revision]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (body.trim().length < 5) return;
    setSending(true); setError(""); setSent("");
    try {
      await apiSend("/api/family/messages", "POST", { studentId, topic, body: body.trim() });
      setBody("");
      setSent("Message sent. Replies appear in your conversation history.");
      setRevision((value) => value + 1);
    } catch (reason: any) {
      setError(reason.message || "Unable to send. Your message is still in the box; try again.");
    } finally { setSending(false); }
  };

  return <div>
    <ViewHeading title="Messages" description={`Write to the MRLC office about ${studentName}. Staff reply here, usually within two school days.`} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6 self-start">
      <Panel title="New message" id="new-message-title">
        <form onSubmit={send} className="px-5 pb-6 pt-4 sm:px-6">
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Topic</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {messageTopics.map((item) => <label key={item.key} className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${topic === item.key ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border text-foreground hover:bg-muted"}`}>
                <input type="radio" name="message-topic" value={item.key} checked={topic === item.key} onChange={() => setTopic(item.key)} className="sr-only" />{item.label}
              </label>)}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-semibold text-foreground">Your message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={6} className={`${fieldClass} py-2.5 font-normal`} placeholder="What would you like the school to know? You can write in English, Burmese or Mon." />
          </label>
          <p className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">{body.length} / 2000</p>
          <button type="submit" disabled={sending || body.trim().length < 5} className={`${primaryButton} mt-3 w-full sm:w-auto`}><Send className="size-4" aria-hidden="true" />{sending ? "Sending…" : "Send to MRLC"}</button>
          {sent && <p role="status" className="mt-3 text-sm font-medium text-success">{sent}</p>}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">For urgent matters about safety or health, call the school directly.</p>
        </form>
      </Panel>
      {alerts && <Panel title="Email alerts" id="alerts-title">
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p id="email-alerts-label" className="text-sm font-semibold text-foreground">Email me about my learners</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">When the school replies, receives your absence notice, or marks a learner absent. This setting covers all learners linked to your account. Absence emails wait 30 minutes in case the teacher corrects the record.</p>
              {alerts.email && <p className="mt-1 truncate text-xs text-muted-foreground">Sent to <span data-no-i18n>{alerts.email}</span></p>}
            </div>
          </div>
          <button type="button" role="switch" aria-checked={alerts.emailEnabled} aria-labelledby="email-alerts-label" onClick={toggleEmail} disabled={alertSaving} className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${alerts.emailEnabled ? "border-primary bg-primary" : "border-input bg-muted"}`}>
            <span className={`inline-block size-5 rounded-full bg-card shadow-sm transition-transform ${alerts.emailEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {alertError && <p role="alert" className="px-5 pb-4 text-sm font-medium text-destructive sm:px-6">{alertError}</p>}
        <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">Even with email off, new replies and absences always appear first on the Today page.</p>
      </Panel>}
      </div>

      <Panel title="Conversation history" id="history-title" className="self-start">
        {loading ? <div className="space-y-3 px-5 py-5 sm:px-6" role="status" aria-label="Loading messages">{[0, 1].map((key) => <div key={key} className="h-24 animate-pulse rounded-md bg-muted" />)}</div>
          : loadError ? <div className="px-5 py-5 text-sm sm:px-6"><p role="alert" className="text-destructive">{loadError}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 font-semibold text-primary underline">Try again</button></div>
          : messages.length ? <ul className="divide-y divide-border">
            {messages.map((message) => {
              const fresh = message.status === "ANSWERED" && !message.guardianReadAt;
              return <li key={message.id} className="px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{labelOf(messageTopics, message.topic)}</p>
                  <p className="text-xs text-muted-foreground">{dateLabel(message.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground" data-no-i18n>{message.body}</p>
                {message.reply ? <div className="mt-4 rounded-md border border-border bg-muted/70 px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground"><span data-no-i18n>{message.repliedByName || "MRLC office"}</span>{message.repliedAt && <span className="font-normal text-muted-foreground">{dateLabel(message.repliedAt, { day: "numeric", month: "short" })}</span>}{fresh && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground">New</span>}</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground" data-no-i18n>{message.reply}</p>
                </div> : <p className="mt-3 text-xs font-medium text-muted-foreground">Waiting for a reply</p>}
              </li>;
            })}
          </ul> : <p className="px-5 py-6 text-sm leading-6 text-muted-foreground sm:px-6">No messages yet. Questions about learning, attendance, wellbeing or fees all go to the office here.</p>}
      </Panel>
    </div>
  </div>;
}
