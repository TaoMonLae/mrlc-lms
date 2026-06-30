import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Send, Search, Flag, ArrowLeft, ShieldAlert, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '../../lib/permissions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { apiGet, apiSend } from '../../lib/api';

interface Contact { id: string; name: string; role: string; profilePhotoUrl?: string | null }
interface ConvSummary {
  id: string; type: string; title: string; unread: number; lastMessageAt: string;
  participants: Contact[];
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
}
interface ChatMsg { id: string; body: string; attachmentUrl?: string | null; sender: Contact; createdAt: string; mine: boolean }
interface ConvDetail { id: string; type: string; title: string | null; participants: Contact[]; oversight: boolean; messages: ChatMsg[] }

const POLL_MS = 7000;
const roleLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase().replace('_', ' ');

function timeLabel(iso: string) {
  const d = new Date(iso);
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'd MMM');
}

export default function ChatPage() {
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('manage_all');
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // New conversation dialog
  const [newOpen, setNewOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [picked, setPicked] = useState<Record<string, Contact>>({});
  const [groupTitle, setGroupTitle] = useState('');

  async function loadList() {
    try {
      const data = await apiGet<ConvSummary[]>('/api/chat/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch { /* keep prior */ }
    finally { setLoadingList(false); }
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
    } catch (err: any) { toast.error(err.message || 'Could not open conversation'); }
  }

  useEffect(() => { loadList(); }, []);

  // Poll the list always, and the open thread when one is active (fallback).
  useEffect(() => {
    const t = setInterval(() => {
      loadList();
      if (activeId) apiGet<ConvDetail>(`/api/chat/conversations/${activeId}/messages`).then(setDetail).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activeId]);

  // Real-time push via SSE; on any event, refresh the list and the open thread.
  // If the stream fails the browser auto-reconnects and polling covers the gap.
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (!token || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/chat/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = () => {
        loadList();
        const id = activeIdRef.current;
        if (id) apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages`).then(setDetail).catch(() => {});
      };
      es.onerror = () => { /* auto-reconnect; polling backstops */ };
    } catch { /* ignore */ }
    return () => es?.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [detail?.messages.length, activeId]);

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/chat-media', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAttachment(data.url);
    } catch (err: any) {
      toast.error(err.message || 'Could not upload image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send() {
    const body = draft.trim();
    if ((!body && !attachment) || !activeId) return;
    const att = attachment;
    setDraft(''); setAttachment(null);
    try {
      const msg = await apiSend<ChatMsg>(`/api/chat/conversations/${activeId}/messages`, 'POST', { body, attachmentUrl: att });
      setDetail((d) => (d && d.id === activeId ? { ...d, messages: [...d.messages, msg] } : d));
      loadList();
    } catch (err: any) {
      toast.error(err.message || 'Could not send');
      setDraft(body); setAttachment(att);
    }
  }

  async function report(messageId: string) {
    if (!window.confirm('Report this message to an administrator?')) return;
    try { await apiSend(`/api/chat/messages/${messageId}/report`, 'POST', {}); toast.success('Reported to admin'); }
    catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function openNew() {
    setNewOpen(true);
    setPicked({}); setGroupTitle(''); setContactSearch('');
    try { setContacts(await apiGet<Contact[]>('/api/chat/contacts')); }
    catch (err: any) { toast.error(err.message || 'Could not load contacts'); }
  }

  async function startConversation() {
    const ids = Object.keys(picked);
    if (ids.length === 0) { toast.error('Pick at least one person'); return; }
    try {
      const r = await apiSend<{ id: string }>('/api/chat/conversations', 'POST', {
        participantIds: ids, title: ids.length > 1 ? (groupTitle.trim() || null) : null,
      });
      setNewOpen(false);
      await loadList();
      openConversation(r.id);
    } catch (err: any) { toast.error(err.message || 'Could not start conversation'); }
  }

  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => !q || c.name.toLowerCase().includes(q) || roleLabel(c.role).toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* Conversation list */}
      <div className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 flex-col rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo`}>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-surface-raised p-3">
          <h1 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MessageSquare className="h-5 w-5 text-aubergine-600" /> Chat</h1>
          <div className="flex items-center gap-1">
          {isAdmin && (
            <Button size="sm" variant="ghost" title="Moderation" render={<Link to="/chat/moderation" />}><ShieldAlert className="h-4 w-4 text-amber-600" /></Button>
          )}
          <Dialog open={newOpen} onOpenChange={(o) => (o ? openNew() : setNewOpen(false))}>
            <DialogTrigger render={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> New</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="pl-8" placeholder="Search people…" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
              </div>
              {Object.keys(picked).length > 1 && (
                <div className="space-y-1"><Label>Group name (optional)</Label><Input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="e.g. Grade 10 project" /></div>
              )}
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {filteredContacts.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No contacts</p> :
                  filteredContacts.map((c) => {
                    const on = !!picked[c.id];
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setPicked((p) => { const n = { ...p }; if (n[c.id]) delete n[c.id]; else n[c.id] = c; return n; })}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${on ? 'border-aubergine-300 bg-aubergine-50 dark:bg-aubergine-900/20' : 'border-slate-200 dark:border-surface-raised hover:bg-slate-50 dark:hover:bg-surface-raised/40'}`}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{roleLabel(c.role)}</Badge>
                      </button>
                    );
                  })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                <Button onClick={startConversation}>Start ({Object.keys(picked).length})</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? <p className="p-4 text-sm text-slate-400">Loading…</p> :
            conversations.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No conversations yet. Tap “New” to start one.</p> :
            conversations.map((c) => (
              <button key={c.id} onClick={() => openConversation(c.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-50 dark:border-surface-raised/50 p-3 text-left hover:bg-slate-50 dark:hover:bg-surface-raised/40 ${activeId === c.id ? 'bg-slate-50 dark:bg-surface-raised/40' : ''}`}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aubergine-100 text-sm font-bold text-aubergine-700">
                  {c.title.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-900 dark:text-white">{c.title}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeLabel(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500">{c.lastMessage ? `${c.lastMessage.body}` : 'No messages yet'}</span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-aubergine-600 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo`}>
        {!detail ? (
          <div className="grid flex-1 place-items-center text-sm text-slate-400">Select a conversation</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-surface-raised p-3">
              <Button variant="ghost" size="sm" className="md:hidden -ml-2" onClick={() => { setActiveId(null); setDetail(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{detail.title || detail.participants.map((p) => p.name).join(', ')}</p>
                <p className="truncate text-xs text-slate-400">{detail.participants.map((p) => p.name).join(', ')}</p>
              </div>
              {detail.oversight && <Badge className="ml-auto bg-amber-100 text-amber-700"><ShieldAlert className="mr-1 h-3 w-3" /> Oversight</Badge>}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {detail.messages.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello.</p> :
                detail.messages.map((m) => (
                  <div key={m.id} className={`group flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-aubergine-600 text-white' : 'bg-slate-100 dark:bg-surface-raised text-slate-800 dark:text-slate-200'}`}>
                      {!m.mine && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{m.sender.name}</p>}
                      {m.attachmentUrl && <img src={m.attachmentUrl} alt="attachment" className="mb-1 max-h-60 rounded-lg" />}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>
                        <span>{timeLabel(m.createdAt)}</span>
                        {!m.mine && <button onClick={() => report(m.id)} className="opacity-0 group-hover:opacity-100" title="Report"><Flag className="h-3 w-3" /></button>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {detail.oversight ? (
              <div className="border-t border-slate-100 dark:border-surface-raised p-3 text-center text-xs text-slate-400">Admin oversight — read only</div>
            ) : (
              <div className="border-t border-slate-100 dark:border-surface-raised p-3">
                {attachment && (
                  <div className="relative mb-2 inline-block">
                    <img src={attachment} alt="attachment preview" className="max-h-24 rounded-lg border border-slate-200 dark:border-surface-raised" />
                    <button type="button" onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-surface-raised p-0.5 shadow-sm">
                      <X className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }} />
                  <Button variant="ghost" size="icon" className="shrink-0" title="Attach image" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-slate-500" />}
                  </Button>
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" />
                  <Button onClick={send} disabled={!draft.trim() && !attachment}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
