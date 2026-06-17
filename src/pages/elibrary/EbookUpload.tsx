import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, Loader2, Lock, Download } from 'lucide-react';
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

const MAX_MB = 50;

export default function EbookUpload() {
  const navigate = useNavigate();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickFile = (f: File | null) => {
    if (!f) return;
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (ext !== '.pdf' && ext !== '.epub') {
      toast.error('Only PDF and EPUB files are allowed.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large (max ${MAX_MB} MB).`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.(pdf|epub)$/i, ''));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please choose an EPUB or PDF file.'); return; }
    if (!title.trim()) { toast.error('Title is required.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      fd.append('author', author);
      fd.append('category', category);
      fd.append('language', language);
      fd.append('description', description);
      fd.append('visibility', visibility);
      fd.append('downloadAllowed', String(downloadAllowed));
      fd.append('uploadedByName', user?.name || user?.email || '');

      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/ebooks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      toast.success('E-book uploaded.');
      navigate('/elibrary');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/elibrary" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Upload E-book</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Add an EPUB or PDF to the E-Library.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] || null); }}
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 dark:border-surface-raised hover:border-primary/60 transition-colors p-8 text-center bg-white dark:bg-surface-indigo"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3 text-slate-700 dark:text-slate-200">
              <FileText className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB · click to change</p>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Click or drag a file here</p>
              <p className="text-xs text-slate-500 mt-1">PDF or EPUB · up to {MAX_MB} MB</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" required />
          </div>
          <div className="space-y-2">
            <Label>Author</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Math, Science" />
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
          <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><UploadCloud className="h-4 w-4 mr-2" /> Upload</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
