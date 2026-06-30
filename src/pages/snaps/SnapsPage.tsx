import { useEffect, useState } from 'react';
import { Camera, Clock, Trash2, Loader2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { apiGet, apiSend, authHeaders } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import CameraCapture from '../../components/CameraCapture';

interface Snap {
  id: string; imageUrl: string; caption: string | null; createdAt: string; expiresAt: string;
  mine?: boolean;
  student?: { name: string; className: string | null; photo: string | null };
}

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  return `${formatDistanceToNowStrict(new Date(expiresAt))} left`;
}

export default function SnapsPage() {
  const { user } = useAuth();
  // Students post + see their own; everyone else (staff/teachers/admins) views the feed.
  const isStudent = user?.role === 'STUDENT';
  const isViewer = !isStudent;
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [camera, setCamera] = useState(false);
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    try { setSnaps(await apiGet<Snap[]>('/api/snaps')); }
    catch (err: any) { toast.error(err.message || 'Could not load snaps'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function onCapture(blob: Blob) {
    setPending({ blob, url: URL.createObjectURL(blob) });
    setCamera(false);
  }

  async function post() {
    if (!pending) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('file', pending.blob, 'snap.jpg');
      if (caption.trim()) fd.append('caption', caption.trim());
      const res = await fetch('/api/snaps', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not post');
      toast.success('Posted — visible to your teachers for 24 hours');
      setPending(null); setCaption('');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not post'); }
    finally { setPosting(false); }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this snap?')) return;
    try { await apiSend(`/api/snaps/${id}`, 'DELETE'); load(); }
    catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-aubergine-100 p-2 text-aubergine-700"><Camera className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Work Snaps</h1>
            <p className="text-sm text-slate-500">{isStudent ? 'Snap your work — it shows to your teachers for 24 hours, then disappears.' : 'Recent student work — each snap auto-expires after 24 hours.'}</p>
          </div>
        </div>
        {isStudent && !pending && <Button onClick={() => setCamera(true)}><Camera className="mr-2 h-4 w-4" /> New snap</Button>}
      </div>

      {/* Student compose preview */}
      {isStudent && pending && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start">
          <img src={pending.url} alt="preview" className="max-h-64 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)" maxLength={200} />
            <div className="flex gap-2">
              <Button onClick={post} disabled={posting}>{posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Post (24h)</Button>
              <Button variant="outline" onClick={() => { setPending(null); setCaption(''); }}>Discard</Button>
              <Button variant="ghost" onClick={() => setCamera(true)}>Retake</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-slate-400">Loading…</p> :
        snaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            <ImageOff className="mx-auto mb-3 h-10 w-10" />
            <p className="text-sm">{isStudent ? 'No active snaps. Tap “New snap” to share your work.' : 'No student snaps right now.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {snaps.map((s) => (
              <div key={s.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative">
                  <img src={s.imageUrl} alt="snap" className="aspect-square w-full object-cover" />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                    <Clock className="h-3 w-3" /> {timeLeft(s.expiresAt)}
                  </span>
                  {(s.mine || isViewer) && (
                    <button onClick={() => remove(s.id)} className="absolute right-2 top-2 hidden rounded-full bg-white/90 p-1 shadow group-hover:block" title="Delete">
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </button>
                  )}
                </div>
                <div className="space-y-1 p-2">
                  {s.student && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-medium text-slate-800">{s.student.name}</span>
                      {s.student.className && <Badge variant="outline" className="text-[9px]">{s.student.className}</Badge>}
                    </div>
                  )}
                  {s.caption && <p className="line-clamp-2 text-xs text-slate-600">{s.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

      {camera && <CameraCapture onCapture={onCapture} onClose={() => setCamera(false)} />}
    </div>
  );
}
