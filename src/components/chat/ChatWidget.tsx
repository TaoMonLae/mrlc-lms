import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, X, ArrowLeft, Send, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, isToday } from 'date-fns';
import { apiGet, apiSend } from '../../lib/api';
import { useChat } from '../../providers/ChatProvider';
import { useAuth } from '../../providers/AuthProvider';

interface Contact { id: string; name: string; role: string }
interface Participant extends Contact { lastReadAt?: string | null }
interface ConvSummary {
  id: string; type: string; title: string; unread: number; lastMessageAt: string;
  participants: Contact[];
  lastMessage: { body: string } | null;
}
interface ChatMsg { id: string; body: string; attachmentUrl?: string | null; sender: Contact; createdAt: string; mine: boolean }
interface ConvDetail { id: string; title: string | null; participants: Participant[]; oversight: boolean; messages: ChatMsg[] }

const POLL_MS = 8000;
const timeLabel = (iso: string) => { const d = new Date(iso); return isToday(d) ? format(d, 'HH:mm') : format(d, 'd MMM'); };

/** Messenger-style floating chat, available on every page (hidden on /chat). */
export default function ChatWidget() {
  const location = useLocation();
  const { onlineUserIds, eventTick, setActiveConversation } = useChat();
  const { user } = useAuth();
  const myId = user?.id;
  const isChatRoute = location.pathname.startsWith('/chat');
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const unread = conversations.reduce((n, c) => n + (c.unread || 0), 0);

  async function loadList() {
    try { setConversations(await apiGet<ConvSummary[]>('/api/chat/conversations')); } catch { /* keep */ }
  }
  async function openConversation(id: string) {
    setActiveId(id);
    try {
      const d = await apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages`);
      setDetail(d);
      if (!d.oversight) {
        apiSend(`/api/chat/conversations/${id}/read`, 'POST').catch(() => {});
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      }
    } catch { /* ignore */ }
  }

  // Poll the open thread when active (the full /chat page handles its own).
  useEffect(() => {
    if (isChatRoute) return;
    loadList();
    const t = setInterval(() => {
      loadList();
      const id = activeIdRef.current;
      if (id && open) apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages`).then(setDetail).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [open, isChatRoute]);

  // React to the app-wide live connection (provided by ChatProvider).
  useEffect(() => {
    if (isChatRoute || eventTick === 0) return;
    loadList();
    const id = activeIdRef.current;
    if (id) apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages`).then(setDetail).catch(() => {});
  }, [eventTick, isChatRoute]);

  // Tell the provider which thread is open so it suppresses its toast for it.
  useEffect(() => {
    if (isChatRoute) return;
    setActiveConversation(open ? activeId : null);
  }, [open, activeId, isChatRoute, setActiveConversation]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [detail?.messages.length, activeId, open]);

  async function send() {
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft('');
    try {
      const msg = await apiSend<ChatMsg>(`/api/chat/conversations/${activeId}/messages`, 'POST', { body });
      setDetail((d) => (d && d.id === activeId ? { ...d, messages: [...d.messages, msg] } : d));
      loadList();
    } catch { setDraft(body); }
  }

  // The full chat page has its own UI; don't double up there.
  if (location.pathname.startsWith('/chat')) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-aubergine-600 text-white shadow-lg transition hover:bg-aubergine-700"
      >
        <MessageSquare className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white ring-2 ring-white dark:ring-canvas">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[70vh] max-h-[560px] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-surface-raised dark:bg-surface-indigo sm:w-96">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-surface-raised">
        <div className="flex items-center gap-2">
          {activeId && <button onClick={() => { setActiveId(null); setDetail(null); }} className="text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /></button>}
          <span className="font-semibold text-slate-900 dark:text-white">
            {detail ? (
              <span className="flex flex-col leading-tight">
                <span>{detail.title || detail.participants.filter((p) => p.id !== myId).map((p) => p.name).join(', ')}</span>
                {(() => {
                  const others = detail.participants.filter((p) => p.id !== myId);
                  const anyOnline = others.some((o) => onlineUserIds.has(o.id));
                  return <span className={`text-[10px] font-medium ${anyOnline ? 'text-emerald-600' : 'text-slate-400'}`}>{anyOnline ? 'Active now' : 'Offline'}</span>;
                })()}
              </span>
            ) : <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-aubergine-600" /> Messages</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link to={activeId ? `/chat` : '/chat'} title="Open full chat" className="text-slate-400 hover:text-slate-600"><Maximize2 className="h-4 w-4" /></Link>
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {!detail ? (
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">
              No conversations yet.
              <Link to="/chat" className="mt-2 text-aubergine-600 hover:underline">Open chat to start one</Link>
            </div>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => openConversation(c.id)} className="flex w-full items-start gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 dark:border-surface-raised/50 dark:hover:bg-surface-raised/40">
              <div className="relative shrink-0">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-aubergine-100 text-xs font-bold text-aubergine-700">{c.title.charAt(0).toUpperCase()}</div>
                {c.participants?.some((p) => p.id !== myId && onlineUserIds.has(p.id)) && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-indigo" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{timeLabel(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">{c.lastMessage?.body ?? 'No messages yet'}</span>
                  {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-aubergine-600 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {detail.messages.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No messages yet.</p> :
              detail.messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.mine ? 'bg-aubergine-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-surface-raised dark:text-slate-200'}`}>
                    {!m.mine && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{m.sender.name}</p>}
                    {m.attachmentUrl && <img src={m.attachmentUrl} alt="attachment" className="mb-1 max-h-40 rounded-lg" />}
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <p className={`mt-0.5 text-[9px] ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>{timeLabel(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            {(() => {
              const last = detail.messages[detail.messages.length - 1];
              if (!last?.mine) return null;
              const others = detail.participants.filter((p) => p.id !== myId);
              const seen = others.some((o) => o.lastReadAt && new Date(o.lastReadAt) >= new Date(last.createdAt));
              return <p className="pr-1 text-right text-[10px] text-slate-400">{seen ? 'Seen' : 'Sent'}</p>;
            })()}
          </div>
          {detail.oversight ? (
            <div className="border-t border-slate-100 p-2 text-center text-[11px] text-slate-400 dark:border-surface-raised">Admin oversight — read only</div>
          ) : (
            <div className="flex items-center gap-2 border-t border-slate-100 p-2 dark:border-surface-raised">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" className="h-9" />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
