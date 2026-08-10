import React from 'react';
import QRCode from 'qrcode';
import {
  BookOpen,
  Briefcase,
  CreditCard,
  Download,
  ExternalLink,
  FlipHorizontal2,
  Loader2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiSend, downloadAuthenticatedFile } from '@/src/lib/api';
import { personnelCardStatus } from '@/shared/studentCardValidity';
import { toast } from 'sonner';

type PersonnelCardKind = 'TEACHER' | 'STAFF';

type PersonnelIdentityCardProps = {
  holderId: string;
  kind: PersonnelCardKind;
  name: string;
  code: string;
  photoUrl?: string | null;
  status: string;
  roleTitle: string;
  organizationUnit?: string | null;
  employmentType?: string | null;
  joinedDate?: string | null;
  canEdit?: boolean;
  canDownload?: boolean;
};

type PersonnelCardRecord = {
  kind: PersonnelCardKind;
  holderId: string;
  cardNumber: string;
  displayName: string;
  roleTitle: string;
  organizationUnit: string;
  employmentType: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  verifyToken: string;
  photoUrl?: string | null;
  school: {
    name: string;
    logoUrl?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };
};

const cardThemes = {
  TEACHER: {
    label: 'Teacher identity', credential: 'Teaching faculty', icon: BookOpen,
    shell: 'from-indigo-950 via-slate-900 to-amber-950', face: 'from-slate-950 via-indigo-950 to-amber-600',
    accent: 'text-amber-200', badge: 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/15', dot: 'bg-amber-400',
  },
  STAFF: {
    label: 'Staff identity', credential: 'Authorized staff', icon: Briefcase,
    shell: 'from-emerald-950 via-slate-900 to-cyan-950', face: 'from-slate-950 via-emerald-950 to-cyan-700',
    accent: 'text-emerald-200', badge: 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15', dot: 'bg-emerald-400',
  },
} as const;

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const dateInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const normalizeLabel = (value?: string | null) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';

export function PersonnelIdentityCard({
  holderId, kind, name, code, photoUrl, status, roleTitle, organizationUnit, employmentType,
  joinedDate, canEdit = false, canDownload = false,
}: PersonnelIdentityCardProps) {
  const [flipped, setFlipped] = React.useState(false);
  const [card, setCard] = React.useState<PersonnelCardRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [qr, setQr] = React.useState('');
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [draft, setDraft] = React.useState({ displayName: '', roleTitle: '', organizationUnit: '', issueDate: '', expiryDate: '' });
  const theme = cardThemes[kind];
  const RoleIcon = theme.icon;
  const endpoint = `/api/personnel-cards/${kind.toLowerCase()}/${holderId}`;

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<PersonnelCardRecord>(endpoint, { signal: controller.signal })
      .then(setCard)
      .catch((error) => {
        if (error?.name !== 'AbortError') toast.error(error.message || 'Failed to load identity card');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  React.useEffect(() => { setFlipped(false); }, [holderId]);

  const verifyUrl = card?.verifyToken ? `${window.location.origin}/verify/personnel/${card.verifyToken}` : '';
  React.useEffect(() => {
    let current = true;
    if (!verifyUrl) { setQr(''); return () => { current = false; }; }
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 420, errorCorrectionLevel: 'H' })
      .then((value) => { if (current) setQr(value); })
      .catch(() => { if (current) setQr(''); });
    return () => { current = false; };
  }, [verifyUrl]);

  const displayName = card?.displayName || name;
  const cardNumber = card?.cardNumber || code;
  const displayRole = card?.roleTitle || roleTitle;
  const displayUnit = card?.organizationUnit || organizationUnit || '—';
  const displayStatus = card?.status || status;
  const displayPhoto = card?.photoUrl || photoUrl;
  const school = card?.school || { name: 'School', logoUrl: null, contactPhone: null, contactEmail: null };
  const cardStatus = personnelCardStatus(displayStatus, card?.expiryDate);
  const active = cardStatus === 'ACTIVE';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  const openEditor = () => {
    if (!card) return;
    setDraft({
      displayName: card.displayName,
      roleTitle: card.roleTitle,
      organizationUnit: card.organizationUnit,
      issueDate: dateInputValue(card.issueDate),
      expiryDate: dateInputValue(card.expiryDate),
    });
    setEditOpen(true);
  };

  const saveCard = async () => {
    if (!draft.displayName.trim() || !draft.roleTitle.trim() || !draft.organizationUnit.trim() || !draft.issueDate || !draft.expiryDate) {
      toast.error('Complete every card field before saving');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiSend<PersonnelCardRecord>(endpoint, 'PUT', draft);
      setCard(updated);
      setEditOpen(false);
      toast.success(`${normalizeLabel(kind)} card updated`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update identity card');
    } finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadAuthenticatedFile(`${endpoint}/pdf`, `${normalizeLabel(kind)}-Card-${cardNumber}-300DPI.pdf`);
      toast.success('300 DPI print PDF downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download print PDF');
    } finally { setDownloading(false); }
  };

  const faceStyle: React.CSSProperties = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

  return (
    <>
      <section className={`overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${theme.shell} text-white shadow-sm`}>
        <div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(17rem,20rem)_1fr] lg:items-center lg:gap-10">
          <div className="mx-auto w-full max-w-[20rem]">
            <button type="button" onClick={() => setFlipped((value) => !value)}
              className="block w-full rounded-[1.75rem] text-left [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
              aria-label={`Show ${flipped ? 'front' : 'back'} of ${kind.toLowerCase()} card`} aria-pressed={flipped}>
              <span className="relative block aspect-[53.98/85.6] w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
                style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                <span aria-hidden={flipped}
                  className={`absolute inset-0 block overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl ${flipped ? 'invisible' : 'visible'}`}
                  style={faceStyle}>
                  {!active && <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"><span className="-rotate-[25deg] text-3xl font-black uppercase tracking-[0.2em] text-red-500/25">{cardStatus}</span></span>}
                  <span className={`relative block h-[34%] overflow-hidden bg-gradient-to-br ${theme.face} px-[7%] pt-[7%] text-white`}>
                    <span className="absolute -right-[18%] -top-[28%] size-[70%] rounded-full border-[1.5rem] border-white/5" />
                    <span className="relative z-10 flex items-center gap-2.5">
                      {school.logoUrl ? <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm"><img src={school.logoUrl} alt="" className="h-full w-full object-contain" draggable={false} /></span>
                        : <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900">{school.name[0]?.toUpperCase() || 'S'}</span>}
                      <span className="min-w-0"><span className="line-clamp-2 block text-[11px] font-black uppercase leading-tight tracking-[0.08em]">{school.name}</span><span className={`mt-1 block text-[8px] font-semibold uppercase tracking-[0.2em] ${theme.accent}`}>{theme.label}</span></span>
                    </span>
                  </span>

                  {/* The identity photo is deliberately natural: no filters, overlays, blending, or transforms. */}
                  <span className="absolute left-1/2 top-[22%] z-10 block h-[31%] w-[43%] -translate-x-1/2 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg">
                    {displayPhoto ? <img src={displayPhoto} alt={`${displayName} profile`} className="h-full w-full object-cover" draggable={false} />
                      : <span className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-slate-400">{initials || '?'}</span>}
                  </span>

                  <span className="block px-[7%] pt-[32%] text-center">
                    <span className="block truncate text-xl font-black leading-tight tracking-tight">{displayName}</span>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-4 py-1.5 font-mono text-xs font-black tracking-[0.08em] text-slate-800 ring-1 ring-slate-200">{cardNumber}</span>
                    <span className="mt-4 grid grid-cols-2 gap-2 text-left">
                      <CardDetail label="Role" value={displayRole} />
                      <CardDetail label={kind === 'TEACHER' ? 'Faculty' : 'Department'} value={displayUnit} />
                      <CardDetail label="Issued" value={formatDate(card?.issueDate)} />
                      <CardDetail label="Valid through" value={formatDate(card?.expiryDate)} />
                    </span>
                    <span className={`mt-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] ${active ? 'text-emerald-700' : 'text-red-600'}`}><span className={`size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />{active ? `Active ${kind.toLowerCase()}` : cardStatus}</span>
                  </span>
                  <span className="absolute inset-x-[7%] bottom-[3%] flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400"><span className="flex items-center gap-1.5"><RoleIcon className="size-3" /> {theme.credential}</span><ShieldCheck className="size-4 text-teal-600" /></span>
                </span>

                <span aria-hidden={!flipped}
                  className={`absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl [transform:rotateY(180deg)] ${flipped ? 'visible' : 'invisible'}`}
                  style={faceStyle}>
                  <span className={`relative block h-[22%] overflow-hidden bg-gradient-to-br ${theme.face} px-[8%] pt-[8%] text-center text-white`}>
                    <span className="relative flex items-center justify-center gap-2"><ShieldCheck className={`size-6 ${theme.accent}`} /><span className="text-xs font-black uppercase tracking-[0.14em]">Authentic & verifiable</span></span>
                    <span className="relative mt-2 block text-[9px] leading-tight text-white/70">Scan the secure code to confirm this card’s current status.</span>
                  </span>
                  <span className="flex flex-1 flex-col items-center px-[8%] pt-[8%] text-center">
                    <span className="flex size-[9.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ring-4 ring-slate-50">
                      {qr ? <img src={qr} alt={`${kind.toLowerCase()} card verification QR code`} className="h-full w-full object-contain" draggable={false} /> : <Loader2 className="size-6 animate-spin text-slate-400" />}
                    </span>
                    <span className="mt-4 block text-sm font-black uppercase tracking-[0.16em]">Scan to verify</span>
                    <span className="mt-2 block w-full break-all font-mono text-[8px] leading-snug text-slate-400">{verifyUrl || 'Preparing secure verification link…'}</span>
                    <span className="mt-5 block w-full rounded-2xl bg-slate-50 px-4 py-3 text-left ring-1 ring-slate-100">
                      <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">If this card is found</span>
                      <span className="mt-1.5 block text-[10px] font-semibold leading-snug text-slate-700">Please return it to {school.name}.</span>
                      <span className="mt-1.5 block text-[9px] font-bold text-slate-500">School contact: {school.contactPhone || 'Not provided'}</span>
                    </span>
                  </span>
                  <span className="mx-[8%] mb-[5%] border-t border-slate-100 pt-3 text-center text-[8px] font-medium leading-tight text-slate-400">Property of {school.name} · Non-transferable</span>
                </span>
              </span>
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/65"><FlipHorizontal2 className="size-3.5" aria-hidden="true" /> Click the card to show its {flipped ? 'front' : 'back'}</p>
          </div>

          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><CreditCard className={`size-6 ${theme.accent}`} /></span>
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{normalizeLabel(kind)} Card</h2><Badge className={`border-0 ${theme.badge}`}><span className={`size-1.5 rounded-full ${theme.dot}`} /> {cardStatus}</Badge></span>
                <span className="mt-2 block max-w-xl text-sm leading-relaxed text-white/65">A secure profile identity card for {displayName}. The QR code verifies its current status without revealing private records.</span>
              </span>
            </div>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <PersonnelDetail label="Card number" value={cardNumber} mono /><PersonnelDetail label="Role" value={displayRole} />
              <PersonnelDetail label={kind === 'TEACHER' ? 'Faculty' : 'Department'} value={displayUnit} /><PersonnelDetail label="Issue date" value={formatDate(card?.issueDate || joinedDate)} />
              <PersonnelDetail label="Expiry date" value={formatDate(card?.expiryDate)} /><PersonnelDetail label="Status" value={cardStatus} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifyUrl && <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" render={<a href={verifyUrl} target="_blank" rel="noreferrer" />} nativeButton={false}><ExternalLink className="size-4" /> Verify card</Button>}
              {canEdit && <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={openEditor} disabled={!card || loading}><Pencil className="size-4" /> Edit card fields</Button>}
              {canDownload && <Button className="bg-white text-slate-950 hover:bg-white/90" onClick={downloadPdf} disabled={!card || downloading}>{downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download 300 DPI PDF</Button>}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit {normalizeLabel(kind)} card fields</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Cardholder name" value={draft.displayName} onChange={(displayName) => setDraft({ ...draft, displayName })} className="sm:col-span-2" />
            <Field label="Role title" value={draft.roleTitle} onChange={(roleTitle) => setDraft({ ...draft, roleTitle })} />
            <Field label={kind === 'TEACHER' ? 'Faculty' : 'Department'} value={draft.organizationUnit} onChange={(organizationUnit) => setDraft({ ...draft, organizationUnit })} />
            <Field label="Issue date" value={draft.issueDate} onChange={(issueDate) => setDraft({ ...draft, issueDate })} type="date" />
            <Field label="Expiry date" value={draft.expiryDate} onChange={(expiryDate) => setDraft({ ...draft, expiryDate })} type="date" />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button><Button onClick={saveCard} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save card</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, onChange, type = 'text', className = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return <span className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100"><span className="block truncate text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span><span className="mt-0.5 block truncate text-[10px] font-black text-slate-800">{value}</span></span>;
}

function PersonnelDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</dt><dd className={`mt-1 truncate font-semibold text-white/85 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div>;
}
