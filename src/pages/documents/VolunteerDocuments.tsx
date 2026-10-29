import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Award, Ban, Check, CheckCircle2, ExternalLink, FileCheck2, FileText, Link2, Loader2, Maximize2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';
import {
  currentVolunteerMonth, formatVolunteerMonth, validateVolunteerDocumentInput, volunteerContributionLimit,
  VOLUNTEER_DOCUMENT_TYPE_LABELS, VOLUNTEER_ORGANIZATION_NAME, VOLUNTEER_PROGRAM_NAME, VOLUNTEER_SCHOOL_NAME,
  type VolunteerDocumentInput, type VolunteerDocumentPayload, type VolunteerDocumentRecord,
} from '@/shared/volunteerDocuments';
import VolunteerDocumentSheet from './VolunteerDocumentSheet';

const TEMPLATES = [
  { type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', title: 'Appreciation certificate', description: 'A formal keepsake recognizing volunteer service.', format: 'A4 landscape', icon: Award },
  { type: 'VOLUNTEER_APPRECIATION_LETTER', title: 'Appreciation letter', description: 'A personal thank-you with contributions and service dates.', format: 'A4 portrait', icon: FileText },
  { type: 'PART_TIME_VOLUNTEER_CONFIRMATION', title: 'Proof of part-time volunteering', description: 'Confirm the volunteer’s role, service period and recorded hours.', format: 'A4 portrait', icon: FileCheck2 },
] as const;

type FormState = Omit<VolunteerDocumentInput, 'hoursPerWeek' | 'totalHours'> & { hoursPerWeek: string; totalHours: string };
type Branding = Partial<VolunteerDocumentPayload['school']>;
const EMPTY_FORM: FormState = {
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: '', role: '', fromMonth: '', toMonth: '', contributions: '',
  hoursPerWeek: '', totalHours: '', signatoryName: '', signatoryTitle: '', organizationSignatoryName: '', organizationSignatoryTitle: '',
};
const linkStyle = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring';
const selectStyle = 'h-10 rounded-sm border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
const printPath = (id: string) => `/documents/volunteer/${encodeURIComponent(id)}/print`;
const fmtDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });

export default function VolunteerDocuments() {
  const { isAdmin } = usePermissions();
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [branding, setBranding] = useState<Branding>({});
  const [documents, setDocuments] = useState<VolunteerDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [issueError, setIssueError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [issued, setIssued] = useState<VolunteerDocumentRecord | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState<VolunteerDocumentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const issueLock = useRef(false);
  const maxMonth = currentVolunteerMonth();
  const contributionLimit = volunteerContributionLimit(form.type);

  const loadDocuments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try { setDocuments(await apiGet<VolunteerDocumentRecord[]>('/api/volunteer-documents', { signal })); }
    catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load volunteer documents.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    void loadDocuments(controller.signal);
    apiGet<Branding>('/api/settings', { signal: controller.signal }).then(setBranding).catch(() => {});
    return () => controller.abort();
  }, [isAdmin, loadDocuments]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setReviewed(false);
    setIssueError('');
    setIssued(null);
  };

  const payload: VolunteerDocumentPayload = useMemo(() => ({
    version: 1,
    organization: { name: VOLUNTEER_ORGANIZATION_NAME },
    school: {
      name: VOLUNTEER_SCHOOL_NAME, program: VOLUNTEER_PROGRAM_NAME,
      logoUrl: branding.logoUrl || null, address: branding.address || null,
      contactEmail: branding.contactEmail || null, contactPhone: branding.contactPhone || null,
    },
    volunteer: {
      name: form.recipientName.trim(), role: form.role.trim(), fromMonth: form.fromMonth, toMonth: form.toMonth,
      contributions: form.contributions?.trim() || '',
      hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : null,
      totalHours: form.totalHours ? Number(form.totalHours) : null,
    },
    signatory: { name: form.signatoryName.trim(), title: form.signatoryTitle.trim() },
    organizationSignatory: form.organizationSignatoryName?.trim() || form.organizationSignatoryTitle?.trim()
      ? { name: form.organizationSignatoryName?.trim() || '', title: form.organizationSignatoryTitle?.trim() || '' } : null,
  }), [form, branding]);

  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return documents.filter(document => (statusFilter === 'ALL' || document.status === statusFilter)
      && (!term || `${document.recipientName} ${document.documentNumber} ${document.role} ${VOLUNTEER_DOCUMENT_TYPE_LABELS[document.type]}`.toLocaleLowerCase().includes(term)));
  }, [documents, query, statusFilter]);

  const issueDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (issueLock.current) return;
    const result = validateVolunteerDocumentInput({
      ...form, hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : null, totalHours: form.totalHours ? Number(form.totalHours) : null,
    });
    if (result.success === false) { setIssueError(result.error); return; }
    if (!reviewed) { setIssueError('Review the preview and confirm the details before issuing.'); return; }
    issueLock.current = true;
    setIssuing(true);
    setIssueError('');
    try {
      const document = await apiSend<VolunteerDocumentRecord>('/api/volunteer-documents', 'POST', result.data);
      setIssued(document);
      setLoadError('');
      setDocuments(previous => [document, ...previous]);
      setReviewed(false);
      toast.success(`${VOLUNTEER_DOCUMENT_TYPE_LABELS[document.type]} issued`);
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : 'Could not issue the document. Your details have been kept.');
    } finally { issueLock.current = false; setIssuing(false); }
  };

  const copyVerifyLink = async (document: VolunteerDocumentRecord) => {
    try {
      await navigator.clipboard.writeText(document.verifyUrl || `${window.location.origin}/verify/volunteer/${document.verifyToken}`);
      toast.success('Verification link copied');
    } catch { toast.error('Could not copy the link. Open the document to access its verification link.'); }
  };

  const cancelDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancelTarget || cancelling) return;
    if (!cancelReason.trim()) { setCancelError('Enter a reason for cancellation.'); return; }
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await apiSend<VolunteerDocumentRecord>(`/api/volunteer-documents/${cancelTarget.id}/cancel`, 'POST', { reason: cancelReason.trim() });
      setDocuments(previous => previous.map(document => document.id === updated.id ? updated : document));
      if (issued?.id === updated.id) setIssued(updated);
      setCancelTarget(null);
      toast.success('Document cancelled. Its verification link now shows it is invalid.');
    } catch (error) { setCancelError(error instanceof Error ? error.message : 'Could not cancel the document.'); }
    finally { setCancelling(false); }
  };

  if (!isAdmin) return <div className="rounded-sm border border-border bg-card p-6"><h1 className="text-lg font-semibold">Administrator access required</h1><p className="mt-2 text-sm text-muted-foreground">Only administrators can issue and manage volunteer documents.</p></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <Link to="/documents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Official Documents</Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-academic-teal">MRO · MRLC · GED Program</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Volunteer documents</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Recognize service and provide a verifiable record of volunteering with {VOLUNTEER_ORGANIZATION_NAME} and {VOLUNTEER_SCHOOL_NAME}.</p>
      </header>

      <fieldset disabled={issuing} className="min-w-0">
        <legend className="mb-3 text-sm font-semibold text-foreground">1. Choose a template</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {TEMPLATES.map(template => {
            const selected = form.type === template.type;
            const Icon = template.icon;
            return (
              <label key={template.type} className={`relative flex cursor-pointer gap-3 rounded-sm border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring ${selected ? 'border-academic-teal bg-academic-teal/10' : 'border-border bg-card hover:border-foreground/40'}`}>
                <input type="radio" name="volunteer-template" value={template.type} checked={selected} onChange={() => setField('type', template.type)} className="sr-only" />
                <Icon className={`mt-0.5 size-5 shrink-0 ${selected ? 'text-academic-teal' : 'text-muted-foreground'}`} />
                <span className="min-w-0 pr-3"><span className="block text-sm font-semibold text-foreground">{template.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{template.description}</span><span className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{template.format}</span></span>
                {selected && <Check className="absolute right-3 top-4 size-4 text-academic-teal" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={issueDocument} className="min-w-0 rounded-sm border border-border bg-card">
          <fieldset disabled={issuing} className="min-w-0 space-y-5 p-5">
            <legend className="sr-only">Volunteer document details</legend>
            <div><h2 className="text-base font-semibold">2. Add service details</h2><p className="mt-1 text-xs text-muted-foreground">Fields marked * are required. No student account is needed.</p></div>
            <Field label="Volunteer’s full name *" id="volunteer-name"><Input id="volunteer-name" autoComplete="off" value={form.recipientName} onChange={event => setField('recipientName', event.target.value)} placeholder="Name as it should appear on the document" required maxLength={160} /></Field>
            <Field label="Volunteer role *" id="volunteer-role"><Input id="volunteer-role" value={form.role} onChange={event => setField('role', event.target.value)} placeholder="e.g. Volunteer English Teacher" required maxLength={120} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From month / year *" id="volunteer-from"><Input id="volunteer-from" type="month" value={form.fromMonth} min="1900-01" max={form.toMonth || maxMonth} onChange={event => setField('fromMonth', event.target.value)} required /></Field>
              <Field label="To month / year *" id="volunteer-to"><Input id="volunteer-to" type="month" value={form.toMonth} min={form.fromMonth || '1900-01'} max={maxMonth} onChange={event => setField('toMonth', event.target.value)} required /></Field>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">For ongoing service, use the current month as the To month.</p>
            <Field label="Contributions or responsibilities" id="volunteer-contributions"><Textarea id="volunteer-contributions" value={form.contributions} onChange={event => setField('contributions', event.target.value)} placeholder="Describe the work undertaken, such as weekly GED English lessons and learning support." maxLength={contributionLimit} rows={4} aria-describedby="volunteer-contributions-help" /><p id="volunteer-contributions-help" className={`text-xs ${(form.contributions?.length || 0) > contributionLimit ? 'text-destructive' : 'text-muted-foreground'}`}>Optional. Include only work recorded by the school. {form.contributions?.length || 0}/{contributionLimit} characters.</p></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hours per week" id="volunteer-weekly-hours"><Input id="volunteer-weekly-hours" type="number" inputMode="decimal" min="0.01" max="168" step="0.01" value={form.hoursPerWeek} onChange={event => setField('hoursPerWeek', event.target.value)} placeholder="Optional" /></Field>
              <Field label="Total service hours" id="volunteer-total-hours"><Input id="volunteer-total-hours" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={form.totalHours} onChange={event => setField('totalHours', event.target.value)} placeholder="Optional" /></Field>
            </div>
            <div className="border-t border-border pt-5"><h3 className="mb-3 text-sm font-semibold">MRLC authorized signatory</h3><div className="grid gap-3 sm:grid-cols-2">
              <Field label="Signatory name *" id="volunteer-signatory"><Input id="volunteer-signatory" value={form.signatoryName} onChange={event => setField('signatoryName', event.target.value)} placeholder="Full name" required maxLength={120} /></Field>
              <Field label="Position / title *" id="volunteer-signatory-title"><Input id="volunteer-signatory-title" value={form.signatoryTitle} onChange={event => setField('signatoryTitle', event.target.value)} placeholder="e.g. Programme Coordinator" required maxLength={120} /></Field>
            </div></div>
            <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">Add an MRO signatory (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="MRO signatory name" id="volunteer-mro-signatory"><Input id="volunteer-mro-signatory" value={form.organizationSignatoryName} onChange={event => setField('organizationSignatoryName', event.target.value)} maxLength={120} /></Field>
              <Field label="MRO position / title" id="volunteer-mro-title"><Input id="volunteer-mro-title" value={form.organizationSignatoryTitle} onChange={event => setField('organizationSignatoryTitle', event.target.value)} maxLength={120} /></Field>
            </div><p className="mt-2 text-xs text-muted-foreground">Enter both name and title to include a second signature line.</p></details>
          </fieldset>
          <div className="space-y-4 border-t border-border bg-muted/30 p-5">
            <h2 className="text-base font-semibold">3. Review and issue</h2>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5"><input type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setIssueError(''); }} disabled={issuing} className="mt-0.5 size-4 shrink-0 accent-[var(--academic-teal)]" required /><span>I have reviewed the preview and confirmed the name, service dates, contributions and signatories.</span></label>
            <p className="text-xs leading-5 text-muted-foreground">The verification link makes the volunteer’s name, role, service dates and any recorded hours available to anyone with the link. Issued documents retain these details; cancel and issue a new document to correct them.</p>
            {issueError && <p role="alert" className="text-sm text-destructive">{issueError}</p>}
            <Button type="submit" disabled={issuing || !reviewed} className="w-full">{issuing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{issuing ? 'Issuing document…' : 'Issue verified document'}</Button>
          </div>
        </form>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6" aria-label="Document preview">
          {issued && <div role="status" className="rounded-sm border border-academic-teal/40 bg-academic-teal/10 p-4"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-academic-teal" /><div><p className="font-semibold">{issued.status === 'ACTIVE' ? 'Document issued' : 'Document cancelled'}</p><p className="mt-1 text-sm text-muted-foreground">{issued.documentNumber} · {issued.recipientName}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Link className={linkStyle} to={printPath(issued.id)}><ExternalLink className="size-4" />Open / print PDF</Link><Button type="button" variant="outline" onClick={() => void copyVerifyLink(issued)}><Link2 className="size-4" />Copy verification link</Button></div></div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Live preview</h2><Badge variant="outline">Draft</Badge></div><p className="mt-1 text-xs text-muted-foreground">{TEMPLATES.find(template => template.type === form.type)?.format} · Updates as you type</p></div><Button type="button" variant="outline" size="sm" onClick={() => setFullPreviewOpen(true)}><Maximize2 className="size-4" />Open full-size preview</Button></div>
          <div className="min-w-0 border border-border bg-muted/40 p-3 sm:p-5"><VolunteerDocumentSheet type={form.type} payload={payload} draft /></div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />A unique document number and working verification QR code are added when issued.</p>
        </aside>
      </div>

      <section className="rounded-sm border border-border bg-card" aria-labelledby="issued-volunteer-documents">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 id="issued-volunteer-documents" className="text-base font-semibold">Issued documents</h2><p className="mt-1 text-xs text-muted-foreground">Open a document to print it or save it as a PDF.</p></div><Button variant="outline" size="sm" disabled={loading} onClick={() => void loadDocuments()}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search issued documents" className="pl-9" placeholder="Search name, role or document number" value={query} onChange={event => setQuery(event.target.value)} /></div><select aria-label="Filter documents by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={selectStyle}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="CANCELLED">Cancelled</option></select></div>
        {loading ? <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading documents…</p>
          : loadError ? <div role="alert" className="space-y-3 p-6"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" onClick={() => void loadDocuments()}>Try again</Button></div>
          : filteredDocuments.length === 0 ? <div className="p-10 text-center"><FileCheck2 className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm font-semibold">{documents.length ? 'No matching documents' : 'No volunteer documents issued yet'}</p><p className="mt-1 text-sm text-muted-foreground">{documents.length ? 'Try another name or change the status filter.' : 'Choose a template above to recognize your first volunteer.'}</p></div>
          : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Volunteer / document</th><th className="px-4 py-3 font-medium">Service period</th><th className="px-4 py-3 font-medium">Issued</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredDocuments.map(document => <tr key={document.id}>
            <td className="min-w-52 px-5 py-4"><p className="font-semibold">{document.recipientName}</p><p className="mt-1 text-xs text-muted-foreground">{VOLUNTEER_DOCUMENT_TYPE_LABELS[document.type]}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{document.documentNumber}</p></td>
            <td className="min-w-40 px-4 py-4 text-xs leading-5"><span className="text-muted-foreground">From </span>{formatVolunteerMonth(document.fromMonth)}<br /><span className="text-muted-foreground">To </span>{formatVolunteerMonth(document.toMonth)}</td>
            <td className="whitespace-nowrap px-4 py-4 text-xs">{fmtDate(document.issueDate)}</td><td className="px-4 py-4"><Badge variant={document.status === 'ACTIVE' ? 'outline' : 'destructive'} className={document.status === 'ACTIVE' ? 'border-academic-teal/40 text-academic-teal' : ''}>{document.status === 'ACTIVE' ? 'Active' : document.status === 'CANCELLED' ? 'Cancelled' : 'Reissued'}</Badge></td>
            <td className="px-5 py-4"><div className="flex justify-end gap-2"><Link className={linkStyle} to={printPath(document.id)} aria-label={`Open document ${document.documentNumber}`}><ExternalLink className="size-4" />Open</Link><Button variant="ghost" size="icon" aria-label={`Copy verification link for ${document.documentNumber}`} title="Copy verification link" onClick={() => void copyVerifyLink(document)}><Link2 className="size-4" /></Button>{document.status === 'ACTIVE' && <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Cancel document ${document.documentNumber}`} title="Cancel document" onClick={() => { setCancelTarget(document); setCancelReason(''); setCancelError(''); }}><Ban className="size-4" /></Button>}</div></td>
          </tr>)}</tbody></table></div>}
      </section>

      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="flex max-h-[80vh] max-w-[95vw] flex-col overflow-hidden sm:max-w-[95vw]" style={{ width: form.type === 'VOLUNTEER_APPRECIATION_CERTIFICATE' ? 1189 : 860 }}>
          <DialogHeader className="shrink-0 pr-6"><DialogTitle>Full-size draft preview</DialogTitle><DialogDescription>Check every detail before issuing. Scroll across or down to see the complete document. This draft has not been issued.</DialogDescription></DialogHeader>
          <div className="min-h-0 min-w-0 overflow-auto overscroll-contain border border-border bg-muted/40 p-3 focus-visible:outline-2 focus-visible:outline-ring" role="region" aria-label="Full-size draft document" tabIndex={0}>
            <div style={{ width: form.type === 'VOLUNTEER_APPRECIATION_CERTIFICATE' ? 1123 : 794 }}><VolunteerDocumentSheet type={form.type} payload={payload} draft /></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={open => { if (!open && !cancelling) setCancelTarget(null); }}>
        <DialogContent showCloseButton={!cancelling}>
          <form onSubmit={cancelDocument} className="space-y-4">
            <DialogHeader><DialogTitle>Cancel this document?</DialogTitle><DialogDescription>{cancelTarget?.documentNumber} for {cancelTarget?.recipientName} will remain on record. Its QR code and verification page will show that it is no longer valid.</DialogDescription></DialogHeader>
            <Field label="Reason for cancellation *" id="volunteer-cancel-reason"><Textarea id="volunteer-cancel-reason" value={cancelReason} onChange={event => setCancelReason(event.target.value)} required maxLength={500} disabled={cancelling} placeholder="e.g. The service dates need correcting" /></Field>
            {cancelError && <p role="alert" className="text-sm text-destructive">{cancelError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={cancelling} onClick={() => setCancelTarget(null)}>Keep document</Button><Button type="submit" variant="destructive" disabled={cancelling || !cancelReason.trim()}>{cancelling ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}{cancelling ? 'Cancelling…' : 'Cancel document'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
