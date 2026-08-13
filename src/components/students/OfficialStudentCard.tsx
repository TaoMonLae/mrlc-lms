import React from 'react';
import { Link } from 'react-router';
import QRCode from 'qrcode';
import { CreditCard, Download, ExternalLink, FlipHorizontal2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet, downloadAuthenticatedFile } from '@/src/lib/api';
import { officialDocumentViewPath } from '@/shared/officialDocuments';
import { toast } from 'sonner';

type StudentCardDocument = {
  id: string;
  documentNumber: string;
  verifyToken: string;
  type: 'STUDENT_ID_CARD';
  status: string;
  issueDate: string;
  expiryDate?: string | null;
  studentName: string;
  studentCode: string;
  className?: string | null;
  term?: string | null;
  payload?: {
    school?: {
      name?: string | null;
      contactPhone?: string | null;
      logoUrl?: string | null;
    };
    student?: {
      academicYear?: string | null;
      photoUrl?: string | null;
      identityNumber?: string | null;
    };
  } | null;
};

type OfficialStudentCardProps = {
  /** Omit for the signed-in learner; pass an ID on a staff-facing student profile. */
  studentId?: string;
};

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function StudentCardPreview({ card, expired }: { card: StudentCardDocument; expired: boolean }) {
  const [flipped, setFlipped] = React.useState(false);
  const [qr, setQr] = React.useState('');
  const student = card.payload?.student || {};
  const school = card.payload?.school || {};
  const verifyUrl = `${window.location.origin}/verify/${card.verifyToken}`;
  const cardStatus = expired ? 'EXPIRED' : card.status;
  const inactive = cardStatus !== 'ACTIVE';
  const initials = (card.studentName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  React.useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 360 })
      .then((dataUrl) => {
        if (active) setQr(dataUrl);
      })
      .catch(() => {
        if (active) setQr('');
      });
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  const faceStyle: React.CSSProperties = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

  return (
    <div className="mx-auto w-full max-w-[20rem]">
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="block w-full rounded-[1.75rem] text-left [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-indigo-950"
        aria-label={`Show ${flipped ? 'front' : 'back'} of student card`}
        aria-pressed={flipped}
      >
        <span
          className="relative block aspect-[53.98/85.6] w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <span
            className="absolute inset-0 block overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl"
            style={faceStyle}
          >
            {inactive && (
              <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <span className="-rotate-[25deg] text-3xl font-black uppercase tracking-[0.2em] text-red-500/25">{cardStatus}</span>
              </span>
            )}

            <span className="relative block h-[34%] overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-teal-700 px-[7%] pt-[7%] text-white">
              <span className="absolute -right-[20%] -top-[35%] size-[70%] rounded-full border-[1.4rem] border-white/5" />
              <span className="relative z-10 flex items-center gap-2">
                {school.logoUrl ? (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm">
                    <img src={school.logoUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                  </span>
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-indigo-950">
                    {(school.name || 'S')[0]}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[11px] font-black uppercase leading-tight tracking-[0.08em]">{school.name || 'School'}</span>
                  <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.2em] text-teal-100">Student identity</span>
                </span>
              </span>
            </span>

            {/* The issued profile photo is intentionally rendered without filters or visual effects. */}
            <span className="absolute left-1/2 top-[22%] z-10 block h-[31%] w-[43%] -translate-x-1/2 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={`${card.studentName} profile`} className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-indigo-300">{initials}</span>
              )}
            </span>

            <span className="block px-[7%] pt-[32%] text-center">
              <span className="block truncate text-xl font-black leading-tight tracking-tight">{card.studentName}</span>
              <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-4 py-1.5 font-mono text-xs font-black tracking-[0.08em] text-indigo-800 ring-1 ring-indigo-100">
                {card.studentCode}
              </span>

              <span className="mt-4 grid grid-cols-6 gap-2 text-left">
                <CardDetail label="Class" value={card.className || '—'} className="col-span-2" />
                <CardDetail label="Academic year" value={student.academicYear || card.term || '—'} className="col-span-2" />
                <CardDetail label="ID No." value={student.identityNumber || '—'} className="col-span-2" />
                <CardDetail label="Issued" value={formatDate(card.issueDate)} className="col-span-3" />
                <CardDetail label="Valid through" value={formatDate(card.expiryDate)} className="col-span-3" />
              </span>

              <span className={`mt-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] ${cardStatus === 'ACTIVE' ? 'text-emerald-700' : 'text-red-600'}`}>
                <span className={`size-2 rounded-full ${cardStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {cardStatus === 'ACTIVE' ? 'Active student' : cardStatus}
              </span>
            </span>

            <span className="absolute inset-x-[7%] bottom-[3%] flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] font-semibold text-slate-400">
              <span className="max-w-[85%] truncate font-mono">{card.documentNumber}</span>
              <ShieldCheck className="size-4 text-teal-600" />
            </span>
          </span>

          {/* Back */}
          <span
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl [transform:rotateY(180deg)]"
            style={faceStyle}
          >
            {inactive && (
              <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <span className="-rotate-[25deg] text-3xl font-black uppercase tracking-[0.2em] text-red-500/25">{cardStatus}</span>
              </span>
            )}
            <span className="relative block h-[22%] overflow-hidden bg-gradient-to-br from-teal-700 via-indigo-900 to-slate-950 px-[8%] pt-[8%] text-center text-white">
              <span className="relative flex items-center justify-center gap-2">
                <ShieldCheck className="size-6 text-teal-200" />
                <span className="text-xs font-black uppercase tracking-[0.16em]">Authentic & verifiable</span>
              </span>
              <span className="relative mt-2 block text-[9px] leading-tight text-white/65">Scan the secure code to confirm this card’s current status.</span>
            </span>

            <span className="flex flex-1 flex-col items-center px-[8%] pt-[8%] text-center">
              <span className="flex size-[9.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ring-4 ring-slate-50">
                {qr ? <img src={qr} alt="Student card verification QR code" className="h-full w-full object-contain" draggable={false} /> : <span className="text-xs text-slate-400">Loading secure code…</span>}
              </span>
              <span className="mt-4 block text-sm font-black uppercase tracking-[0.16em]">Scan to verify</span>
              <span className="mt-2 block w-full break-all font-mono text-[8px] leading-snug text-slate-400">{verifyUrl}</span>

              <span className="mt-5 block w-full rounded-2xl bg-slate-50 px-4 py-3 text-left ring-1 ring-slate-100">
                <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">If this card is found</span>
                <span className="mt-1.5 block text-[10px] font-semibold leading-snug text-slate-700">Please return it to {school.name || 'the school office'}.</span>
                <span className="mt-1.5 block text-[9px] font-bold text-slate-500">School contact: {school.contactPhone || 'Not provided'}</span>
              </span>
            </span>

            <span className="mx-[8%] mb-[5%] border-t border-slate-100 pt-3 text-center text-[8px] font-medium leading-tight text-slate-400">
              Property of {school.name || 'the school'} · Non-transferable
            </span>
          </span>
        </span>
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/65">
        <FlipHorizontal2 className="size-3.5" aria-hidden="true" /> Click the card to show its {flipped ? 'front' : 'back'}
      </p>
    </div>
  );
}

function CardDetail({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <span className={`min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100 ${className}`}>
      <span className="block truncate text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate text-[10px] font-black text-slate-800">{value}</span>
    </span>
  );
}

export function OfficialStudentCard({ studentId }: OfficialStudentCardProps) {
  const [cards, setCards] = React.useState<StudentCardDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type: 'STUDENT_ID_CARD', status: 'ACTIVE' });
    if (studentId) params.set('studentId', studentId);
    const endpoint = studentId ? `/api/documents?${params}` : `/api/student/documents?${params}`;

    setLoading(true);
    setError(false);
    apiGet<StudentCardDocument[]>(endpoint, { signal: controller.signal })
      .then((documents) => setCards(Array.isArray(documents) ? documents : []))
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [studentId, reloadKey]);

  const card = cards[0];
  const expired = Boolean(card?.expiryDate && new Date(card.expiryDate).getTime() < Date.now());

  const downloadPdf = async () => {
    if (!card) return;
    try {
      await downloadAuthenticatedFile(`/api/documents/${card.id}/student-card.pdf`, 'Student-Card.pdf');
      toast.success('Student card PDF downloaded');
    } catch (requestError: any) {
      toast.error(requestError.message || 'Failed to download student card PDF');
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white shadow-sm dark:border-indigo-400/20">
      <div className={`grid gap-6 p-5 sm:p-6 ${card ? 'lg:grid-cols-[minmax(17rem,20rem)_1fr] lg:items-center lg:gap-10' : ''}`}>
        {card && <StudentCardPreview card={card} expired={expired} />}

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <CreditCard className="size-6 text-violet-200" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold">Official Student Card</h2>
                {card && (
                  <Badge className={`border-0 ${expired ? 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/15' : 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15'}`}>
                    <ShieldCheck className="size-3" /> {expired ? 'Expired' : 'Active'}
                  </Badge>
                )}
              </div>
              {loading ? (
                <p className="mt-1 text-sm text-white/65">Checking for your issued card…</p>
              ) : error ? (
                <p className="mt-1 text-sm text-rose-200">The card could not be loaded. Your issued card has not been removed.</p>
              ) : card ? (
                <div className="mt-1 space-y-0.5 text-sm text-white/70">
                  <p className="truncate font-mono text-xs text-white/85">{card.documentNumber}</p>
                  <p>Issued {new Date(card.issueDate).toLocaleDateString()}{card.className ? ` · ${card.className}` : ''}</p>
                  {card.expiryDate && <p>Valid through {new Date(card.expiryDate).toLocaleDateString()}</p>}
                </div>
              ) : (
                <p className="mt-1 text-sm text-white/65">No active student card has been issued yet. It will appear here automatically after generation.</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {error && (
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCw className="size-4" /> Retry
              </Button>
            )}
            {card && (
              <>
                <Button className="bg-white text-indigo-950 hover:bg-indigo-50" render={<Link to={officialDocumentViewPath(card)} />} nativeButton={false}>
                  <CreditCard className="size-4" /> View / Print Card
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={downloadPdf}>
                  <Download className="size-4" /> PDF
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label="Open public verification page" render={<a href={`/verify/${card.verifyToken}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                  <ExternalLink className="size-4" /> Verify
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
