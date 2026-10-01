import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { apiGet, apiSend } from "@/src/lib/api";

type InboxMessage = {
  id: string; topic: string; body: string; reply: string | null; status: string;
  createdAt: string; repliedAt: string | null; repliedByName: string | null;
  guardian: { firstName: string; lastName: string; email: string };
  student: { preferredName: string | null; studentCode: string; user: { firstName: string; lastName: string } | null };
};

export default function FamilyInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<InboxMessage[]>("/api/family/inbox", { signal: controller.signal })
      .then((data) => { setMessages(data); setError(""); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message || "Unable to load family messages"); })
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

  const openCount = messages.filter((message) => message.status === "OPEN").length;

  return <div className="mx-auto max-w-[1000px] space-y-8 pb-12">
    <header className="border-b border-border pb-6">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-academic-teal">Family communication</p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-[-0.04em]"><MessageSquare className="size-7 text-academic-teal" /> Family inbox</h1>
      <p className="mt-2 text-sm text-muted-foreground">{openCount} awaiting reply · Messages from verified guardian accounts.</p>
    </header>
    {error && <p role="alert" className="border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">{error} <button onClick={() => setRevision((value) => value + 1)} className="ml-3 font-bold underline">Try again</button></p>}
    {loading ? <p role="status" className="py-12 text-sm">Loading family messages…</p>
      : !messages.length ? <p className="border-t border-border py-12 text-sm text-muted-foreground">No family messages have arrived yet.</p>
      : <div className="space-y-5">{messages.map((message) => {
        const guardianName = [message.guardian.firstName, message.guardian.lastName].filter(Boolean).join(" ");
        const learnerName = message.student.preferredName || [message.student.user?.firstName, message.student.user?.lastName].filter(Boolean).join(" ") || message.student.studentCode;
        return <article key={message.id} className="border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-academic-teal">{message.topic.toLowerCase()} · {message.status === "OPEN" ? "Awaiting reply" : "Answered"}</p><h2 className="mt-2 text-lg font-bold">{guardianName} about {learnerName}</h2><p className="mt-1 text-xs text-muted-foreground">{message.guardian.email} · {new Date(message.createdAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}</p></div>
          </div>
          <p className="mt-5 whitespace-pre-line border-l-2 border-academic-teal pl-4 text-sm leading-7">{message.body}</p>
          {message.reply && <div className="mt-5 bg-muted p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">MRLC reply · {message.repliedByName}</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{message.reply}</p></div>}
          <label className="mt-5 block text-sm font-semibold" htmlFor={`reply-${message.id}`}>{message.reply ? "Update reply" : "Reply to guardian"}</label>
          <textarea id={`reply-${message.id}`} value={drafts[message.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [message.id]: event.target.value }))} rows={3} maxLength={2000} className="mt-2 block w-full resize-y border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal" placeholder="Write a clear reply…" />
          <button type="button" onClick={() => reply(message.id)} disabled={saving === message.id || (drafts[message.id]?.trim().length ?? 0) < 2} className="mt-3 inline-flex min-h-11 items-center gap-2 bg-academic-navy-deep px-5 text-sm font-bold text-white hover:bg-academic-teal disabled:opacity-50"><Send className="size-4" />{saving === message.id ? "Sending…" : "Send reply"}</button>
        </article>;
      })}</div>}
  </div>;
}
