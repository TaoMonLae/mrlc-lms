import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Award, Ban, Check, CheckCircle2, ExternalLink, FileCheck2, FileText, Link2, Loader2, Maximize2, PenLine, RefreshCw, Search, ShieldCheck, Stamp } from 'lucide-react';
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
  currentVolunteerMonth, formatVolunteerMonth, isVolunteerStaffRole, validateVolunteerDocumentInput, volunteerContributionLimit,
  VOLUNTEER_DOCUMENT_TYPE_LABELS, VOLUNTEER_ORGANIZATION_NAME, VOLUNTEER_PROGRAM_NAME, VOLUNTEER_SCHOOL_NAME,
  type VolunteerDocumentInput, type VolunteerDocumentPayload, type VolunteerDocumentRecord, type VolunteerSigningOptions, type VolunteerSignatureSlot,
} from '@/shared/volunteerDocuments';
import { formatVolunteerIssueDate, formatVolunteerSignedAt } from '@/shared/volunteerDocumentDates';
import VolunteerDocumentSheet from './VolunteerDocumentSheet';
import SignatureCapture from './SignatureCapture';
import VolunteerMonthField from './VolunteerMonthField';

const TEMPLATES = [
  { type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', title: 'Appreciation certificate', description: 'A formal keepsake recognizing volunteer service.', format: 'A4 landscape', icon: Award },
  { type: 'VOLUNTEER_APPRECIATION_LETTER', title: 'Appreciation letter', description: 'A personal thank-you with contributions and service dates.', format: 'A4 portrait', icon: FileText },
  { type: 'PART_TIME_VOLUNTEER_CONFIRMATION', title: 'Proof of part-time volunteering', description: 'Confirm the volunteer’s role, service period and recorded hours.', format: 'A4 portrait', icon: FileCheck2 },
] as const;

type FormState = Omit<VolunteerDocumentInput, 'hoursPerWeek' | 'totalHours'> & { hoursPerWeek: string; totalHours: string };
type Branding = Partial<VolunteerDocumentPayload['school']>;
const EMPTY_FORM: FormState = {
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: '', role: '', fromMonth: '', toMonth: '', contributions: '',
  hoursPerWeek: '', totalHours: '', signatoryName: '', signatoryTitle: '', signatoryUserId: '', organizationSignatoryName: '', organizationSignatoryTitle: '', organizationSignatoryUserId: '',
};
const linkStyle = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring';
const selectStyle = 'h-10 rounded-sm border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
const printPath = (id: string) => `/documents/volunteer/${encodeURIComponent(id)}/print`;

function pendingSlots(document: VolunteerDocumentRecord, userId?: string): VolunteerSignatureSlot[] {
  if (!userId || document.status !== 'ACTIVE' || document.payload.version !== 2) return [];
  const slots: VolunteerSignatureSlot[] = [];
  if (document.signatoryUserId === userId && !document.signatures?.some(signature => signature.slot === 'SCHOOL')) slots.push('SCHOOL');
  if (document.organizationSignatoryUserId === userId && !document.signatures?.some(signature => signature.slot === 'ORGANIZATION')) slots.push('ORGANIZATION');
  return slots;
}

function statusLabel(document: VolunteerDocumentRecord): string {
  if (document.status !== 'ACTIVE') return document.status === 'CANCELLED' ? 'Cancelled' : 'Reissued';
  if (document.signingStatus === 'SIGNED') return 'Digitally signed';
  if (document.payload.version === 2) return 'Awaiting signatures';
  return 'Active · manual signature';
}

export default function VolunteerDocuments() {
  const { isAdmin, user } = usePermissions();
  const canAccess = Boolean(user && !user.isExternalLearner && isVolunteerStaffRole(user.role));
  const identityKey = `${user?.id || ''}:${user?.role || ''}:${Boolean(user?.isExternalLearner)}`;
  const activeIdentity = useRef(identityKey);
  activeIdentity.current = identityKey;
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
  const [options, setOptions] = useState<VolunteerSigningOptions>({ signatories: [], schoolChopDataUrl: null });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [chopSaving, setChopSaving] = useState(false);
  const [chopError, setChopError] = useState('');
  const [signTarget, setSignTarget] = useState<{ document: VolunteerDocumentRecord; slot: VolunteerSignatureSlot } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signConsent, setSignConsent] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [signReady, setSignReady] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');
  const signLoad = useRef<AbortController | null>(null);
  const signLock = useRef(false);
  const issueLock = useRef(false);
  const maxMonth = currentVolunteerMonth();
  const contributionLimit = volunteerContributionLimit(form.type);

  const loadDocuments = useCallback(async (signal?: AbortSignal) => {
    const identity = activeIdentity.current;
    setLoading(true);
    setLoadError('');
    try { const records = await apiGet<VolunteerDocumentRecord[]>('/api/volunteer-documents', { signal }); if (!signal?.aborted && activeIdentity.current === identity) setDocuments(records); }
    catch (error) {
      if (!signal?.aborted && activeIdentity.current === identity) setLoadError(error instanceof Error ? error.message : 'Could not load volunteer documents.');
    } finally { if (!signal?.aborted && activeIdentity.current === identity) setLoading(false); }
  }, []);

  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    const identity = activeIdentity.current;
    setOptionsLoading(true); setOptionsError('');
    try {
      const data = await apiGet<VolunteerSigningOptions>('/api/volunteer-documents/options', { signal });
      if (!signal?.aborted && activeIdentity.current === identity) setOptions(data);
    } catch (error) {
      if (!signal?.aborted && activeIdentity.current === identity) setOptionsError(error instanceof Error ? error.message : 'Unable to load authorized staff and school chop.');
    } finally { if (!signal?.aborted && activeIdentity.current === identity) setOptionsLoading(false); }
  }, []);

  useEffect(() => {
    signLoad.current?.abort();
    signLock.current = false; issueLock.current = false;
    setSignTarget(null); setSignature(null); setSignConsent(false); setSignReady(false); setSignLoading(false); setCaptureBusy(false); setSigning(false);
    setCancelTarget(null); setCancelling(false); setIssued(null); setIssuing(false); setReviewed(false); setFullPreviewOpen(false);
    setForm({ ...EMPTY_FORM }); setOptions({ signatories: [], schoolChopDataUrl: null }); setBranding({}); setChopSaving(false); setChopError('');
    setDocuments([]); setSignError(''); setIssueError(''); setCancelError(''); setCancelReason(''); setOptionsError(''); setLoadError(''); setQuery(''); setStatusFilter('ALL');
  }, [identityKey]);

  useEffect(() => {
    if (!canAccess) return;
    const controller = new AbortController();
    setDocuments([]);
    void loadDocuments(controller.signal);
    if (isAdmin) {
      void loadOptions(controller.signal);
      apiGet<Branding>('/api/settings', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setBranding(data); }).catch(() => {});
    }
    return () => controller.abort();
  }, [canAccess, isAdmin, user?.id, loadDocuments, loadOptions]);

  useEffect(() => () => signLoad.current?.abort(), []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setReviewed(false);
    setIssueError('');
    setIssued(null);
  };

  const payload: VolunteerDocumentPayload = useMemo(() => ({
    version: 2,
    organization: { name: VOLUNTEER_ORGANIZATION_NAME },
    school: {
      name: VOLUNTEER_SCHOOL_NAME, program: VOLUNTEER_PROGRAM_NAME,
      logoUrl: branding.logoUrl || null, address: branding.address || null,
      contactEmail: branding.contactEmail || null, contactPhone: branding.contactPhone || null,
      chopDataUrl: options.schoolChopDataUrl,
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
  }), [form, branding, options.schoolChopDataUrl]);

  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return documents.filter(document => (statusFilter === 'ALL' || document.status === statusFilter
      || (document.status === 'ACTIVE' && document.signingStatus === statusFilter))
      && (!term || `${document.recipientName} ${document.documentNumber} ${document.role} ${VOLUNTEER_DOCUMENT_TYPE_LABELS[document.type]}`.toLocaleLowerCase().includes(term)));
  }, [documents, query, statusFilter]);

  const issueDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (issueLock.current || chopSaving || optionsLoading) return;
    if (optionsError) { setIssueError('Reload the signing options before creating a document.'); return; }
    const identity = identityKey;
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
      if (activeIdentity.current !== identity) return;
      setIssued(document);
      setLoadError('');
      setDocuments(previous => [document, ...previous]);
      setReviewed(false);
      toast.success('Document created. The assigned staff can now review and sign it.');
    } catch (error) {
      if (activeIdentity.current === identity) setIssueError(error instanceof Error ? error.message : 'Could not issue the document. Your details have been kept.');
    } finally { if (activeIdentity.current === identity) { issueLock.current = false; setIssuing(false); } }
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
    const identity = identityKey;
    if (!cancelReason.trim()) { setCancelError('Enter a reason for cancellation.'); return; }
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await apiSend<VolunteerDocumentRecord>(`/api/volunteer-documents/${cancelTarget.id}/cancel`, 'POST', { reason: cancelReason.trim() });
      if (activeIdentity.current !== identity) return;
      setDocuments(previous => previous.map(document => document.id === updated.id ? updated : document));
      if (issued?.id === updated.id) setIssued(updated);
      setCancelTarget(null);
      toast.success('Document cancelled. Its verification link now shows it is invalid.');
    } catch (error) { if (activeIdentity.current === identity) setCancelError(error instanceof Error ? error.message : 'Could not cancel the document.'); }
    finally { if (activeIdentity.current === identity) setCancelling(false); }
  };

  const chooseSignatory = (slot: VolunteerSignatureSlot, id: string) => {
    const name = options.signatories.find(person => person.id === id)?.name || '';
    setForm(previous => slot === 'SCHOOL'
      ? { ...previous, signatoryUserId: id, signatoryName: name }
      : { ...previous, organizationSignatoryUserId: id, organizationSignatoryName: name, organizationSignatoryTitle: id ? previous.organizationSignatoryTitle : '' });
    setReviewed(false); setIssueError(''); setIssued(null);
  };

  const saveChop = async (file: File | null) => {
    if (chopSaving || issuing) return;
    const identity = identityKey;
    setChopError('');
    if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setChopError('Choose a PNG, JPG or WebP image no larger than 2 MB.'); return;
    }
    setChopSaving(true);
    try {
      const imageDataUrl = file ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the school chop image.'));
        reader.readAsDataURL(file);
      }) : null;
      if (activeIdentity.current !== identity) return;
      const saved = await apiSend<{ schoolChopDataUrl: string | null }>('/api/volunteer-documents/chop', 'POST', { imageDataUrl });
      if (activeIdentity.current !== identity) return;
      setOptions(previous => ({ ...previous, schoolChopDataUrl: saved.schoolChopDataUrl }));
      setReviewed(false);
      toast.success(file ? 'School chop saved for new documents.' : 'School chop removed from future documents.');
    } catch (error) { if (activeIdentity.current === identity) setChopError(error instanceof Error ? error.message : 'Could not save the school chop.'); }
    finally { if (activeIdentity.current === identity) setChopSaving(false); }
  };

  const closeSigning = () => {
    if (signLock.current) return;
    signLoad.current?.abort(); setSignTarget(null); setSignature(null); setSignConsent(false);
  };

  const openSigning = async (document: VolunteerDocumentRecord, slot: VolunteerSignatureSlot) => {
    const identity = identityKey;
    signLoad.current?.abort();
    const controller = new AbortController(); signLoad.current = controller;
    setSignTarget({ document, slot }); setSignature(null); setSignConsent(false); setSignError(''); setSignLoading(true); setSignReady(false); setCaptureBusy(false);
    try {
      const fresh = await apiGet<VolunteerDocumentRecord>(`/api/volunteer-documents/${encodeURIComponent(document.id)}`, { signal: controller.signal });
      if (controller.signal.aborted || activeIdentity.current !== identity) return;
      setSignTarget({ document: fresh, slot });
      if (!pendingSlots(fresh, user?.id).includes(slot) || !fresh.contentHash) setSignError('This document is no longer available for you to sign. Close this view and refresh the list.');
      else setSignReady(true);
    } catch (error) {
      if (!controller.signal.aborted && activeIdentity.current === identity) setSignError(error instanceof Error ? error.message : 'Unable to load the document for review.');
    } finally { if (!controller.signal.aborted && activeIdentity.current === identity) setSignLoading(false); }
  };

  const signDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signLock.current || signLoading || !signReady || captureBusy || !signTarget || !signature || !signConsent || !signTarget.document.contentHash) return;
    const identity = identityKey;
    signLock.current = true; setSigning(true); setSignError('');
    try {
      const updated = await apiSend<VolunteerDocumentRecord>(`/api/volunteer-documents/${encodeURIComponent(signTarget.document.id)}/sign`, 'POST', {
        slot: signTarget.slot, imageDataUrl: signature, consent: true, contentHash: signTarget.document.contentHash,
      });
      if (activeIdentity.current !== identity) return;
      setDocuments(previous => previous.map(document => document.id === updated.id ? updated : document));
      if (issued?.id === updated.id) setIssued(updated);
      setSignTarget(null); setSignature(null); setSignConsent(false);
      toast.success(updated.signingStatus === 'SIGNED' ? 'Document signed and ready to verify.' : 'Signature recorded. The other assigned signatory still needs to sign.');
    } catch (error) { if (activeIdentity.current === identity) setSignError(error instanceof Error ? error.message : 'Could not record your signature. Please refresh and try again.'); }
    finally { if (activeIdentity.current === identity) { signLock.current = false; setSigning(false); } }
  };

  if (!canAccess) return <div className="rounded-sm border border-border bg-card p-6"><h1 className="text-lg font-semibold">Staff access required</h1><p className="mt-2 text-sm text-muted-foreground">Authorized staff can review and sign documents assigned to their account.</p></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <Link to={isAdmin || user?.role === 'TEACHER' ? '/documents' : '/dashboard'} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{isAdmin || user?.role === 'TEACHER' ? 'Official Documents' : 'Dashboard'}</Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-academic-teal">MRO · MRLC · GED Program</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Volunteer documents</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{isAdmin ? `Recognize service and provide a verifiable record of volunteering with ${VOLUNTEER_ORGANIZATION_NAME} and ${VOLUNTEER_SCHOOL_NAME}.` : 'Review and digitally sign the volunteer documents assigned to your account.'}</p>
      </header>

      {isAdmin && <>
      {optionsError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-sm border border-destructive/30 p-4"><p className="text-sm text-destructive">{optionsError}</p><Button variant="outline" size="sm" disabled={optionsLoading} onClick={() => void loadOptions()}>Reload signing options</Button></div>}
      <fieldset disabled={issuing || chopSaving} className="min-w-0">
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
          <fieldset disabled={issuing || chopSaving} className="min-w-0 space-y-5 p-5">
            <legend className="sr-only">Volunteer document details</legend>
            <div><h2 className="text-base font-semibold">2. Add service details</h2><p className="mt-1 text-xs text-muted-foreground">Fields marked * are required. No student account is needed.</p></div>
            <Field label="Volunteer’s full name *" id="volunteer-name"><Input id="volunteer-name" autoComplete="off" value={form.recipientName} onChange={event => setField('recipientName', event.target.value)} placeholder="Name as it should appear on the document" required maxLength={160} /></Field>
            <Field label="Volunteer role *" id="volunteer-role"><Input id="volunteer-role" value={form.role} onChange={event => setField('role', event.target.value)} placeholder="e.g. Volunteer English Teacher" required maxLength={120} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <VolunteerMonthField id="volunteer-from" label="From" value={form.fromMonth} max={maxMonth} onChange={value => setField('fromMonth', value)} />
              <VolunteerMonthField id="volunteer-to" label="To" value={form.toMonth} max={maxMonth} onChange={value => setField('toMonth', value)} />
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">Dates appear as January 2026. For ongoing service, use the current month as the To month. Issue and signature dates use Malaysia time.</p>
            <Field label="Contributions or responsibilities" id="volunteer-contributions"><Textarea id="volunteer-contributions" value={form.contributions} onChange={event => setField('contributions', event.target.value)} placeholder="Describe the work undertaken, such as weekly GED English lessons and learning support." maxLength={contributionLimit} rows={4} aria-describedby="volunteer-contributions-help" /><p id="volunteer-contributions-help" className={`text-xs ${(form.contributions?.length || 0) > contributionLimit ? 'text-destructive' : 'text-muted-foreground'}`}>Optional. Include only work recorded by the school. {form.contributions?.length || 0}/{contributionLimit} characters.</p></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hours per week" id="volunteer-weekly-hours"><Input id="volunteer-weekly-hours" type="number" inputMode="decimal" min="0.01" max="168" step="0.01" value={form.hoursPerWeek} onChange={event => setField('hoursPerWeek', event.target.value)} placeholder="Optional" /></Field>
              <Field label="Total service hours" id="volunteer-total-hours"><Input id="volunteer-total-hours" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={form.totalHours} onChange={event => setField('totalHours', event.target.value)} placeholder="Optional" /></Field>
            </div>
            <div className="border-t border-border pt-5"><h3 className="mb-3 text-sm font-semibold">MRLC authorized signatory</h3><div className="grid gap-3 sm:grid-cols-2">
              <Field label="Authorized staff account *" id="volunteer-signatory"><select id="volunteer-signatory" className={`${selectStyle} w-full`} value={form.signatoryUserId || ''} onChange={event => chooseSignatory('SCHOOL', event.target.value)} required disabled={optionsLoading}><option value="">{optionsLoading ? 'Loading staff…' : 'Choose a signatory'}</option>{options.signatories.map(person => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></Field>
              <Field label="Position / title *" id="volunteer-signatory-title"><Input id="volunteer-signatory-title" value={form.signatoryTitle} onChange={event => setField('signatoryTitle', event.target.value)} placeholder="e.g. Programme Coordinator" required maxLength={120} /></Field>
            </div><p className="mt-2 text-xs text-muted-foreground">Only this staff account can add the MRLC signature. Their account name is printed on the document.</p></div>
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Stamp className="size-4" />School chop</h3>
              {options.schoolChopDataUrl && <div className="flex flex-wrap items-center gap-4"><img src={options.schoolChopDataUrl} alt="Saved school chop" className="h-24 max-w-48 border border-border bg-white p-2 object-contain" /><Button type="button" variant="outline" size="sm" disabled={chopSaving || issuing} onClick={() => void saveChop(null)}>Remove saved chop</Button></div>}
              <Label htmlFor="volunteer-school-chop">{options.schoolChopDataUrl ? 'Replace school chop image' : 'Upload the official school chop'}</Label>
              <input id="volunteer-school-chop" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-input file:bg-card file:px-3 file:py-2" disabled={chopSaving || issuing || optionsLoading} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void saveChop(file); }} />
              <p className="text-xs leading-5 text-muted-foreground">PNG, JPG or WebP, up to 2 MB. Use the organization’s actual chop; a transparent background prints best. It appears with the MRLC signature and is saved for future documents. Existing records keep their original chop.</p>
              {chopSaving && <p className="text-xs" role="status">Saving school chop…</p>}
              {chopError && <p className="text-sm text-destructive" role="alert">{chopError}</p>}
            </div>
            <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">Add an MRO signatory (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="MRO authorized staff account" id="volunteer-mro-signatory"><select id="volunteer-mro-signatory" className={`${selectStyle} w-full`} value={form.organizationSignatoryUserId || ''} onChange={event => chooseSignatory('ORGANIZATION', event.target.value)} disabled={optionsLoading}><option value="">No second signatory</option>{options.signatories.map(person => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></Field>
              <Field label="MRO position / title" id="volunteer-mro-title"><Input id="volunteer-mro-title" value={form.organizationSignatoryTitle} onChange={event => setField('organizationSignatoryTitle', event.target.value)} maxLength={120} /></Field>
            </div><p className="mt-2 text-xs text-muted-foreground">Choose an account and enter their title to request a second signature.</p></details>
          </fieldset>
          <div className="space-y-4 border-t border-border bg-muted/30 p-5">
            <h2 className="text-base font-semibold">3. Review and request signatures</h2>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5"><input type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setIssueError(''); }} disabled={issuing || chopSaving || optionsLoading} className="mt-0.5 size-4 shrink-0 accent-[var(--academic-teal)]" required /><span>I have reviewed the preview and confirmed the name, service dates, contributions and signatories.</span></label>
            <p className="text-xs leading-5 text-muted-foreground">The document becomes valid after every assigned signatory signs. Its verification link shows the volunteer’s name, role, service dates, recorded hours, signatories and signing dates. Cancel and create a new document to correct these details.</p>
            {issueError && <p role="alert" className="text-sm text-destructive">{issueError}</p>}
            <Button type="submit" disabled={issuing || chopSaving || optionsLoading || Boolean(optionsError) || !reviewed} className="w-full">{issuing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{issuing ? 'Creating document…' : 'Create for signing'}</Button>
          </div>
        </form>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6" aria-label="Document preview">
          {issued && <div role="status" className="rounded-sm border border-academic-teal/40 bg-academic-teal/10 p-4"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-academic-teal" /><div><p className="font-semibold">{statusLabel(issued)}</p><p className="mt-1 text-sm text-muted-foreground">{issued.documentNumber} · {issued.recipientName}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Link className={linkStyle} to={printPath(issued.id)}><ExternalLink className="size-4" />Open / print PDF</Link><Button type="button" variant="outline" onClick={() => void copyVerifyLink(issued)}><Link2 className="size-4" />Copy verification link</Button></div></div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Live preview</h2><Badge variant="outline">Draft</Badge></div><p className="mt-1 text-xs text-muted-foreground">{TEMPLATES.find(template => template.type === form.type)?.format} · Updates as you type</p></div><Button type="button" variant="outline" size="sm" onClick={() => setFullPreviewOpen(true)}><Maximize2 className="size-4" />Open full-size preview</Button></div>
          <div className="min-w-0 border border-border bg-muted/40 p-3 sm:p-5"><VolunteerDocumentSheet type={form.type} payload={payload} draft /></div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />A document number and verification QR code are created immediately. Verification becomes valid after the required signatures are complete.</p>
        </aside>
      </div>
      </>}

      <section className="rounded-sm border border-border bg-card" aria-labelledby="issued-volunteer-documents">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 id="issued-volunteer-documents" className="text-base font-semibold">{isAdmin ? 'Volunteer document records' : 'Documents assigned to you'}</h2><p className="mt-1 text-xs text-muted-foreground">Review and sign your assigned documents, or open a record to print it.</p></div><Button variant="outline" size="sm" disabled={loading} onClick={() => void loadDocuments()}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search issued documents" className="pl-9" placeholder="Search name, role or document number" value={query} onChange={event => setQuery(event.target.value)} /></div><select aria-label="Filter documents by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={selectStyle}><option value="ALL">All statuses</option><option value="PENDING">Awaiting signatures</option><option value="SIGNED">Digitally signed</option><option value="ACTIVE">All active records</option><option value="CANCELLED">Cancelled</option></select></div>
        {loading ? <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading documents…</p>
          : loadError ? <div role="alert" className="space-y-3 p-6"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" onClick={() => void loadDocuments()}>Try again</Button></div>
          : filteredDocuments.length === 0 ? <div className="p-10 text-center"><FileCheck2 className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm font-semibold">{documents.length ? 'No matching documents' : isAdmin ? 'No volunteer documents created yet' : 'No documents assigned to you'}</p><p className="mt-1 text-sm text-muted-foreground">{documents.length ? 'Try another name or change the status filter.' : isAdmin ? 'Choose a template above to recognize your first volunteer.' : 'An administrator can select your account as an authorized signatory.'}</p></div>
          : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Volunteer / document</th><th className="px-4 py-3 font-medium">Service period</th><th className="px-4 py-3 font-medium">Issued</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredDocuments.map(document => <tr key={document.id}>
            <td className="min-w-52 px-5 py-4"><p className="font-semibold">{document.recipientName}</p><p className="mt-1 text-xs text-muted-foreground">{VOLUNTEER_DOCUMENT_TYPE_LABELS[document.type]}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{document.documentNumber}</p></td>
            <td className="min-w-40 px-4 py-4 text-xs leading-5"><span className="text-muted-foreground">From </span>{formatVolunteerMonth(document.fromMonth)}<br /><span className="text-muted-foreground">To </span>{formatVolunteerMonth(document.toMonth)}</td>
            <td className="whitespace-nowrap px-4 py-4 text-xs">{formatVolunteerIssueDate(document.issueDate)}</td><td className="px-4 py-4"><Badge variant={document.status === 'ACTIVE' ? 'outline' : 'destructive'} className={document.status === 'ACTIVE' ? 'border-academic-teal/40 text-academic-teal' : ''}>{statusLabel(document)}</Badge></td>
            <td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-2">{pendingSlots(document, user?.id).map(slot => <Button key={slot} variant="outline" size="sm" onClick={() => void openSigning(document, slot)} aria-label={`Sign ${slot === 'SCHOOL' ? 'MRLC' : 'MRO'} document ${document.documentNumber}`}><PenLine className="size-4" />Sign {slot === 'SCHOOL' ? 'MRLC' : 'MRO'}</Button>)}<Link className={linkStyle} to={printPath(document.id)} aria-label={`Open document ${document.documentNumber}`}><ExternalLink className="size-4" />Open</Link><Button variant="ghost" size="icon" aria-label={`Copy verification link for ${document.documentNumber}`} title="Copy verification link" onClick={() => void copyVerifyLink(document)}><Link2 className="size-4" /></Button>{isAdmin && document.status === 'ACTIVE' && <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Cancel document ${document.documentNumber}`} title="Cancel document" onClick={() => { setCancelTarget(document); setCancelReason(''); setCancelError(''); }}><Ban className="size-4" /></Button>}</div></td>
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

      <Dialog open={Boolean(signTarget)} onOpenChange={open => { if (!open) closeSigning(); }}>
        <DialogContent showCloseButton={!signing} className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <form onSubmit={signDocument} className="min-w-0 space-y-5">
            <DialogHeader><DialogTitle>Review and sign {signTarget?.slot === 'SCHOOL' ? 'for MRLC' : 'for MRO'}</DialogTitle><DialogDescription>Read the complete document before adding your own signature. Your staff account and the Malaysia signing time will be recorded.</DialogDescription></DialogHeader>
            {signLoading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Loading the current document…</p> : signTarget && <>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><div><p className="font-semibold">{signTarget.document.recipientName}</p><p className="text-muted-foreground">{signTarget.document.documentNumber}</p></div><Link to={printPath(signTarget.document.id)} target="_blank" rel="noopener noreferrer" className={linkStyle}>Open full-size document <ExternalLink className="size-4" /></Link></div>
              <div className="min-w-0 overflow-x-auto border border-border bg-muted/40 p-2" role="region" aria-label="Document to sign" tabIndex={0}>
                <div className="min-w-[640px]"><VolunteerDocumentSheet type={signTarget.document.type} payload={signTarget.document.payload} documentNumber={signTarget.document.documentNumber} issueDate={signTarget.document.issueDate} status={signTarget.document.status} signatures={signTarget.document.signatures} signingStatus={signTarget.document.signingStatus} /></div>
              </div>
              {signTarget.document.payload.school.chopDataUrl && <div className="flex items-center gap-4 rounded-sm border border-border p-3"><img src={signTarget.document.payload.school.chopDataUrl} alt="School chop to be applied" className="h-20 max-w-40 bg-white p-1 object-contain" /><p className="text-xs text-muted-foreground">This school chop is part of the saved document and appears when the MRLC signatory signs.</p></div>}
              {!!signTarget.document.signatures?.length && <ul className="space-y-1 text-xs text-muted-foreground">{signTarget.document.signatures.map(signed => <li key={signed.id}>{signed.signerName} · {signed.signerTitle} · Signed {formatVolunteerSignedAt(signed.signedAt)}</li>)}</ul>}
              <SignatureCapture key={`${signTarget.document.id}-${signTarget.slot}`} id="volunteer-digital-signature" value={signature} onChange={value => { setSignature(value); setSignConsent(false); }} onBusyChange={setCaptureBusy} disabled={signing || !signReady} />
              <label className="flex items-start gap-3 text-sm leading-5"><input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={signConsent} onChange={event => setSignConsent(event.target.checked)} disabled={signing || !signReady || captureBusy} required /><span>I have reviewed this document, confirm that I am its assigned {signTarget.slot === 'SCHOOL' ? 'MRLC' : 'MRO'} signatory, and authorize the use of my signature on this document.</span></label>
            </>}
            {signError && <p role="alert" className="text-sm text-destructive">{signError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={signing} onClick={closeSigning}>Close</Button><Button type="submit" disabled={signing || signLoading || !signReady || captureBusy || !signature || !signConsent}>{signing ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}{signing ? 'Recording signature…' : 'Sign this document'}</Button></DialogFooter>
          </form>
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
