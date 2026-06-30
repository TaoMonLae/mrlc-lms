import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sticker, Plus, Upload, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet, apiSend, authHeaders } from '../../lib/api';

interface Pack { name: string; editable: boolean; stickers: string[] }

export default function ChatStickers() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPack, setNewPack] = useState('');
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    try { setPacks((await apiGet<{ packs: Pack[] }>('/api/chat/stickers')).packs ?? []); }
    catch (err: any) { toast.error(err.message || 'Could not load stickers'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function createPack() {
    const name = newPack.trim();
    if (!name) { toast.error('Enter a pack name'); return; }
    try {
      await apiSend('/api/chat/sticker-packs', 'POST', { name });
      toast.success('Pack created');
      setNewPack('');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not create pack'); }
  }

  async function uploadTo(pack: string, files: FileList) {
    setUploadingTo(pack);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const res = await fetch(`/api/chat/sticker-packs/${encodeURIComponent(pack)}/stickers`, { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast.success(`Added ${data.urls?.length ?? 0} sticker(s)`);
      load();
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setUploadingTo(null); if (fileRefs.current[pack]) fileRefs.current[pack]!.value = ''; }
  }

  async function deleteSticker(pack: string, url: string) {
    const file = url.split('/').pop()!;
    try {
      await apiSend(`/api/chat/sticker-packs/${encodeURIComponent(pack)}/stickers/${encodeURIComponent(file)}`, 'DELETE');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not delete'); }
  }

  async function deletePack(pack: string) {
    if (!window.confirm(`Delete the “${pack}” pack and all its stickers?`)) return;
    try {
      await apiSend(`/api/chat/sticker-packs/${encodeURIComponent(pack)}`, 'DELETE');
      toast.success('Pack deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not delete pack'); }
  }

  return (
    <div className="space-y-6">
      <Link to="/chat" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to chat
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-aubergine-100 p-2 text-aubergine-700"><Sticker className="h-5 w-5" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Sticker packs</h1>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1"><Label className="text-xs">New pack</Label><Input value={newPack} onChange={(e) => setNewPack(e.target.value)} placeholder="e.g. School fun" className="h-9 w-48" /></div>
          <Button onClick={createPack}><Plus className="mr-1 h-4 w-4" /> Create</Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading…</p> :
        packs.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">No sticker packs yet. Create one above.</p> :
        <div className="space-y-5">
          {packs.map((p) => (
            <div key={p.name} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">{p.name}</h2>
                  <Badge variant="outline" className="text-[10px]">{p.stickers.length}</Badge>
                  {!p.editable && <Badge className="bg-slate-200 text-slate-600 text-[10px]">Built-in</Badge>}
                </div>
                {p.editable && (
                  <div className="flex items-center gap-2">
                    <input ref={(el) => { fileRefs.current[p.name] = el; }} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden"
                      onChange={(e) => { if (e.target.files?.length) uploadTo(p.name, e.target.files); }} />
                    <Button size="sm" variant="outline" disabled={uploadingTo === p.name} onClick={() => fileRefs.current[p.name]?.click()}>
                      {uploadingTo === p.name ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} Upload
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deletePack(p.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {p.stickers.map((url) => (
                  <div key={url} className="group relative">
                    <img src={url} alt="sticker" className="h-16 w-16 rounded-lg border border-slate-100 object-contain p-1" />
                    {p.editable && (
                      <button onClick={() => deleteSticker(p.name, url)} className="absolute -top-1.5 -right-1.5 hidden rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200 group-hover:block" title="Remove">
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    )}
                  </div>
                ))}
                {p.stickers.length === 0 && <p className="text-xs text-slate-400">No stickers — upload some.</p>}
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
