import React from 'react';
import { FileText, Upload, Download, Trash2, Edit2, Shield, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '../../providers/AuthProvider';
import { apiGet, apiSend, downloadAuthenticatedFile } from '../../lib/api';
import { formatDateOnly } from '../../lib/dates';
import { toast } from 'sonner';
import { studentDocumentExpiryStatus } from '../../../shared/studentDocumentExpiry';

const DOCUMENT_TYPES = ['UNHCR', 'PASSPORT', 'BIRTH_CERTIFICATE', 'SCHOOL_RECORD', 'GUARDIAN_DOC', 'MEDICAL', 'OTHER'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];
export interface StudentDocument {
  id: string; studentId: string; title: string; documentType: DocumentType; fileUrl: string;
  fileName: string; fileSize: number; mimeType: string; expiryDate?: string; uploadedById: string;
  uploadedByName: string; status: 'ACTIVE' | 'ARCHIVED'; createdAt: string;
}
const initialUpload = { title: '', documentType: 'OTHER' as DocumentType, expiryDate: '', file: null as File | null };
const fileSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function StudentDocuments({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  // These are private supporting records, not the student's issued official documents.
  const canManage = user?.role === 'ADMIN';
  const canView = canManage || user?.role === 'TEACHER';
  const [documents, setDocuments] = React.useState<StudentDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [upload, setUpload] = React.useState(initialUpload);
  const [uploading, setUploading] = React.useState(false);
  const [renaming, setRenaming] = React.useState<StudentDocument | null>(null);
  const [title, setTitle] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    setDocuments([]); setLoading(true); setLoadError(false); setUploadOpen(false); setRenaming(null);
    if (!studentId || !canView) { setLoading(false); return () => controller.abort(); }
    apiGet<StudentDocument[]>(`/api/students/${studentId}/documents`, { signal: controller.signal })
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(error => { if (error?.name !== 'AbortError') setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [studentId, canView, reloadKey]);
  const filtered = documents.filter(document => `${document.title} ${document.fileName} ${document.documentType}`.toLowerCase().includes(search.toLowerCase()));
  const download = async (document: StudentDocument) => {
    setBusyId(document.id);
    try { await downloadAuthenticatedFile(`/api/students/${studentId}/documents/${document.id}/file`, document.fileName); }
    catch (error: any) { toast.error(error.message || 'Could not download document'); }
    finally { setBusyId(null); }
  };
  const remove = async (document: StudentDocument) => {
    if (!canManage || !confirm(`Delete “${document.title}”? This cannot be undone.`)) return;
    setBusyId(document.id);
    try { await apiSend(`/api/students/${studentId}/documents/${document.id}`, 'DELETE'); setDocuments(current => current.filter(item => item.id !== document.id)); toast.success('Document deleted'); }
    catch (error: any) { toast.error(error.message || 'Could not delete document'); }
    finally { setBusyId(null); }
  };
  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renaming || !canManage || !title.trim()) return;
    setBusyId(renaming.id);
    try { const updated = await apiSend<StudentDocument>(`/api/students/${studentId}/documents/${renaming.id}`, 'PUT', { title: title.trim() }); setDocuments(current => current.map(item => item.id === updated.id ? updated : item)); setRenaming(null); toast.success('Document renamed'); }
    catch (error: any) { toast.error(error.message || 'Could not rename document'); }
    finally { setBusyId(null); }
  };
  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !upload.file || !upload.title.trim()) return;
    if (upload.file.size > 25 * 1024 * 1024) { toast.error('File must be 25 MB or smaller'); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append('file', upload.file); body.append('title', upload.title.trim()); body.append('documentType', upload.documentType); if (upload.expiryDate) body.append('expiryDate', upload.expiryDate);
      const response = await fetch(`/api/students/${studentId}/documents/upload`, { method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not upload document');
      setDocuments(current => [data, ...current]); setUploadOpen(false); setUpload(initialUpload); toast.success('Document uploaded');
    } catch (error: any) { toast.error(error.message || 'Could not upload document'); }
    finally { setUploading(false); }
  };
  if (!canView) return <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-5"><Shield className="size-5 shrink-0 text-muted-foreground" /><div><h3 className="font-semibold">Private school records</h3><p className="mt-1 text-sm text-muted-foreground">Supporting identity and medical documents are available only to authorized school staff. Your issued student card is shown separately.</p></div></div>;
  return <section className="min-w-0 space-y-4" aria-label="Supporting documents">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Supporting documents</h2><p className="mt-1 text-sm text-muted-foreground">Identity, school, and guardian records · {documents.length} files</p></div>{canManage && <Button variant="outline" onClick={() => setUploadOpen(true)}><Upload className="size-4" />Upload Document</Button>}</header>
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search supporting documents" className="pl-9" placeholder="Search title, file name, or type…" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {documents.some(document => studentDocumentExpiryStatus(document.expiryDate)) && <div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline" className="text-destructive">{documents.filter(document => studentDocumentExpiryStatus(document.expiryDate) === 'EXPIRED').length} expired</Badge><Badge variant="outline" className="text-amber-700 dark:text-amber-300">{documents.filter(document => studentDocumentExpiryStatus(document.expiryDate) === 'EXPIRING_SOON').length} expiring within 30 days</Badge></div>}
    {loading ? <p role="status" className="p-6 text-center text-sm text-muted-foreground">Loading documents…</p> : loadError ? <div role="alert" className="space-y-3 rounded-lg border border-border p-5"><p className="text-sm">Could not load supporting documents.</p><Button variant="outline" onClick={() => setReloadKey(value => value + 1)}><RefreshCw className="size-4" />Retry documents</Button></div> : <div className="divide-y divide-border rounded-lg border border-border">
      {filtered.length === 0 ? <div className="p-8 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><h3 className="mt-3 font-semibold">{search ? 'No matching documents' : 'No supporting documents yet'}</h3><p className="mt-1 text-sm text-muted-foreground">{search ? 'Try a different title or file name.' : canManage ? 'Upload the student’s supporting records here.' : 'Admin can upload supporting records here.'}</p></div> : filtered.map(document => <article key={document.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 flex-1 items-start gap-3"><FileText className="mt-1 size-5 shrink-0 text-academic-teal" /><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{document.title}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{document.fileName} · {fileSize(document.fileSize)}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline">{document.documentType.replaceAll('_', ' ')}</Badge><span>Uploaded {formatDateOnly(document.createdAt)}</span>{document.expiryDate && <span>Expires {formatDateOnly(document.expiryDate)}</span>}</div></div></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`Download ${document.title}`} onClick={() => void download(document)} disabled={busyId !== null}><Download className="size-4" /></Button>{canManage && <><Button variant="ghost" size="icon" aria-label={`Rename ${document.title}`} onClick={() => { setRenaming(document); setTitle(document.title); }} disabled={busyId !== null}><Edit2 className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${document.title}`} onClick={() => void remove(document)} disabled={busyId !== null}><Trash2 className="size-4 text-destructive" /></Button></>}</div></article>)}
    </div>}
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Shield className="size-4 shrink-0" />Private records. Downloads require authorization and are logged. Only admin can manage these files.</p>
    <Dialog open={Boolean(renaming)} onOpenChange={open => { if (!open && !busyId) setRenaming(null); }}><DialogContent showCloseButton={!busyId}><DialogTitle>Rename document</DialogTitle><DialogDescription>Change the title without replacing the original file.</DialogDescription><form onSubmit={rename} className="space-y-4"><div className="space-y-2"><Label htmlFor="document-rename">Document title</Label><Input id="document-rename" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></div><div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setRenaming(null)} disabled={Boolean(busyId)}>Cancel</Button><Button type="submit" disabled={Boolean(busyId) || !title.trim()}>{busyId ? 'Saving…' : 'Save title'}</Button></div></form></DialogContent></Dialog>
    <Dialog open={uploadOpen} onOpenChange={open => { if (!uploading) setUploadOpen(open); }}><DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!uploading}><DialogTitle>Upload document</DialogTitle><DialogDescription>Add a private supporting record. Maximum file size: 25 MB.</DialogDescription><form onSubmit={submitUpload} className="space-y-4"><div className="space-y-2"><Label htmlFor="document-title">Document title</Label><Input id="document-title" required maxLength={160} value={upload.title} onChange={event => setUpload({ ...upload, title: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="document-type">Document type</Label><select id="document-type" className="h-10 w-full rounded-sm border border-border bg-background px-3 text-sm" value={upload.documentType} onChange={event => setUpload({ ...upload, documentType: event.target.value as DocumentType })}>{DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></div><div className="space-y-2"><Label htmlFor="document-expiry">Expiry date (optional)</Label><Input id="document-expiry" type="date" value={upload.expiryDate} onChange={event => setUpload({ ...upload, expiryDate: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="document-file">File</Label><Input id="document-file" type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.txt" onChange={event => setUpload({ ...upload, file: event.target.files?.[0] || null })} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button><Button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button></div></form></DialogContent></Dialog>
  </section>;
}
