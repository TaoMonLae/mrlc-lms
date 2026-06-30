import { useEffect, useRef, useState } from 'react';
import { Sparkles, Image as ImageIcon, Camera, Heart, MessageCircle, Send, Trash2, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { apiGet, apiSend, authHeaders } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import CameraCapture from '../../components/CameraCapture';

interface Comment { id: string; body: string; createdAt: string; user: { id: string; name: string; role: string }; mine: boolean }
interface Post {
  id: string; body: string | null; imageUrl: string | null; createdAt: string; expiresAt: string;
  author: { id: string; name: string; role: string; photo: string | null };
  mine: boolean; likeCount: number; commentCount: number; likedByMe: boolean; comments: Comment[];
}

const roleLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase().replace('_', ' ');
const timeLeft = (iso: string) => { const ms = new Date(iso).getTime() - Date.now(); return ms <= 0 ? 'expiring' : `${formatDistanceToNowStrict(new Date(iso))} left`; };

export default function SocialSpace() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try { setPosts(await apiGet<Post[]>('/api/social')); }
    catch (err: any) { toast.error(err.message || 'Could not load Social Space'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

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
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, comments: [...x.comments, c], commentCount: x.commentCount + 1 } : x));
    } catch (err: any) { toast.error(err.message || 'Could not comment'); }
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

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-aubergine-100 p-2 text-aubergine-700"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Social Space</h1>
          <p className="text-sm text-slate-500">Share a photo or a thought with the school. Everything disappears after 24 hours.</p>
        </div>
      </div>

      {/* Composer */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={1000} placeholder="What's happening?" className="resize-none" />
        {photo && (
          <div className="relative inline-block">
            <img src={photo.url} alt="preview" className="max-h-48 rounded-lg" />
            <button onClick={() => setPhoto(null)} className="absolute -top-2 -right-2 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200"><X className="h-4 w-4 text-rose-500" /></button>
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
      {loading ? <p className="text-sm text-slate-400">Loading…</p> :
        posts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">Nothing here yet. Be the first to post!</div> :
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-aubergine-100 text-xs font-bold text-aubergine-700">
                    {p.author.photo ? <img src={p.author.photo} alt="" className="h-full w-full object-cover" /> : p.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.author.name} <Badge variant="outline" className="ml-1 text-[9px] uppercase">{roleLabel(p.author.role)}</Badge></p>
                    <p className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="h-3 w-3" /> {timeLeft(p.expiresAt)}</p>
                  </div>
                </div>
                {(p.mine || isAdmin) && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePost(p.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>}
              </div>

              {p.body && <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-slate-800">{p.body}</p>}
              {p.imageUrl && <img src={p.imageUrl} alt="post" className="max-h-[28rem] w-full object-cover" />}

              <div className="flex items-center gap-4 p-3">
                <button onClick={() => toggleLike(p)} className={`flex items-center gap-1 text-sm ${p.likedByMe ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}>
                  <Heart className={`h-5 w-5 ${p.likedByMe ? 'fill-rose-500 text-rose-500' : ''}`} /> {p.likeCount > 0 && p.likeCount}
                </button>
                <button onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <MessageCircle className="h-5 w-5" /> {p.commentCount > 0 && p.commentCount}
                </button>
              </div>

              {openComments[p.id] && (
                <div className="space-y-2 border-t border-slate-100 p-3">
                  {p.comments.map((c) => (
                    <div key={c.id} className="group flex items-start justify-between gap-2 text-sm">
                      <p><span className="font-medium text-slate-800">{c.user.name}</span> <span className="text-slate-600">{c.body}</span></p>
                      {(c.mine || isAdmin) && <button onClick={() => removeComment(p.id, c.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-slate-400" /></button>}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Input value={commentDraft[p.id] || ''} onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(p); } }} placeholder="Add a comment…" className="h-9" />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => addComment(p)} disabled={!(commentDraft[p.id] || '').trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>}

      {camera && <CameraCapture onCapture={pickPhoto} onClose={() => setCamera(false)} />}
    </div>
  );
}
