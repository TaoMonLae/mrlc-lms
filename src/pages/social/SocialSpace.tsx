import { useEffect, useRef, useState } from 'react';
import { Sparkles, Image as ImageIcon, Camera, Heart, MessageCircle, Send, Trash2, Clock, X, Loader2, Flag, Pencil, Check, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { apiGet, apiSend, authHeaders, qs } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { useSocial } from '../../providers/SocialProvider';
import CameraCapture from '../../components/CameraCapture';
import { useTheme } from '../../components/theme-provider';
import Lightfall from '@/components/Lightfall';

interface Comment {
  id: string; body: string; createdAt: string; editedAt: string | null;
  user: { id: string; name: string; role: string }; mine: boolean; reportedByMe: boolean;
}
interface Post {
  id: string; body: string | null; imageUrl: string | null; createdAt: string; expiresAt: string;
  author: { id: string; name: string; role: string; photo: string | null };
  mine: boolean; likeCount: number; commentCount: number; likedByMe: boolean; reportedByMe: boolean; comments: Comment[];
}
interface Report {
  id: string; status: string; reason: string | null; createdAt: string; reportedBy: string;
  type: 'POST' | 'COMMENT'; postId: string | null;
  content: { body: string | null; imageUrl?: string | null; author: string };
}

const PAGE_SIZE = 20;
const roleLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase().replace('_', ' ');
const timeLeft = (iso: string) => { const ms = new Date(iso).getTime() - Date.now(); return ms <= 0 ? 'expiring' : `${formatDistanceToNowStrict(new Date(iso))} left`; };

export default function SocialSpace() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { markSeen } = useSocial();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // How many posts are currently loaded (grows as the user clicks "Load
  // more"). The periodic poll re-fetches exactly this many from the top,
  // so it refreshes like/comment counts on everything already on screen
  // without losing what "Load more" has brought in.
  const loadedCountRef = useRef(PAGE_SIZE);

  async function load() {
    try {
      const data = await apiGet<{ posts: Post[]; nextCursor: string | null }>(`/api/social${qs({ limit: String(loadedCountRef.current) })}`);
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
      loadedCountRef.current = Math.max(PAGE_SIZE, data.posts.length);
    } catch (err: any) { toast.error(err.message || 'Could not load Social Space'); }
    finally { setLoading(false); }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiGet<{ posts: Post[]; nextCursor: string | null }>(`/api/social${qs({ limit: String(PAGE_SIZE), cursor: nextCursor })}`);
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      loadedCountRef.current += data.posts.length;
    } catch (err: any) { toast.error(err.message || 'Could not load more posts'); }
    finally { setLoadingMore(false); }
  }

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  // Visiting the feed counts as "seen" -- clears the sidebar badge for new
  // posts/comments the same way opening a chat thread clears its unread badge.
  useEffect(() => { markSeen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.role === 'ADMIN';

  async function loadReports() {
    try {
      const data = await apiGet<Report[]>('/api/social/reports?status=OPEN');
      setReports(data);
      setOpenReportCount(data.length);
    } catch { /* silent -- reviewed on demand, not critical to the feed */ }
  }
  useEffect(() => { if (isAdmin) loadReports(); }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickPhoto(blob: Blob) { setPhoto({ blob, url: URL.createObjectURL(blob) }); setCamera(false); }

  async function submit() {
    if (!body.trim() && !photo) { toast.error('Add a photo or some text'); return; }
    setPosting(true);
    try {
      const fd = new FormData();
      if (body.trim()) fd.append('body', body.trim());
      if (photo) fd.append('file', photo.blob, 'post.jpg');
      const res = await fetch('/api/social', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not post');
      setBody(''); setPhoto(null);
      toast.success('Posted — disappears in 24 hours');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not post'); }
    finally { setPosting(false); }
  }

  async function toggleLike(p: Post) {
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) } : x));
    try { await apiSend(`/api/social/${p.id}/like`, 'POST', {}); }
    catch { load(); }
  }

  async function addComment(p: Post) {
    const text = (commentDraft[p.id] || '').trim();
    if (!text) return;
    setCommentDraft((d) => ({ ...d, [p.id]: '' }));
    try {
      const c = await apiSend<Comment>(`/api/social/${p.id}/comments`, 'POST', { body: text });
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, comments: [...x.comments, { ...c, editedAt: null, reportedByMe: false }], commentCount: x.commentCount + 1 } : x));
    } catch (err: any) { toast.error(err.message || 'Could not comment'); }
  }

  function startEditComment(c: Comment) { setEditingComment(c.id); setEditDraft(c.body); }

  async function saveEditComment(postId: string, commentId: string) {
    const text = editDraft.trim();
    if (!text) { toast.error('Comment cannot be empty'); return; }
    try {
      const updated = await apiSend<Comment>(`/api/social/comments/${commentId}`, 'PUT', { body: text });
      setPosts((prev) => prev.map((x) => x.id === postId
        ? { ...x, comments: x.comments.map((c) => c.id === commentId ? { ...c, body: updated.body, editedAt: updated.editedAt } : c) }
        : x));
      setEditingComment(null);
    } catch (err: any) { toast.error(err.message || 'Could not save edit'); }
  }

  async function removePost(id: string) {
    if (!window.confirm('Delete this post?')) return;
    try { await apiSend(`/api/social/${id}`, 'DELETE'); setPosts((prev) => prev.filter((p) => p.id !== id)); }
    catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  async function removeComment(postId: string, commentId: string) {
    try {
      await apiSend(`/api/social/comments/${commentId}`, 'DELETE');
      setPosts((prev) => prev.map((x) => x.id === postId ? { ...x, comments: x.comments.filter((c) => c.id !== commentId), commentCount: x.commentCount - 1 } : x));
    } catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  async function reportPost(p: Post) {
    if (p.reportedByMe) return;
    if (!window.confirm('Report this post to the admin team?')) return;
    try {
      await apiSend(`/api/social/${p.id}/report`, 'POST', {});
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, reportedByMe: true } : x));
      toast.success('Reported. An admin will review it.');
    } catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function reportComment(postId: string, c: Comment) {
    if (c.reportedByMe) return;
    if (!window.confirm('Report this comment to the admin team?')) return;
    try {
      await apiSend(`/api/social/comments/${c.id}/report`, 'POST', {});
      setPosts((prev) => prev.map((x) => x.id === postId
        ? { ...x, comments: x.comments.map((cc) => cc.id === c.id ? { ...cc, reportedByMe: true } : cc) }
        : x));
      toast.success('Reported. An admin will review it.');
    } catch (err: any) { toast.error(err.message || 'Could not report'); }
  }

  async function resolveReport(id: string, action: 'ACTIONED' | 'DISMISSED') {
    try {
      await apiSend(`/api/social/reports/${id}/resolve`, 'POST', { action });
      setReports((prev) => prev.filter((r) => r.id !== id));
      setOpenReportCount((n) => Math.max(0, n - 1));
      if (action === 'ACTIONED') load(); // the removed post/comment may be visible in the feed right now
      toast.success(action === 'ACTIONED' ? 'Content removed' : 'Report dismissed');
    } catch (err: any) { toast.error(err.message || 'Could not resolve report'); }
  }

  return (
    <div className="relative isolate -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 sm:-m-6 lg:-m-8 dark:bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Lightfall
          className="h-full w-full"
          colors={['#7a3dff', '#3b89ff', '#c084fc']}
          backgroundColor={theme === 'dark' ? '#0d0d24' : '#f1eeff'}
          speed={0.4}
          streakCount={3}
          glow={1}
          density={0.5}
          twinkle={1}
          mouseInteraction={false}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header banner — content now floats over the full-page background
          above (translucent + blurred instead of its own opaque card). */}
      <div className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-surface-raised/80 dark:bg-surface-indigo/70">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-aubergine-100 p-2 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Social Space</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Share a photo or a thought with the school. Everything disappears after 24 hours.</p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="relative shrink-0" onClick={() => { setReportsOpen(true); loadReports(); }}>
              <ShieldAlert className="mr-1.5 h-4 w-4" /> Reports
              {openReportCount > 0 && <Badge className="ml-1.5 h-5 min-w-5 justify-center bg-red-600 px-1 text-white hover:bg-red-600">{openReportCount}</Badge>}
            </Button>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-4 dark:border-surface-raised/80 dark:bg-surface-indigo/70">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={1000} placeholder="What's happening?" className="resize-none" />
        {photo && (
          <div className="relative inline-block">
            <img src={photo.url} alt="preview" className="max-h-48 rounded-lg" />
            <button onClick={() => setPhoto(null)} className="absolute -top-2 -right-2 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"><X className="h-4 w-4 text-rose-500" /></button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto({ blob: f, url: URL.createObjectURL(f) }); }} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><ImageIcon className="mr-1 h-4 w-4" /> Photo</Button>
            <Button variant="ghost" size="sm" onClick={() => setCamera(true)}><Camera className="mr-1 h-4 w-4" /> Camera</Button>
          </div>
          <Button onClick={submit} disabled={posting || (!body.trim() && !photo)}>{posting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Post (24h)</Button>
        </div>
      </div>

      {/* Feed */}
      {loading ? <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p> :
        posts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">Nothing here yet. Be the first to post!</div> :
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-surface-raised/80 dark:bg-surface-indigo/70">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-aubergine-100 text-xs font-bold text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400">
                    {p.author.photo ? <img src={p.author.photo} alt="" className="h-full w-full object-cover" /> : p.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.author.name} <Badge variant="outline" className="ml-1 text-[9px] uppercase dark:border-slate-600 dark:text-slate-300">{roleLabel(p.author.role)}</Badge></p>
                    <p className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500"><Clock className="h-3 w-3" /> {timeLeft(p.expiresAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {!p.mine && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={p.reportedByMe} title={p.reportedByMe ? 'Already reported' : 'Report post'} onClick={() => reportPost(p)}>
                      <Flag className={`h-3.5 w-3.5 ${p.reportedByMe ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                    </Button>
                  )}
                  {(p.mine || isAdmin) && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePost(p.id)}><Trash2 className="h-4 w-4 text-slate-400 dark:text-slate-500" /></Button>}
                </div>
              </div>

              {p.body && <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-slate-800 dark:text-slate-200">{p.body}</p>}
              {p.imageUrl && <img src={p.imageUrl} alt="post" className="max-h-[28rem] w-full object-cover" />}

              <div className="flex items-center gap-4 p-3">
                <button onClick={() => toggleLike(p)} className={`flex items-center gap-1 text-sm ${p.likedByMe ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400'}`}>
                  <Heart className={`h-5 w-5 ${p.likedByMe ? 'fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400' : ''}`} /> {p.likeCount > 0 && p.likeCount}
                </button>
                <button onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <MessageCircle className="h-5 w-5" /> {p.commentCount > 0 && p.commentCount}
                </button>
              </div>

              {openComments[p.id] && (
                <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-700">
                  {p.comments.map((c) => (
                    <div key={c.id} className="group flex items-start justify-between gap-2 text-sm">
                      {editingComment === c.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <Input value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditComment(p.id, c.id); if (e.key === 'Escape') setEditingComment(null); }}
                            className="h-8 dark:bg-slate-800 dark:border-slate-600 dark:text-white" autoFocus />
                          <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => saveEditComment(p.id, c.id)}><Check className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <>
                          <p>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{c.user.name}</span>{' '}
                            <span className="text-slate-600 dark:text-slate-400">{c.body}</span>{' '}
                            {c.editedAt && <span className="text-[10px] text-slate-400 dark:text-slate-500">(edited)</span>}
                          </p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                            {c.mine && <button onClick={() => startEditComment(c)} title="Edit"><Pencil className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /></button>}
                            {!c.mine && (
                              <button onClick={() => reportComment(p.id, c)} disabled={c.reportedByMe} title={c.reportedByMe ? 'Already reported' : 'Report comment'}>
                                <Flag className={`h-3.5 w-3.5 ${c.reportedByMe ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                              </button>
                            )}
                            {(c.mine || isAdmin) && <button onClick={() => removeComment(p.id, c.id)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /></button>}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Input value={commentDraft[p.id] || ''} onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(p); } }} placeholder="Add a comment…" className="h-9 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => addComment(p)} disabled={!(commentDraft[p.id] || '').trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </div>}
      </div>

      {camera && <CameraCapture onCapture={pickPhoto} onClose={() => setCamera(false)} />}

      {isAdmin && (
        <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reported content</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {reports.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Nothing reported right now.</p>
              ) : reports.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 p-3 dark:border-surface-raised">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{r.type === 'POST' ? 'Post' : 'Comment'} by {r.content.author} · reported by {r.reportedBy}</span>
                  </div>
                  {r.content.body && <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{r.content.body}</p>}
                  {r.content.imageUrl && <img src={r.content.imageUrl} alt="reported" className="mt-2 max-h-40 rounded-md" />}
                  {r.reason && <p className="mt-1 text-xs italic text-slate-500">Reason: {r.reason}</p>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => resolveReport(r.id, 'ACTIONED')}>Remove content</Button>
                    <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, 'DISMISSED')}>Dismiss</Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
