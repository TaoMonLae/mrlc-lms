import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MessageSquare, Plus, Send, Search, Flag, ArrowLeft, ShieldAlert, ImagePlus, X, Loader2, Sticker, Camera, Download, Clock, Trash2, Users, UserPlus, UserMinus, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '../../lib/permissions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { ApiError, apiGet, apiSend } from '../../lib/api';
import { useChat } from '../../providers/ChatProvider';
import { useAuth } from '../../providers/AuthProvider';
import { StickerPicker, isStickerUrl } from '../../components/chat/StickerPicker';
import CameraCapture from '../../components/CameraCapture';
import { chatTextParts } from '../../lib/chatLinks';

interface Contact { id: string; name: string; role: string; profilePhotoUrl?: string | null }
interface Participant extends Contact { lastReadAt?: string | null }
interface ContactGroup { key: string; label: string; contacts: Contact[] }
interface ConvSummary {
  id: string; type: string; title: string; unread: number; lastMessageAt: string;
  isPinned: boolean;
  participants: Contact[];
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
}
interface ChatMsg { id: string; body: string; attachmentUrl?: string | null; expiresAt?: string | null; pinnedAt?: string | null; sender: Contact; createdAt: string; mine: boolean }
interface PinnedMessage { id: string; body: string; attachmentUrl?: string | null; senderName: string; pinnedAt: string }
interface ConvDetail { id: string; type: string; title: string | null; participants: Participant[]; oversight: boolean; messages: ChatMsg[]; pinnedMessages: PinnedMessage[] }
interface ChatSearchResult { id: string; conversationId: string; conversationTitle: string; senderName: string; body: string; createdAt: string }

const POLL_MS = 7000;
const roleLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase().replaceAll('_', ' ');

function timeLabel(iso: string) {
  const d = new Date(iso);
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'd MMM');
}

function timeLeftShort(iso: string) {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}

export default function ChatPage() {
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('manage_all');
  const { onlineUserIds, eventTick, lastEvent, setActiveConversation, typingNames, sendTyping } = useChat();
  const { user } = useAuth();
  const myId = user?.id;
  const canSave = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const canDeleteConv = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageQuery, setMessageQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [managingMember, setManagingMember] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const messageRequestRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const lastScrolledConversationRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // New conversation dialog
  const [newOpen, setNewOpen] = useState(false);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [picked, setPicked] = useState<Record<string, Contact>>({});
  const [groupTitle, setGroupTitle] = useState('');

  async function loadList() {
    try {
      const data = await apiGet<ConvSummary[]>('/api/chat/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch { /* keep prior on a transient list error */ }
    finally { setLoadingList(false); }
  }

  async function loadMessages(id: string, around?: string | null) {
    const requestId = ++messageRequestRef.current;
    try {
      const data = await apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages${around ? `?around=${encodeURIComponent(around)}` : ''}`);
      // A slower/older request for a thread the user has since navigated
      // away from can resolve after a newer one -- only apply it if it's
      // still for the currently-open conversation, otherwise it silently
      // overwrites the active thread with stale/unrelated data.
      if (activeIdRef.current === id && messageRequestRef.current === requestId) setDetail(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404) && activeIdRef.current === id) {
        activeIdRef.current = null;
        setActiveId(null);
        setDetail(null);
        setPeopleOpen(false);
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    }
  }

  async function openConversation(id: string, around?: string) {
    const requestId = ++messageRequestRef.current;
    activeIdRef.current = id;
    setActiveId(id);
    setDetail(null);
    setPeopleOpen(false);
    setPinnedOpen(false);
    setDraft(''); setAttachment(null);
    setFocusedMessageId(around ?? null);
    shouldStickToBottomRef.current = true;
    try {
      const d = await apiGet<ConvDetail>(`/api/chat/conversations/${id}/messages${around ? `?around=${encodeURIComponent(around)}` : ''}`);
      if (activeIdRef.current !== id || messageRequestRef.current !== requestId) return;
      setDetail(d);
      if (!d.oversight) {
        apiSend(`/api/chat/conversations/${id}/read`, 'POST').catch(() => {});
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      }
    } catch (err: any) {
      if (activeIdRef.current === id) {
        activeIdRef.current = null;
        setActiveId(null);
        setDetail(null);
      }
      toast.error(err.message || 'Could not open conversation');
    }
  }

  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (!searchOpen || messageQuery.trim().length < 2) {
      setSearchResults([]); setSearching(false); setSearchError('');
      return;
    }
    setSearchResults([]);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = await apiGet<ChatSearchResult[]>(`/api/chat/search?q=${encodeURIComponent(messageQuery.trim().slice(0, 100))}`, { signal: controller.signal });
        if (!controller.signal.aborted) setSearchResults(results);
      } catch (err: any) {
        if (!controller.signal.aborted) setSearchError(err.message || 'Could not search messages');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [messageQuery, searchOpen]);

  // Poll the list always, and the open thread when one is active (fallback).
  useEffect(() => {
    let cancelled = false;
    const t = setInterval(() => {
      if (cancelled) return;
      loadList();
      if (activeId && !focusedMessageId && !cancelled) loadMessages(activeId);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeId, focusedMessageId]);

  // React to the app-wide live connection (ChatProvider owns the single stream).
  useEffect(() => {
    if (eventTick === 0) return;
    loadList();
    const id = activeIdRef.current;
    if (id && lastEvent?.conversationId === id && lastEvent?.type === 'conversation-deleted') {
      activeIdRef.current = null;
      setActiveId(null);
      setDetail(null);
      setPeopleOpen(false);
    } else if (id && (!focusedMessageId || lastEvent?.type === 'message-pin-changed')) loadMessages(id, focusedMessageId);
  }, [eventTick, focusedMessageId]);

  // Tell the provider which thread is focused so it won't toast for it.
  useEffect(() => { setActiveConversation(activeId); return () => setActiveConversation(null); }, [activeId, setActiveConversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (focusedMessageId) {
      const target = Array.from(el.querySelectorAll<HTMLElement>('[data-chat-message-id]')).find((node) => node.dataset.chatMessageId === focusedMessageId);
      if (target) {
        el.scrollTop = target.offsetTop - el.offsetTop - el.clientHeight / 3;
        return;
      }
    }
    const conversationChanged = lastScrolledConversationRef.current !== activeId;
    if (conversationChanged || shouldStickToBottomRef.current) el.scrollTop = el.scrollHeight;
    lastScrolledConversationRef.current = activeId;
  }, [detail?.messages.at(-1)?.id, activeId, focusedMessageId]);

  async function togglePin() {
    if (!activeId || pinning) return;
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    setPinning(true);
    try {
      await apiSend(`/api/chat/conversations/${activeId}/pin`, 'PATCH', { pinned: !current.isPinned });
      await loadList();
    } catch (err: any) { toast.error(err.message || 'Could not update pin'); }
    finally { setPinning(false); }
  }

  async function toggleMessagePin(message: ChatMsg) {
    if (!activeId || pinningMessageId) return;
    const id = activeId;
    setPinningMessageId(message.id);
    try {
      await apiSend(`/api/chat/messages/${message.id}/pin`, 'PATCH', { pinned: !message.pinnedAt });
      await loadMessages(id, focusedMessageId);
    } catch (err: any) { toast.error(err.message || 'Could not update message pin'); }
    finally { setPinningMessageId(null); }
  }

  async function uploadAttachment(file: File) {
    const conversationId = activeIdRef.current;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/chat-media', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (activeIdRef.current === conversationId) setAttachment(data.url);
    } catch (err: any) {
      toast.error(err.message || 'Could not upload image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send() {
    const body = draft.trim();
    if (sending || (!body && !attachment) || !activeId) return;
    const conversationId = activeId;
    const att = attachment;
    const originalDraft = draft;
    const originalAttachment = attachment;

    setSending(true);
    shouldStickToBottomRef.current = true;
    setDraft(''); setAttachment(null);
    try {
      const msg = await apiSend<ChatMsg>(`/api/chat/conversations/${conversationId}/messages`, 'POST', { body, attachmentUrl: att });
      setDetail((d) => (d && d.id === conversationId && !d.messages.some((m) => m.id === msg.id) ? { ...d, messages: [...d.messages, msg] } : d));
      loadList();
    } catch (err: any) {
      toast.error(err.message || 'Could not send');
      if (activeIdRef.current === conversationId) { setDraft(originalDraft); setAttachment(originalAttachment); }
    } finally { setSending(false); }
  }

  async function sendSticker(url: string) {
    if (!activeId || sending) return;
    const conversationId = activeId;
    setSending(true);
    shouldStickToBottomRef.current = true;
    try {
      const msg = await apiSend<ChatMsg>(`/api/chat/conversations/${conversationId}/messages`, 'POST', { body: '', attachmentUrl: url });
      setDetail((d) => (d && d.id === conversationId && !d.messages.some((m) => m.id === msg.id) ? { ...d, messages: [...d.messages, msg] } : d));
      loadList();
    } catch (err: any) { toast.error(err.message || 'Could not send sticker'); }
    finally { setSending(false); }
  }

  async function sendCameraPhoto(blob: Blob) {
    if (!activeId || sending) {
      if (sending) return;
      toast.error('Please open a conversation first');
      return;
    }
    const conversationId = activeId;
    setCamera(false);
    setSending(true);
    shouldStickToBottomRef.current = true;
    try {
      const fd = new FormData();
      fd.append('file', blob, 'photo.jpg');
      const token = sessionStorage.getItem('auth_token');
      const upRes = await fetch('/api/chat-media', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const up = await upRes.json().catch(() => ({}));
      if (!upRes.ok) throw new Error(up.error || 'Upload failed');
      const msg = await apiSend<ChatMsg>(`/api/chat/conversations/${conversationId}/messages`, 'POST', { attachmentUrl: up.url, ephemeral: true });
      setDetail((d) => (d && d.id === conversationId && !d.messages.some((m) => m.id === msg.id) ? { ...d, messages: [...d.messages, msg] } : d));
      loadList();
    } catch (err: any) { toast.error(err.message || 'Could not send photo'); }
    finally { setSending(false); }
  }

  async function deleteConversation() {
    if (!activeId) return;
    if (!window.confirm('Permanently delete this conversation? All messages and photos in it are cleared and cannot be recovered.')) return;
    const id = activeId;
    try {
      await apiSend(`/api/chat/conversations/${id}`, 'DELETE');
      toast.success('Conversation deleted');
      setActiveId(null);
      activeIdRef.current = null;
      setDetail(null);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      loadList();
    } catch (err: any) { toast.error(err.message || 'Could not delete conversation'); }
  }

  async function deleteMessage(messageId: string) {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await apiSend(`/api/chat/messages/${messageId}`, 'DELETE');
      setDetail((d) => d ? { ...d, messages: d.messages.filter((m) => m.id !== messageId) } : d);
      loadList();
    } catch (err: any) { toast.error(err.message || 'Could not delete message'); }
  }

  async function report(messageId: string) {
    if (!window.confirm('Report this message to an administrator?')) return;
    try { await apiSend(`/api/chat/messages/${messageId}/report`, 'POST', {}); toast.success('Reported to admin'); }
    catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function openNew() {
    setNewOpen(true);
    setPicked({}); setGroupTitle(''); setContactSearch('');
    try {
      const data = await apiGet<{ groups: ContactGroup[] }>('/api/chat/contacts');
      setContactGroups(data?.groups ?? []);
    } catch (err: any) { toast.error(err.message || 'Could not load contacts'); }
  }

  async function openPeople() {
    setPeopleOpen(true);
    setAddingPerson(false);
    setMemberSearch('');
    if (!canInvitePeople) return;
    try {
      const data = await apiGet<{ groups: ContactGroup[] }>('/api/chat/contacts');
      setContactGroups(data?.groups ?? []);
    } catch (err: any) { toast.error(err.message || 'Could not load people'); }
  }

  async function addPerson(person: Contact) {
    if (!activeId || !detail || managingMember) return;
    const id = activeId;
    setManagingMember(true);
    try {
      if (detail.type === 'DIRECT') {
        const participantIds = [...detail.participants.filter((p) => p.id !== myId).map((p) => p.id), person.id];
        const next = await apiSend<{ id: string }>('/api/chat/conversations', 'POST', { participantIds });
        setPeopleOpen(false);
        await loadList();
        await openConversation(next.id);
        toast.success(`New group started with ${person.name}`);
      } else {
        if (!window.confirm(`Invite ${person.name}? They will be able to read earlier messages in this group.`)) return;
        await apiSend(`/api/chat/conversations/${id}/participants`, 'POST', { userId: person.id });
        await loadMessages(id, focusedMessageId);
        await loadList();
        setAddingPerson(false);
        toast.success(`${person.name} invited`);
      }
    } catch (err: any) { toast.error(err.message || 'Could not add member'); }
    finally { setManagingMember(false); }
  }

  async function removePerson(person: Participant) {
    if (!activeId || managingMember || !window.confirm(`Remove ${person.name} from this conversation?`)) return;
    const id = activeId;
    setManagingMember(true);
    try {
      await apiSend(`/api/chat/conversations/${id}/participants/${person.id}`, 'DELETE');
      await loadMessages(id);
      await loadList();
      toast.success(`${person.name} removed`);
    } catch (err: any) { toast.error(err.message || 'Could not remove member'); }
    finally { setManagingMember(false); }
  }

  async function startConversation() {
    const ids = Object.keys(picked);
    if (ids.length === 0) { toast.error('Pick at least one person'); return; }
    try {
      const r = await apiSend<{ id: string; reused?: boolean; message?: string }>('/api/chat/conversations', 'POST', {
        participantIds: ids, title: ids.length > 1 ? (groupTitle.trim() || null) : null,
      });
      setNewOpen(false);
      await loadList();
      openConversation(r.id);

      // Show notification if conversation was reused
      if (r.reused && r.message) {
        toast.info(r.message);
      }
    } catch (err: any) { toast.error(err.message || 'Could not start conversation'); }
  }

  const filteredGroups = useMemo(() => {
    const q = contactSearch.toLowerCase();
    if (!q) return contactGroups;
    return contactGroups
      .map((g) => ({ ...g, contacts: g.contacts.filter((c) => c.name.toLowerCase().includes(q) || roleLabel(c.role).toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) }))
      .filter((g) => g.contacts.length > 0);
  }, [contactGroups, contactSearch]);

  const totalContacts = useMemo(() => contactGroups.reduce((n, g) => n + g.contacts.length, 0), [contactGroups]);
  const visibleConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(query) ||
      conversation.lastMessage?.body.toLowerCase().includes(query),
    );
  }, [conversations, conversationSearch]);
  const canManageGroup = !!detail && detail.type === 'GROUP' && (isAdmin || (user?.role === 'TEACHER' && !detail.oversight));
  const canInvitePeople = !!detail && (user?.role === 'ADMIN' || user?.role === 'TEACHER') && (detail.type === 'GROUP' ? canManageGroup : detail.type === 'DIRECT' && !detail.oversight);
  const inviteCandidates = useMemo(() => {
    const members = new Set(detail?.participants.map((p) => p.id) ?? []);
    const seen = new Set<string>();
    const query = memberSearch.trim().toLowerCase();
    return contactGroups.flatMap((group) => group.contacts).filter((person) => {
      if (members.has(person.id) || seen.has(person.id)) return false;
      seen.add(person.id);
      return !query || `${person.name} ${roleLabel(person.role)}`.toLowerCase().includes(query);
    });
  }, [contactGroups, detail?.participants, memberSearch]);

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-0 gap-4 overflow-hidden max-sm:h-[calc(100dvh-8rem)]">
      {/* Conversation list */}
      <div className={`${activeId ? 'hidden md:flex' : 'flex'} min-h-0 w-full md:w-80 shrink-0 flex-col rounded-sm border border-border bg-card`}>
        <div className="flex items-center justify-between border-b border-border p-3">
          <h1 className="flex items-center gap-2 font-semibold text-foreground"><MessageSquare className="h-5 w-5 text-aubergine-600" /> Chat</h1>
          <div className="flex items-center gap-1">
          {isAdmin && (
            <Button aria-label="Sticker packs" size="sm" variant="ghost" title="Sticker packs" render={<Link to="/chat/stickers" />}><Sticker className="h-4 w-4 text-aubergine-600" /></Button>
          )}
          {isAdmin && (
            <Button aria-label="Moderation" size="sm" variant="ghost" title="Moderation" render={<Link to="/chat/moderation" />}><ShieldAlert className="h-4 w-4 text-amber-600" /></Button>
          )}
          <Button aria-label="Search messages" size="sm" variant="ghost" title="Search messages" onClick={() => setSearchOpen(true)}><Search className="h-4 w-4" /></Button>
          <Dialog open={newOpen} onOpenChange={(o) => (o ? openNew() : setNewOpen(false))}>
            <DialogTrigger render={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> New</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search people…" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
              </div>
              {Object.keys(picked).length > 1 && (
                <div className="space-y-1"><Label>Group name (optional)</Label><Input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="e.g. Grade 10 project" /></div>
              )}
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {totalContacts === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No people available to message</p> :
                  filteredGroups.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No matches</p> :
                  filteredGroups.map((g) => (
                    <div key={g.key} className="space-y-1">
                      <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{g.label} · {g.contacts.length}</p>
                      {g.contacts.map((c) => {
                        const on = !!picked[c.id];
                        return (
                          <button key={c.id} type="button"
                            onClick={() => setPicked((p) => { const n = { ...p }; if (n[c.id]) delete n[c.id]; else n[c.id] = c; return n; })}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${on ? 'border-aubergine-300 bg-aubergine-50 dark:bg-aubergine-900/20' : 'border-border hover:bg-muted/50'}`}>
                            <span className="flex min-w-0 items-center gap-2">
                              <UserAvatar name={c.name} src={c.profilePhotoUrl} className="h-7 w-7 text-[11px]" />
                              <span className="truncate font-medium text-foreground">{c.name}</span>
                            </span>
                            <Badge variant="outline" className="shrink-0 text-[11px] uppercase">{roleLabel(c.role)}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                <Button onClick={startConversation}>Start ({Object.keys(picked).length})</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Search conversations" className="h-8 pl-8 text-xs" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> :
            conversations.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet. Tap “New” to start one.</p> :
            visibleConversations.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No matching conversations.</p> :
            visibleConversations.map((c) => {
              const others = c.participants?.filter((p) => p.id !== myId) ?? [];
              // For a 1:1 chat, show the other person's real photo; a
              // GROUP's title is a group name, not one person, so keep the
              // initials fallback there.
              const avatarSrc = c.type === 'DIRECT' ? others[0]?.profilePhotoUrl : null;
              return (
              <button key={c.id} onClick={() => openConversation(c.id)}
                className={`flex w-full items-start gap-3 border-b border-border p-3 text-left hover:bg-muted/50 ${activeId === c.id ? 'bg-muted/50' : ''}`}>
                <div className="relative shrink-0">
                  <UserAvatar name={c.title} src={avatarSrc} className="h-10 w-10 font-bold" />
                  {others.some((p) => onlineUserIds.has(p.id)) && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-indigo" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 truncate font-medium text-foreground">{c.isPinned && <Pin aria-label="Pinned" className="h-3.5 w-3.5 shrink-0 text-academic-teal" />}<span className="truncate">{c.title}</span></span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{c.lastMessage ? `${c.lastMessage.body}` : 'No messages yet'}</span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-aubergine-600 px-1 text-[11px] font-bold text-white">{c.unread}</span>}
                  </div>
                </div>
              </button>
              );
            })}
        </div>
      </div>

      {/* Thread */}
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col rounded-sm border border-border bg-card`}>
        {!detail ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a conversation</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Button aria-label="Back" variant="ghost" size="sm" className="md:hidden -ml-2" onClick={() => { activeIdRef.current = null; setActiveId(null); setDetail(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{detail.title || detail.participants.filter((p) => p.id !== myId).map((p) => p.name).join(', ')}</p>
                {(() => {
                  const others = detail.participants.filter((p) => p.id !== myId);
                  const anyOnline = others.some((o) => onlineUserIds.has(o.id));
                  return (
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className={`inline-block h-2 w-2 rounded-full ${anyOnline ? 'bg-emerald-500' : 'bg-input'}`} />
                      {anyOnline ? 'Active now' : 'Offline'}
                    </p>
                  );
                })()}
              </div>
              {detail.oversight && <Badge className="bg-amber-100 text-amber-700"><ShieldAlert className="mr-1 h-3 w-3" /> Oversight</Badge>}
              <Button variant="ghost" size="sm" onClick={openPeople} aria-label={`View ${detail.participants.length} people in conversation`} title="View people" className="shrink-0 gap-1.5">
                <Users className="h-4 w-4" /><span className="hidden sm:inline">People</span><span className="tabular-nums text-muted-foreground">{detail.participants.length}</span>
              </Button>
              <Button variant="ghost" size="icon" disabled={pinning} onClick={togglePin} aria-label={conversations.find((c) => c.id === activeId)?.isPinned ? 'Unpin conversation' : 'Pin conversation'} title={conversations.find((c) => c.id === activeId)?.isPinned ? 'Unpin conversation' : 'Pin conversation'} className="h-8 w-8 shrink-0">
                {conversations.find((c) => c.id === activeId)?.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
              {canDeleteConv && (
                <Button aria-label="Delete conversation" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Delete conversation" onClick={deleteConversation}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              )}
            </div>

            {focusedMessageId && <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"><span>Viewing a search result</span><Button size="sm" variant="ghost" onClick={() => { setFocusedMessageId(null); if (activeId) openConversation(activeId); }}>Jump to latest</Button></div>}
            {detail.pinnedMessages.length > 0 && <button type="button" onClick={() => setPinnedOpen(true)} className="flex w-full items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-left text-xs text-foreground hover:bg-muted focus-visible:bg-muted">
              <Pin className="h-3.5 w-3.5 shrink-0 text-academic-teal" /><span className="min-w-0 flex-1 truncate">{detail.pinnedMessages.length === 1 ? detail.pinnedMessages[0].body || 'Pinned image' : `${detail.pinnedMessages.length} pinned messages`}</span><span className="shrink-0 text-muted-foreground">View</span>
            </button>}

            <div
              ref={scrollRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
            >
              {detail.messages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p> :
                detail.messages.map((m) => {
                  const sticker = isStickerUrl(m.attachmentUrl) && !m.body;
                  return (
                  <div key={m.id} data-chat-message-id={m.id} className={`group flex ${m.mine ? 'justify-end' : 'justify-start'} ${focusedMessageId === m.id ? 'rounded-sm outline outline-2 outline-academic-teal outline-offset-2' : ''}`}>
                    <div className={`max-w-[78%] text-sm ${sticker ? '' : `rounded-sm px-3 py-2 ${m.mine ? 'bg-aubergine-600 text-white' : 'bg-muted text-foreground'}`}`}>
                      {!m.mine && <p className={`mb-0.5 text-[11px] font-bold uppercase tracking-wide ${sticker ? 'text-muted-foreground' : 'opacity-70'}`}>{m.sender.name}</p>}
                      {m.pinnedAt && <span className={`mb-1 inline-flex items-center gap-1 text-[11px] font-medium ${m.mine ? 'text-white/80' : 'text-muted-foreground'}`}><Pin className="h-3 w-3" /> Pinned</span>}
                      {m.attachmentUrl && <img src={m.attachmentUrl} alt={sticker ? 'sticker' : 'attachment'} className={sticker ? 'h-28 w-28' : 'mb-1 max-h-60 rounded-lg'} />}
                      {m.expiresAt && (
                        <div className={`mb-1 flex items-center gap-2 text-[11px] ${m.mine ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <Clock className="h-3 w-3" /> Disappears in {timeLeftShort(m.expiresAt)}
                          {canSave && m.attachmentUrl && <a href={m.attachmentUrl} download className="inline-flex items-center gap-0.5 underline"><Download className="h-3 w-3" /> Save</a>}
                        </div>
                      )}
                      {m.body && <p className="whitespace-pre-wrap break-words">{chatTextParts(m.body).map((part, index) => part.href
                        ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{part.text}</a>
                        : <span key={index}>{part.text}</span>)}</p>}
                      <div className={`mt-0.5 flex items-center gap-2 text-[11px] ${sticker ? 'text-muted-foreground' : m.mine ? 'text-white/70' : 'text-muted-foreground'} ${m.mine ? 'justify-end' : ''}`}>
                        <span>{timeLabel(m.createdAt)}</span>
                        {m.mine && <button type="button" onClick={() => deleteMessage(m.id)} className="rounded-sm p-1 opacity-80 hover:opacity-100 focus-visible:opacity-100" title="Delete message" aria-label="Delete message"><Trash2 className="h-3.5 w-3.5" /></button>}
                        {!m.mine && !detail.oversight && <button type="button" aria-label="Report message" onClick={() => report(m.id)} className="rounded-sm p-1 opacity-70 hover:opacity-100 focus-visible:opacity-100" title="Report message"><Flag className="h-3.5 w-3.5" /></button>}
                        {canSave && !m.expiresAt && <button type="button" disabled={!!pinningMessageId} aria-label={m.pinnedAt ? 'Unpin message' : 'Pin message'} title={m.pinnedAt ? 'Unpin message' : 'Pin message'} onClick={() => toggleMessagePin(m)} className="rounded-sm p-1 opacity-80 hover:opacity-100 focus-visible:opacity-100"><Pin className={`h-3.5 w-3.5 ${m.pinnedAt ? 'fill-current' : ''}`} /></button>}
                      </div>
                    </div>
                  </div>
                  );
                })}
              {(() => {
                const last = detail.messages[detail.messages.length - 1];
                if (!last?.mine) return null;
                const others = detail.participants.filter((p) => p.id !== myId);
                const seen = others.some((o) => o.lastReadAt && new Date(o.lastReadAt) >= new Date(last.createdAt));
                return <p className="pr-1 text-right text-[11px] text-muted-foreground">{seen ? 'Seen' : 'Sent'}</p>;
              })()}
              {(() => {
                const names = activeId ? typingNames(activeId) : [];
                if (names.length === 0) return null;
                const label =
                  names.length === 1 ? `${names[0]} is typing`
                  : names.length === 2 ? `${names[0]} and ${names[1]} are typing`
                  : `${names.length} people are typing`;
                return (
                  <div className="flex justify-start" aria-live="polite">
                    <div className="flex items-center gap-2 rounded-sm bg-muted px-3 py-2">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      </span>
                      <span className="text-[11px] text-muted-foreground">{label}…</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {detail.oversight ? (
              <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">Admin oversight — read only</div>
            ) : (
              <div className="border-t border-border p-3">
                {attachment && (
                  <div className="relative mb-2 inline-block">
                    <img src={attachment} alt="attachment preview" className="max-h-24 rounded-lg border border-border" />
                    <button aria-label="Close" type="button" onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 rounded-full bg-card border border-border p-0.5 shadow-sm">
                      <X className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }} />
                  <Button aria-label="Attach image" variant="ghost" size="icon" className="shrink-0" title="Attach image" onClick={() => fileRef.current?.click()} disabled={uploading || sending}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button aria-label="Camera (disappears in 24h)" variant="ghost" size="icon" className="shrink-0" title="Camera (disappears in 24h)" onClick={() => setCamera(true)} disabled={sending}>
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <StickerPicker onSelect={sendSticker} />
                  <Input value={draft} maxLength={5000} onChange={(e) => { setDraft(e.target.value); if (e.target.value.trim() && activeId) sendTyping(activeId); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" disabled={sending} />
                  <Button onClick={send} disabled={sending || (!draft.trim() && !attachment)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={pinnedOpen} onOpenChange={setPinnedOpen}>
        <DialogContent className="max-h-[min(85dvh,38rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Pinned messages</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {detail?.pinnedMessages.map((message) => <button key={message.id} type="button" onClick={() => { setPinnedOpen(false); if (activeId) openConversation(activeId, message.id); }} className="block w-full border-b border-border px-2 py-3 text-left hover:bg-muted focus-visible:bg-muted last:border-0">
              <span className="text-xs font-semibold text-muted-foreground">{message.senderName}</span>
              <span className="mt-1 block line-clamp-2 break-words text-sm text-foreground">{message.body || (message.attachmentUrl ? 'Image' : 'Message')}</span>
            </button>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-h-[min(85dvh,42rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Search chat messages</DialogTitle></DialogHeader>
          <Label htmlFor="chat-message-search">Search words or a link in your conversations</Label>
          <Input id="chat-message-search" autoFocus value={messageQuery} maxLength={100} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search messages" />
          <div className="max-h-[min(55dvh,28rem)] overflow-y-auto" aria-live="polite">
            {messageQuery.trim().length < 2 ? <p className="py-5 text-sm text-muted-foreground">Enter at least two characters.</p> :
              searching ? <p className="py-5 text-sm text-muted-foreground">Searching…</p> :
              searchError ? <p className="py-5 text-sm text-destructive">{searchError}</p> :
              searchResults.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No matching messages.</p> :
              searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => { setSearchOpen(false); openConversation(result.conversationId, result.id); }} className="block w-full border-b border-border px-2 py-3 text-left hover:bg-muted focus-visible:bg-muted last:border-0">
                  <span className="flex justify-between gap-3 text-sm font-semibold text-foreground"><span className="truncate">{result.conversationTitle}</span><span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">{timeLabel(result.createdAt)}</span></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{result.senderName}</span>
                  <span className="mt-1 block line-clamp-2 break-words text-sm text-foreground">{result.body}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={peopleOpen} onOpenChange={setPeopleOpen}>
        <DialogContent className="max-h-[min(85dvh,42rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>People in this conversation</DialogTitle></DialogHeader>
          {detail && <>
            <p className="text-sm text-muted-foreground">{detail.type === 'CLASS_CHANNEL' ? 'Class membership follows enrollment.' : `${detail.participants.length} ${detail.participants.length === 1 ? 'member' : 'members'}`}</p>
            {detail.type === 'DIRECT' && canInvitePeople && <p className="text-xs text-muted-foreground">Inviting someone starts a new group. Private messages in this chat stay here.</p>}
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {detail.participants.map((person) => (
                <div key={person.id} className="flex min-h-12 items-center gap-3 border-b border-border py-2 last:border-0">
                  <UserAvatar name={person.name} src={person.profilePhotoUrl} className="h-9 w-9" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}{person.id === myId ? ' (you)' : ''}</p><p className="text-xs text-muted-foreground">{roleLabel(person.role)}{onlineUserIds.has(person.id) ? ' · Active now' : ''}</p></div>
                  {canManageGroup && person.id !== myId && (isAdmin || person.role !== 'ADMIN') && <Button variant="ghost" size="sm" disabled={managingMember} onClick={() => removePerson(person)} aria-label={`Remove ${person.name}`} title={`Remove ${person.name}`}><UserMinus className="h-4 w-4" /></Button>}
                </div>
              ))}
            </div>
            {canInvitePeople && <>
              <Button variant="outline" size="sm" onClick={() => setAddingPerson((value) => !value)} className="w-full"><UserPlus className="mr-2 h-4 w-4" />{addingPerson ? 'Close invitations' : 'Invite people'}</Button>
              {addingPerson && <div className="space-y-2">
                <Label htmlFor="chat-member-search">Search school users</Label>
                <Input id="chat-member-search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Name or role" />
                <div className="max-h-44 overflow-y-auto border border-border" aria-label="People available to invite">
                  {inviteCandidates.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No available people found.</p> : inviteCandidates.map((person) => (
                    <button key={person.id} type="button" disabled={managingMember} onClick={() => addPerson(person)} className="flex min-h-11 w-full items-center gap-2 border-b border-border px-3 text-left text-sm hover:bg-muted focus-visible:bg-muted last:border-0">
                      <UserAvatar name={person.name} src={person.profilePhotoUrl} className="h-7 w-7" /><span className="min-w-0 flex-1 truncate">{person.name}</span><span className="text-xs text-muted-foreground">{roleLabel(person.role)}</span><Plus className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>}
            </>}
          </>}
        </DialogContent>
      </Dialog>

      {camera && <CameraCapture onCapture={sendCameraPhoto} onClose={() => setCamera(false)} />}
    </div>
  );
}
