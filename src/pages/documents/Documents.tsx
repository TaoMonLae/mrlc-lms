import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Ban, CheckCircle2, Copy, Download, ExternalLink, FileBadge, MoreHorizontal, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiSend, downloadAuthenticatedFile } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';
import { officialDocumentViewPath } from '@/shared/officialDocuments';
import IssueDocumentPanel, { type ClassOption, type StudentOption } from './IssueDocumentPanel';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from './documentLabels';

type Doc = {
  id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  studentName: string; studentCode: string; className?: string | null; term: string | null;
  issueDate: string; downloadCount: number; issuedById?: string; issuedByName?: string | null;
};
type StatusTab = 'all' | 'ACTIVE' | 'CANCELLED' | 'REISSUED';
type PendingAction = { kind: 'cancel' | 'reissue' | 'delete'; doc: Doc } | null;

const PAGE_SIZE = 25;
const LIST_LIMIT = 300; // GET /api/documents returns the 300 most recent
const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REISSUED', label: 'Reissued' },
];
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function DocumentsPage() {
  const { isAdmin, user } = usePermissions();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const [status, setStatus] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<PendingAction>(null);

  const loadDocs = (initial = false) => {
    if (initial) setLoading(true);
    return apiGet<Doc[]>('/api/documents')
      .then((d) => { setDocs(d); setLoadError(false); if (initial && d.length === 0) setIssueOpen(true); })
      .catch(() => { setLoadError(true); toast.error('Could not load issued documents'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocs(true);
    apiGet<any[]>('/api/students')
      .then((ss) => setStudents(ss
        .filter((s) => !s.status || s.status === 'ACTIVE')
        .map((s) => ({
          id: s.id,
          name: `${s.user?.firstName ?? s.firstName ?? ''} ${s.user?.lastName ?? s.lastName ?? ''}`.trim() || s.studentCode,
          code: s.studentCode ?? '',
          className: s.class?.name ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
    apiGet<ClassOption[]>('/api/documents/eligible-classes').then(setClasses).catch(() => {});
  }, []);

  // Terms already used on issued documents, newest first, so staff reuse the
  // exact same wording (duplicate detection matches the term string).
  const terms = useMemo(() => [...new Set(docs.map((d) => d.term).filter((t): t is string => !!t))], [docs]);
  const usedTypes = useMemo(() => Object.keys(DOCUMENT_TYPE_LABELS).filter((t) => docs.some((d) => d.type === t)), [docs]);

  const preStatus = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) =>
      (typeFilter === 'all' || d.type === typeFilter)
      && (termFilter === 'all' || d.term === termFilter)
      && (!q || `${d.studentName} ${d.studentCode} ${d.documentNumber} ${d.term ?? ''} ${d.className ?? ''}`.toLowerCase().includes(q)));
  }, [docs, query, typeFilter, termFilter]);
  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { all: preStatus.length, ACTIVE: 0, CANCELLED: 0, REISSUED: 0 };
    preStatus.forEach((d) => { if (d.status in c) c[d.status as StatusTab] += 1; });
    return c;
  }, [preStatus]);
  const filtered = status === 'all' ? preStatus : preStatus.filter((d) => d.status === status);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasFilters = !!query.trim() || typeFilter !== 'all' || termFilter !== 'all' || status !== 'all';

  useEffect(() => { setPage(0); }, [query, typeFilter, termFilter, status]);
  useEffect(() => { if (page > pageCount - 1) setPage(pageCount - 1); }, [page, pageCount]);

  const clearFilters = () => { setQuery(''); setTypeFilter('all'); setTermFilter('all'); setStatus('all'); };
  const canModify = (d: Doc) => isAdmin || (!!user && d.issuedById === user.id);

  const copyVerifyLink = async (d: Doc) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/verify/${d.verifyToken}`);
      toast.success('Verification link copied');
    } catch { toast.error('Could not copy the link'); }
  };

  const downloadCardPdf = async (d: Doc) => {
    try {
      await downloadAuthenticatedFile(`/api/documents/${d.id}/student-card.pdf`, `${d.studentName} - Student ID Card.pdf`);
      loadDocs();
    } catch (e: any) { toast.error(e.message || 'Could not download the card PDF'); }
  };

  const rowMenu = (d: Doc) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${d.documentNumber}`}><MoreHorizontal /></Button>}
        nativeButton={true}
      />
      <DropdownMenuContent align="end" className="min-w-52">
        {d.type === 'STUDENT_ID_CARD' && (
          <DropdownMenuItem onClick={() => downloadCardPdf(d)}><Download className="mr-2 size-4" /> Download card PDF</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => copyVerifyLink(d)}><Copy className="mr-2 size-4" /> Copy verification link</DropdownMenuItem>
        <DropdownMenuItem render={<a href={`/verify/${d.verifyToken}`} target="_blank" rel="noreferrer" className="flex w-full" />} nativeButton={false}>
          <ExternalLink className="mr-2 size-4" /> Open public verification page
        </DropdownMenuItem>
        {canModify(d) && (
          <>
            <DropdownMenuSeparator />
            {isAdmin && d.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={() => setPending({ kind: 'reissue', doc: d })}><RefreshCw className="mr-2 size-4" /> Reissue with current data</DropdownMenuItem>
            )}
            {d.status === 'ACTIVE' && (
              <DropdownMenuItem variant="destructive" onClick={() => setPending({ kind: 'cancel', doc: d })}><Ban className="mr-2 size-4" /> Cancel document</DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => setPending({ kind: 'delete', doc: d })}><Trash2 className="mr-2 size-4" /> Delete permanently</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <FileBadge className="size-6 text-primary" aria-hidden /> Official documents
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">
            Report cards, transcripts, certificates and student ID cards. Each one carries a QR code anyone can scan to confirm it is genuine.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(isAdmin || user?.role === 'TEACHER') && (
            <Button variant="outline" render={<Link to="/documents/volunteers" />} nativeButton={false}>
              Volunteer letters
            </Button>
          )}
          <Button onClick={() => setIssueOpen((o) => !o)} aria-expanded={issueOpen} aria-controls="issue-panel">
            <Plus /> Issue document
          </Button>
        </div>
      </header>

      {issueOpen && (
        <div id="issue-panel">
          <IssueDocumentPanel
            students={students}
            classes={classes}
            termSuggestions={terms}
            isAdmin={isAdmin}
            onIssued={() => { loadDocs(); setStatus('all'); }}
            onClose={() => setIssueOpen(false)}
          />
        </div>
      )}

      <section aria-labelledby="register-heading" className="rounded-sm border border-border bg-card">
        <div className="space-y-3 border-b border-border px-4 pt-4 pb-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="register-heading" className="text-base font-semibold text-foreground">Issued documents</h2>
            <div role="tablist" aria-label="Filter by status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={status === t.value}
                  onClick={() => setStatus(t.value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${status === t.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {t.label}
                  <span className="tabular-nums text-xs opacity-80">{counts[t.value]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search documents</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student, student ID, class or document number"
                className="h-9 w-full rounded-sm border border-input bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
              />
            </label>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
                <SelectTrigger className="h-9 w-full md:w-[190px]" aria-label="Document type">
                  <SelectValue>{typeFilter === 'all' ? 'All documents' : DOCUMENT_TYPE_LABELS[typeFilter]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All documents</SelectItem>
                  {usedTypes.map((t) => <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={termFilter} onValueChange={(v) => setTermFilter(v ?? 'all')}>
                <SelectTrigger className="h-9 w-full md:w-[170px]" aria-label="Term">
                  <SelectValue>{termFilter === 'all' ? 'All terms' : termFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All terms</SelectItem>
                  {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="hidden w-full text-left text-sm sm:table">
            <caption className="sr-only">Issued official documents</caption>
            <thead className="border-b border-border text-xs font-semibold text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 sm:px-5">Student</th>
                <th scope="col" className="px-3 py-2.5">Document</th>
                <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">Document no.</th>
                <th scope="col" className="hidden px-3 py-2.5 md:table-cell">Issued</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right xl:table-cell">Downloads</th>
                <th scope="col" className="px-4 py-2.5 sm:px-5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} aria-hidden>
                  <td className="px-4 py-3 sm:px-5" colSpan={7}><div className="h-9 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" /></td>
                </tr>
              ))}
              {!loading && visible.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="font-medium text-foreground">{d.studentName}</div>
                    <div className="text-xs text-muted-foreground">{d.studentCode}{d.className ? ` · ${d.className}` : ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-foreground">{DOCUMENT_TYPE_LABELS[d.type] || d.type}</div>
                    <div className="text-xs text-muted-foreground">{d.term || 'No term'}</div>
                  </td>
                  <td className="hidden px-3 py-2.5 font-mono text-xs text-muted-foreground lg:table-cell">{d.documentNumber}</td>
                  <td className="hidden px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums md:table-cell">{fmtDate(d.issueDate)}</td>
                  <td className="px-3 py-2.5"><StatusPill status={d.status} /></td>
                  <td className="hidden px-3 py-2.5 text-right text-muted-foreground tabular-nums xl:table-cell">{d.downloadCount}</td>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" render={<Link to={officialDocumentViewPath(d)} />} nativeButton={false}>
                        {d.type === 'STUDENT_ID_CARD' ? 'View card' : 'Open'}
                      </Button>
                      {rowMenu(d)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phones: one stacked row per document instead of a squeezed table. */}
          <ul className="divide-y divide-border sm:hidden" aria-label="Issued documents">
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <li key={i} aria-hidden className="px-4 py-3"><div className="h-12 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" /></li>
            ))}
            {!loading && visible.map((d) => (
              <li key={d.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-foreground">{d.studentName}</p>
                    <StatusPill status={d.status} />
                  </div>
                  <p className="text-sm text-foreground">{DOCUMENT_TYPE_LABELS[d.type] || d.type}{d.term ? <span className="text-muted-foreground"> · {d.term}</span> : null}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{d.studentCode} · {fmtDate(d.issueDate)}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="sm" render={<Link to={officialDocumentViewPath(d)} />} nativeButton={false}>Open</Button>
                  {rowMenu(d)}
                </div>
              </li>
            ))}
          </ul>

          {!loading && filtered.length === 0 && (
            <div className="px-5 py-14 text-center">
              {loadError ? (
                <>
                  <p className="font-medium text-foreground">Issued documents could not be loaded.</p>
                  <Button variant="outline" className="mt-4" onClick={() => loadDocs(true)}>Try again</Button>
                </>
              ) : docs.length === 0 ? (
                <>
                  <p className="font-medium text-foreground">No documents issued yet</p>
                  <p className="mx-auto mt-1 max-w-[52ch] text-sm text-muted-foreground">Issue a report card or ID card for one student, or for a whole class at once. Everything you issue is listed here.</p>
                  {!issueOpen && <Button className="mt-4" onClick={() => setIssueOpen(true)}><Plus /> Issue document</Button>}
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">No documents match these filters</p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}><X /> Clear filters</Button>
                </>
              )}
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="tabular-nums">
              {filtered.length <= PAGE_SIZE
                ? `${filtered.length} document${filtered.length === 1 ? '' : 's'}`
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              {hasFilters && <> · <button type="button" onClick={clearFilters} className="font-medium text-primary underline-offset-4 hover:underline">Clear filters</button></>}
              {docs.length >= LIST_LIMIT && <> · showing the {LIST_LIMIT} most recent</>}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="tabular-nums">Page {page + 1} of {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <DocumentActionDialog
        pending={pending}
        onClose={() => setPending(null)}
        onDone={(kind, doc) => {
          if (kind === 'delete') setDocs((prev) => prev.filter((x) => x.id !== doc.id));
          loadDocs();
        }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    : status === 'CANCELLED'
      ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
      : 'bg-muted text-muted-foreground border-border';
  const Icon = status === 'ACTIVE' ? CheckCircle2 : status === 'CANCELLED' ? Ban : RefreshCw;
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>
      <Icon className="size-3" aria-hidden /> {DOCUMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

/** Confirmation for reissue, cancel and delete, explaining what each one does. */
function DocumentActionDialog({ pending, onClose, onDone }: {
  pending: PendingAction;
  onClose: () => void;
  onDone: (kind: 'cancel' | 'reissue' | 'delete', doc: Doc) => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); }, [pending]);
  if (!pending) return null;
  const { kind, doc } = pending;
  const label = `${DOCUMENT_TYPE_LABELS[doc.type] || 'document'} for ${doc.studentName}`;

  const copy = {
    reissue: {
      title: 'Reissue with current data?',
      body: <>A new {label} is created from today’s grades and attendance. <span className="font-mono text-xs">{doc.documentNumber}</span> is marked Reissued and its QR code will show it was replaced.</>,
      confirm: 'Reissue',
    },
    cancel: {
      title: 'Cancel this document?',
      body: <>The {label} stays on record, but its QR code will report it as cancelled. Use this when a printed copy should no longer be trusted.</>,
      confirm: 'Cancel document',
    },
    delete: {
      title: 'Delete permanently?',
      body: <>The {label} (<span className="font-mono text-xs">{doc.documentNumber}</span>) is removed and its QR code stops verifying. This cannot be undone. To keep a record, cancel it instead.</>,
      confirm: 'Delete permanently',
    },
  }[kind];

  const run = async () => {
    setBusy(true);
    try {
      if (kind === 'reissue') {
        const fresh = await apiSend<Doc>(`/api/documents/${doc.id}/reissue`, 'POST');
        toast.success(`Reissued as ${fresh.documentNumber}`);
      } else if (kind === 'cancel') {
        await apiSend(`/api/documents/${doc.id}/cancel`, 'POST', { reason: reason.trim() || undefined });
        toast.success('Document cancelled');
      } else {
        await apiSend(`/api/documents/${doc.id}`, 'DELETE');
        toast.success('Document deleted');
      }
      onDone(kind, doc);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {kind === 'cancel' && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Reason <span className="font-normal text-muted-foreground">(optional, kept in the audit log)</span></span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
            />
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Keep it</Button>
          <Button variant={kind === 'reissue' ? 'default' : 'destructive'} onClick={run} disabled={busy}>{copy.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
