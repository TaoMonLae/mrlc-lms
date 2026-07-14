import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, UploadCloud, FileText, Loader2, Lock, Download, X,
  CheckCircle2, AlertCircle, BookMarked,
} from 'lucide-react';
import { pdfjs } from 'react-pdf';
import ePub from 'epubjs';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUser } from '../../lib/permissions';
import { EBOOK_CATEGORY_DATALIST_ID, EbookCategoryOptions } from '../../lib/ebookCategories';

const COMPRESSION_THRESHOLD_MB = 50;
const MAX_UPLOAD_MB = 100;

interface QueuedFile {
  key: string;
  file: File;
  title: string;
  author: string;
  coverBlob: Blob | null;
  coverPreview: string | null;
  extracting: boolean;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

function isEpub(file: File) {
  return file.name.toLowerCase().endsWith('.epub');
}

function isPdf(file: File) {
  return file.name.toLowerCase().endsWith('.pdf');
}

function isCbz(file: File) {
  return file.name.toLowerCase().endsWith('.cbz');
}

// Reads the EPUB's own metadata (title/author) and embedded cover image so
// the uploader doesn't have to retype what's already in the file.
async function extractEpubMeta(file: File): Promise<{ title?: string; author?: string; coverBlob?: Blob }> {
  let book: any;
  try {
    const buf = await file.arrayBuffer();
    book = ePub(buf as any);
    const meta = await book.loaded.metadata;
    let coverBlob: Blob | undefined;
    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const resp = await fetch(coverUrl);
        coverBlob = await resp.blob();
      }
    } catch { /* no embedded cover — not an error */ }
    return { title: meta?.title?.trim() || undefined, author: meta?.creator?.trim() || undefined, coverBlob };
  } catch {
    return {};
  } finally {
    try { book?.destroy(); } catch { /* noop */ }
  }
}

// Renders a PDF's first page to a small canvas to use as a cover thumbnail,
// and reads the document Title from its metadata if present.
async function extractPdfMeta(file: File): Promise<{ title?: string; coverBlob?: Blob }> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let title: string | undefined;
    try {
      const meta: any = await pdf.getMetadata();
      if (meta?.info?.Title) title = String(meta.info.Title).trim();
    } catch { /* no metadata — not an error */ }
    let coverBlob: Blob | undefined;
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        coverBlob = (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))) || undefined;
      }
    } catch { /* rendering failed — not fatal, just no auto cover */ }
    return { title, coverBlob };
  } catch {
    return {};
  }
}

// CBZ is a ZIP archive of image pages. Use the naturally first page as its
// cover preview; CBR metadata is extracted by the server-side archive reader.
async function extractCbzMeta(file: File): Promise<{ coverBlob?: Blob }> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const imageExtensions = /\.(jpe?g|png|webp|gif)$/i;
    const pages = Object.values(zip.files)
      .filter((entry) => !entry.dir && imageExtensions.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    if (!pages[0]) return {};
    return { coverBlob: await pages[0].async('blob') };
  } catch {
    return {};
  }
}

export default function EbookUpload() {
  const navigate = useNavigate();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateEntry = (key: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const pickFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    const accepted: QueuedFile[] = [];
    for (const f of list) {
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
      if (!['.pdf', '.epub', '.cbr', '.cbz'].includes(ext)) {
        toast.error(`${f.name}: only PDF, EPUB, CBR, and CBZ files are allowed.`);
        continue;
      }
      if (['.cbr', '.cbz'].includes(ext) && f.size > COMPRESSION_THRESHOLD_MB * 1024 * 1024) {
        toast.error(`${f.name}: comic archives must be ${COMPRESSION_THRESHOLD_MB} MB or smaller.`);
        continue;
      }
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`${f.name}: file is too large (max ${MAX_UPLOAD_MB} MB before compression).`);
        continue;
      }
      accepted.push({
        key: `${f.name}-${f.size}-${f.lastModified}`,
        file: f,
        title: f.name.replace(/\.(pdf|epub|cbr|cbz)$/i, ''),
        author: '',
        coverBlob: null,
        coverPreview: null,
        extracting: true,
        status: 'pending',
      });
    }
    if (accepted.length === 0) return;
    setQueue((prev) => [...prev, ...accepted]);

    // Auto-fill title/author and cover art in the background for each file.
    accepted.forEach(async (entry) => {
      // Avoid decoding a very large book twice in the browser. The server will
      // compress it during upload; metadata remains editable in this form.
      const result: { title?: string; author?: string; coverBlob?: Blob } = entry.file.size > COMPRESSION_THRESHOLD_MB * 1024 * 1024
        ? {}
        : isEpub(entry.file)
          ? await extractEpubMeta(entry.file)
          : isPdf(entry.file)
            ? await extractPdfMeta(entry.file)
            : isCbz(entry.file)
              ? await extractCbzMeta(entry.file)
              : {};
      const coverPreview = result.coverBlob ? URL.createObjectURL(result.coverBlob) : null;
      setQueue((prev) => prev.map((q) => (q.key === entry.key
        ? {
          ...q,
          title: result.title || q.title,
          author: (result as any).author || q.author,
          coverBlob: result.coverBlob || null,
          coverPreview,
          extracting: false,
        }
        : q)));
    });
  };

  const removeEntry = (key: string) => {
    setQueue((prev) => {
      const entry = prev.find((q) => q.key === key);
      if (entry?.coverPreview) URL.revokeObjectURL(entry.coverPreview);
      return prev.filter((q) => q.key !== key);
    });
  };

  const uploadOne = async (entry: QueuedFile, token: string | null): Promise<boolean> => {
    updateEntry(entry.key, { status: 'uploading' });
    try {
      let coverUrl = '';
      if (entry.coverBlob) {
        const coverForm = new FormData();
        const ext = entry.coverBlob.type === 'image/png' ? 'png' : 'jpg';
        coverForm.append('cover', entry.coverBlob, `cover.${ext}`);
        const coverRes = await fetch('/api/ebooks/cover-upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: coverForm,
        });
        if (coverRes.ok) {
          const { url } = await coverRes.json();
          coverUrl = url;
        }
        // A failed cover upload isn't fatal — the book still uploads without one.
      }

      const fd = new FormData();
      fd.append('file', entry.file);
      fd.append('title', entry.title.trim() || entry.file.name);
      fd.append('author', entry.author);
      fd.append('category', category);
      fd.append('language', language);
      fd.append('description', description);
      fd.append('visibility', visibility);
      fd.append('downloadAllowed', String(downloadAllowed));
      fd.append('uploadedByName', user?.name || user?.email || '');
      if (coverUrl) fd.append('coverUrl', coverUrl);

      const res = await fetch('/api/ebooks', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      updateEntry(entry.key, { status: 'done' });
      return true;
    } catch (err: any) {
      updateEntry(entry.key, { status: 'error', error: err.message || 'Upload failed' });
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) { toast.error('Add at least one PDF, EPUB, CBR, or CBZ file.'); return; }
    if (queue.some((q) => !q.title.trim())) { toast.error('Every file needs a title.'); return; }

    setSubmitting(true);
    const token = sessionStorage.getItem('auth_token');
    let okCount = 0;
    for (const entry of queue) {
      if (entry.status === 'done') { okCount++; continue; }
      // eslint-disable-next-line no-await-in-loop
      const ok = await uploadOne(entry, token);
      if (ok) okCount++;
    }
    setSubmitting(false);

    if (okCount === queue.length) {
      toast.success(queue.length === 1 ? 'E-book uploaded.' : `${okCount} e-books uploaded.`);
      navigate('/elibrary');
    } else if (okCount > 0) {
      toast.warning(`${okCount} of ${queue.length} uploaded — fix the failed ones and try again.`);
    } else {
      toast.error('Upload failed.');
    }
  };

  const isBatch = queue.length > 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/elibrary" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Upload E-book{isBatch ? 's' : ''}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Add PDF, EPUB, CBR, or CBZ books to the E-Library.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer.files); }}
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 dark:border-surface-raised hover:border-primary/60 transition-colors p-8 text-center bg-white dark:bg-surface-indigo"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.epub,.cbr,.cbz,application/pdf,application/epub+zip,application/vnd.rar,application/zip"
            className="hidden"
            onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
          />
          <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Click or drag files here</p>
          <p className="text-xs text-slate-500 mt-1">PDF, EPUB, CBR, or CBZ · up to {MAX_UPLOAD_MB} MB for documents and {COMPRESSION_THRESHOLD_MB} MB for comics</p>
        </div>

        {/* Queued files */}
        {queue.length > 0 && (
          <div className="space-y-3">
            {queue.map((q) => (
              <div key={q.key} className="flex gap-3 rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-3">
                <div className="h-16 w-11 shrink-0 rounded-sm bg-accent-purple/10 border border-slate-100 dark:border-surface-raised flex items-center justify-center overflow-hidden">
                  {q.extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : q.coverPreview ? (
                    <img src={q.coverPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookMarked className="h-5 w-5 text-accent-purple" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500 truncate">{q.file.name} · {(q.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    {q.file.size > COMPRESSION_THRESHOLD_MB * 1024 * 1024 && (isPdf(q.file) || isEpub(q.file)) && (
                      <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">Will compress</span>
                    )}
                  </div>
                  <Input
                    value={q.title}
                    onChange={(e) => updateEntry(q.key, { title: e.target.value })}
                    placeholder="Title"
                    className="h-8 text-sm"
                    disabled={q.status === 'uploading' || q.status === 'done'}
                  />
                  <Input
                    value={q.author}
                    onChange={(e) => updateEntry(q.key, { author: e.target.value })}
                    placeholder="Author (optional)"
                    className="h-8 text-sm"
                    disabled={q.status === 'uploading' || q.status === 'done'}
                  />
                  {q.status === 'error' && <p className="text-xs text-red-600">{q.error}</p>}
                </div>
                <div className="flex flex-col items-center justify-between shrink-0">
                  {q.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {q.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {q.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {q.status === 'pending' && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEntry(q.key)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <p className="text-xs text-slate-500 sm:col-span-2 -mb-2">
            {isBatch ? 'These settings apply to all files above.' : 'Book settings.'}
          </p>
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
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English" />
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" rows={3} />
          </div>
        </div>

        {/* Permission */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-surface-raised p-4 bg-white dark:bg-surface-indigo">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
              {downloadAllowed ? <Download className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <Label className="text-base">Allow download</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                {downloadAllowed
                  ? 'Readers can download the original file.'
                  : 'Read online only — no download (recommended for licensed material).'}
              </p>
            </div>
          </div>
          <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" render={<Link to="/elibrary" />} nativeButton={false}>Cancel</Button>
          <Button type="submit" disabled={submitting || queue.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
              : <><UploadCloud className="h-4 w-4 mr-2" /> Upload {queue.length > 1 ? `${queue.length} Books` : 'Book'}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
