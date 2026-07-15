import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, UploadCloud, FileText, Loader2, Lock, Download, X,
  CheckCircle2, AlertCircle, BookMarked, LibraryBig,
} from 'lucide-react';
import { pdfjs } from 'react-pdf';
import ePub from 'epubjs';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { normalizeEbookTitle } from '../../../lib/ebookTitles';

const COMPRESSION_THRESHOLD_MB = 50;
const MAX_DOCUMENT_UPLOAD_MB = 100;
const MAX_CBR_UPLOAD_MB = 500;
const MAX_CBZ_UPLOAD_MB = 500;
const COMIC_COMPRESSION_THRESHOLD_MB = 50;
const UPLOAD_CHUNK_BYTES = 20 * 1024 * 1024;
const EBOOK_SERIES_DATALIST_ID = 'ebook-series-options';

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

interface KnownSeries {
  name: string;
  bookCount: number;
  nextVolume: number;
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

function isCbr(file: File) {
  return file.name.toLowerCase().endsWith('.cbr');
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
    const imageExtensions = /\.(jpe?g|jpe|jfif|png|webp)$/i;
    const pages = Object.values(zip.files)
      .filter((entry) => !entry.dir && imageExtensions.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    if (!pages[0]) return {};
    const ext = pages[0].name.toLowerCase().slice(pages[0].name.lastIndexOf('.'));
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const bytes = await pages[0].async('uint8array');
    return { coverBlob: new Blob([bytes], { type: mimeType }) };
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
  const [seriesMode, setSeriesMode] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [seriesStart, setSeriesStart] = useState('1');
  const [knownSeries, setKnownSeries] = useState<KnownSeries[]>([]);
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadKnownSeries = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/ebooks', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const books = await res.json();
        const groups = new Map<string, { name: string; bookCount: number; maxVolume: number }>();
        for (const book of books) {
          const name = String(book.seriesName || '').trim();
          if (!name) continue;
          const key = name.toLocaleLowerCase();
          const group = groups.get(key) || { name, bookCount: 0, maxVolume: 0 };
          group.bookCount += 1;
          group.maxVolume = Math.max(group.maxVolume, Number(book.seriesNumber) || 0);
          groups.set(key, group);
        }
        if (active) {
          setKnownSeries(Array.from(groups.values())
            .map((group) => ({ name: group.name, bookCount: group.bookCount, nextVolume: group.maxVolume + 1 }))
            .sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch {
        // Suggestions are optional; series upload still works if they cannot be loaded.
      }
    };
    void loadKnownSeries();
    return () => { active = false; };
  }, []);

  const matchingSeries = knownSeries.find((series) =>
    series.name.toLocaleLowerCase() === seriesName.trim().toLocaleLowerCase());

  const handleSeriesNameChange = (value: string) => {
    setSeriesName(value);
    const match = knownSeries.find((series) => series.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
    if (match) setSeriesStart(String(match.nextVolume));
  };

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
      const maxMb = ext === '.cbz'
        ? MAX_CBZ_UPLOAD_MB
        : ext === '.cbr'
          ? MAX_CBR_UPLOAD_MB
          : MAX_DOCUMENT_UPLOAD_MB;
      if (f.size > maxMb * 1024 * 1024) {
        toast.error(`${f.name}: this format has a ${maxMb} MB upload limit.`);
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

  const uploadOne = async (entry: QueuedFile, token: string | null, queueIndex: number): Promise<boolean> => {
    updateEntry(entry.key, { status: 'uploading' });
    let chunkUploadId: string | null = null;
    try {
      const availabilityRes = await fetch(`/api/ebooks/title-availability?title=${encodeURIComponent(entry.title.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const availability = await availabilityRes.json().catch(() => ({}));
      if (!availabilityRes.ok) throw new Error(availability.error || 'Could not check this title');
      if (!availability.available) throw new Error(`A book titled "${availability.duplicate?.title || entry.title.trim()}" already exists.`);

      let coverUrl = '';
      if (entry.coverBlob) {
        const coverForm = new FormData();
        const ext = entry.coverBlob.type === 'image/png'
          ? 'png'
          : entry.coverBlob.type === 'image/webp'
            ? 'webp'
            : 'jpg';
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

      const metadata = {
        title: entry.title.trim() || entry.file.name,
        author: entry.author,
        category,
        seriesName: seriesMode ? seriesName.trim() : '',
        seriesNumber: seriesMode && seriesName.trim() ? String(Number(seriesStart) + queueIndex) : '',
        language,
        description,
        visibility,
        downloadAllowed: String(downloadAllowed),
        uploadedByName: user?.name || user?.email || '',
        coverUrl,
      };

      let res: Response;
      if (entry.file.size > UPLOAD_CHUNK_BYTES) {
        chunkUploadId = crypto.randomUUID();
        const totalChunks = Math.ceil(entry.file.size / UPLOAD_CHUNK_BYTES);
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * UPLOAD_CHUNK_BYTES;
          const chunk = entry.file.slice(start, Math.min(start + UPLOAD_CHUNK_BYTES, entry.file.size));
          const chunkForm = new FormData();
          chunkForm.append('uploadId', chunkUploadId);
          chunkForm.append('originalName', entry.file.name);
          chunkForm.append('chunkIndex', String(chunkIndex));
          chunkForm.append('totalChunks', String(totalChunks));
          chunkForm.append('chunk', chunk, `${entry.file.name}.part`);
          const chunkRes = await fetch('/api/ebooks/chunks', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: chunkForm,
          });
          if (!chunkRes.ok) {
            const error = await chunkRes.json().catch(() => ({}));
            throw new Error(error.error || `Failed to upload part ${chunkIndex + 1}`);
          }
        }
        res = await fetch('/api/ebooks/chunks/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ uploadId: chunkUploadId, ...metadata }),
        });
      } else {
        const fd = new FormData();
        fd.append('file', entry.file);
        for (const [key, value] of Object.entries(metadata)) {
          if (value) fd.append(key, value);
        }
        res = await fetch('/api/ebooks', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      updateEntry(entry.key, { status: 'done' });
      return true;
    } catch (err: any) {
      if (chunkUploadId) {
        await fetch(`/api/ebooks/chunks/${chunkUploadId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      updateEntry(entry.key, { status: 'error', error: err.message || 'Upload failed' });
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) { toast.error('Add at least one PDF, EPUB, CBR, or CBZ file.'); return; }
    if (queue.some((q) => !q.title.trim())) { toast.error('Every file needs a title.'); return; }
    const titleKeys = queue.map((q) => normalizeEbookTitle(q.title));
    if (new Set(titleKeys).size !== titleKeys.length) {
      toast.error('Each queued book must have a unique title.');
      return;
    }
    if (seriesMode && !seriesName.trim()) {
      toast.error('Enter a series name or turn off series upload.');
      return;
    }
    const firstSeriesNumber = Number(seriesStart);
    if (seriesMode && (!Number.isInteger(firstSeriesNumber) || firstSeriesNumber < 1)) {
      toast.error('Starting volume must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    const token = sessionStorage.getItem('auth_token');
    let okCount = 0;
    for (const [queueIndex, entry] of queue.entries()) {
      if (entry.status === 'done') { okCount++; continue; }
      // eslint-disable-next-line no-await-in-loop
      const ok = await uploadOne(entry, token, queueIndex);
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
          <p className="text-xs text-slate-500 mt-1">PDF or EPUB up to 100 MB · CBR or CBZ up to {MAX_CBZ_UPLOAD_MB} MB (compressed from 50 MB)</p>
        </div>

        {/* Queued files */}
        {queue.length > 0 && (
          <div className="space-y-3">
            {queue.map((q, queueIndex) => (
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
                    {((q.file.size > COMPRESSION_THRESHOLD_MB * 1024 * 1024 && (isPdf(q.file) || isEpub(q.file)))
                      || (q.file.size >= COMIC_COMPRESSION_THRESHOLD_MB * 1024 * 1024 && (isCbr(q.file) || isCbz(q.file)))) && (
                      <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        {isCbr(q.file) ? 'Will optimize to CBZ' : 'Will compress'}
                      </span>
                    )}
                    {seriesMode && seriesName.trim() && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">Vol. {Number(seriesStart) + queueIndex}</Badge>
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

        <section className={`rounded-xl border p-4 transition-colors ${seriesMode ? 'border-primary/40 bg-primary/[0.04]' : 'border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo'}`} aria-labelledby="series-upload-heading">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"><LibraryBig className="h-5 w-5" /></div>
              <div>
                <h2 id="series-upload-heading" className="font-semibold text-slate-900 dark:text-white">Upload as a book series</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-300">Group these books in one expandable series card, such as Harry Potter.</p>
              </div>
            </div>
            <Switch
              checked={seriesMode}
              onCheckedChange={setSeriesMode}
              aria-label="Upload these books as a series"
            />
          </div>

          {seriesMode && (
            <div className="mt-4 space-y-4 border-t border-primary/15 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ebook-series-name">Series name *</Label>
                  <Input
                    id="ebook-series-name"
                    value={seriesName}
                    onChange={(e) => handleSeriesNameChange(e.target.value)}
                    placeholder="e.g. Harry Potter"
                    list={EBOOK_SERIES_DATALIST_ID}
                    required
                    className="min-h-11 text-base sm:text-sm"
                  />
                  <datalist id={EBOOK_SERIES_DATALIST_ID}>
                    {knownSeries.map((series) => <option key={series.name} value={series.name} />)}
                  </datalist>
                  <p className="text-[11px] text-slate-500">Choose an existing name to add volumes to that series, or type a new one.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ebook-series-start">{isBatch ? 'Starting volume *' : 'Volume number *'}</Label>
                  <Input
                    id="ebook-series-start"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={seriesStart}
                    onChange={(e) => setSeriesStart(e.target.value)}
                    required
                    className="min-h-11 text-base sm:text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    {isBatch ? 'Files are numbered consecutively from top to bottom.' : 'Each volume number can only be used once in a series.'}
                  </p>
                </div>
              </div>

              {matchingSeries && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-primary/15 dark:bg-surface-indigo dark:text-slate-300">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Existing series</Badge>
                  <span>{matchingSeries.bookCount} {matchingSeries.bookCount === 1 ? 'book' : 'books'} already grouped · next volume is {matchingSeries.nextVolume}</span>
                </div>
              )}

              {queue.length > 0 && seriesName.trim() && Number.isInteger(Number(seriesStart)) && Number(seriesStart) > 0 && (
                <div className="rounded-lg border border-dashed border-primary/25 bg-white/70 p-3 dark:bg-black/10">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Series preview</p>
                  <ol className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {queue.slice(0, 5).map((entry, index) => (
                      <li key={entry.key} className="flex min-w-0 gap-2">
                        <span className="shrink-0 font-semibold text-primary">Vol. {Number(seriesStart) + index}</span>
                        <span className="truncate">{entry.title || entry.file.name}</span>
                      </li>
                    ))}
                  </ol>
                  {queue.length > 5 && <p className="mt-2 text-[11px] text-slate-500">+ {queue.length - 5} more volumes</p>}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <p className="text-xs text-slate-500 sm:col-span-2 -mb-2">
            {isBatch ? 'These settings apply to all files above.' : 'Book settings.'}
          </p>
          <div className="space-y-2">
            <Label>Genre / category</Label>
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
