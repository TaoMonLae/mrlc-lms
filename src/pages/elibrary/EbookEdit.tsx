import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Lock, Download, BookMarked, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { EBOOK_CATEGORY_DATALIST_ID, EbookCategoryOptions } from '../../lib/ebookCategories';

export default function EbookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [format, setFormat] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/ebooks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('E-book not found');
        const b = await res.json();
        setFormat(b.format || '');
        setTitle(b.title || '');
        setAuthor(b.author || '');
        setCategory(b.category || '');
        setLanguage(b.language || '');
        setDescription(b.description || '');
        setVisibility(b.visibility || 'ALL');
        setDownloadAllowed(Boolean(b.downloadAllowed));
        setCoverUrl(b.coverUrl || null);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load e-book');
        navigate('/elibrary');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleCoverChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choose an image file.'); return; }
    setCoverUploading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const fd = new FormData();
      fd.append('cover', file);
      const res = await fetch('/api/ebooks/cover-upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error('Cover upload failed');
      const { url } = await res.json();
      setCoverUrl(url);
      toast.success('Cover updated — click Save changes to keep it.');
    } catch (e: any) {
      toast.error(e.message || 'Cover upload failed');
    } finally {
      setCoverUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/ebooks/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), author, category, language, description, visibility, downloadAllowed, coverUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      toast.success('E-book updated.');
      navigate('/elibrary');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/elibrary" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Edit E-book {format && <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold">{format}</Badge>}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Update details and access permissions.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-24 w-16 shrink-0 rounded-sm bg-accent-purple/10 border border-slate-200 dark:border-surface-raised flex items-center justify-center overflow-hidden">
            {coverUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookMarked className="h-6 w-6 text-accent-purple" />
            )}
          </div>
          <div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleCoverChange(e.target.files?.[0] || null); e.target.value = ''; }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> {coverUrl ? 'Replace cover' : 'Add cover'}
            </Button>
            <p className="text-xs text-slate-500 mt-1">Optional — shown on the E-Library list.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Author</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Choose or type a genre/category"
              list={EBOOK_CATEGORY_DATALIST_ID}
            />
            <EbookCategoryOptions />
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Visible to</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="STUDENTS">Students only</SelectItem>
                <SelectItem value="TEACHERS_ONLY">Teachers only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-surface-raised p-4 bg-white dark:bg-surface-indigo">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
              {downloadAllowed ? <Download className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <Label className="text-base">Allow download</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                {downloadAllowed ? 'Readers can download the original file.' : 'Read online only — no download.'}
              </p>
            </div>
          </div>
          <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" render={<Link to="/elibrary" />} nativeButton={false}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
