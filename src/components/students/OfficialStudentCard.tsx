import React from 'react';
import { Link } from 'react-router';
import QRCode from 'qrcode';
import { CreditCard, Download, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet, downloadAuthenticatedFile } from '@/src/lib/api';
import { officialDocumentViewPath } from '@/shared/officialDocuments';
import { inferStudentCardExpiry } from '@/shared/studentCardValidity';
import { toast } from 'sonner';
import { StudentIdentityCardFace, type StudentIdentityCardData } from './StudentIdentityCardFace';

type StudentCardDocument = {
  id: string; documentNumber: string; verifyToken: string; type: 'STUDENT_ID_CARD'; status: string;
  issueDate: string; expiryDate?: string | null; studentName: string; studentCode: string;
  className?: string | null; term?: string | null;
  payload?: { school?: { name?: string | null; contactPhone?: string | null; logoUrl?: string | null };
    student?: { academicYear?: string | null; photoUrl?: string | null; identityNumber?: string | null };
    validity?: { expiryDate?: string | null } } | null;
};
export function OfficialStudentCard({ studentId }: { studentId?: string }) {
  const [cards, setCards] = React.useState<StudentCardDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [side, setSide] = React.useState<'front' | 'back'>('front');
  const [qr, setQr] = React.useState('');
  const [downloading, setDownloading] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type: 'STUDENT_ID_CARD', status: 'ACTIVE' });
    if (studentId) params.set('studentId', studentId);
    setLoading(true); setError(false); setCards([]); setSide('front');
    apiGet<StudentCardDocument[]>(`${studentId ? '/api/documents' : '/api/student/documents'}?${params}`, { signal: controller.signal })
      .then(documents => setCards(Array.isArray(documents) ? documents : []))
      .catch(requestError => { if (!controller.signal.aborted && requestError?.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [studentId, reloadKey]);
  const card = cards[0];
  const verifyUrl = card ? `${window.location.origin}/verify/${card.verifyToken}` : '';
  React.useEffect(() => {
    let active = true; setQr('');
    if (verifyUrl) QRCode.toDataURL(verifyUrl, { margin: 2, width: 480 }).then(value => { if (active) setQr(value); }).catch(() => {});
    return () => { active = false; };
  }, [verifyUrl]);
  const expiryDate = card?.expiryDate || card?.payload?.validity?.expiryDate || (card ? inferStudentCardExpiry(card.payload?.student?.academicYear || card.term, new Date(card.issueDate)).toISOString() : null);
  const expired = Boolean(expiryDate && new Date(expiryDate).getTime() < Date.now());
  const data: StudentIdentityCardData | null = card ? {
    studentName: card.studentName, studentCode: card.studentCode, documentNumber: card.documentNumber,
    className: card.className, academicYear: card.payload?.student?.academicYear || card.term,
    identityNumber: card.payload?.student?.identityNumber, photoUrl: card.payload?.student?.photoUrl,
    schoolName: card.payload?.school?.name || 'School', schoolPhone: card.payload?.school?.contactPhone,
    logoUrl: card.payload?.school?.logoUrl, issueDate: card.issueDate, expiryDate,
    status: expired ? 'EXPIRED' : card.status, verifyUrl,
  } : null;
  const downloadPdf = async () => {
    if (!card || downloading) return;
    setDownloading(true);
    try { await downloadAuthenticatedFile(`/api/documents/${card.id}/student-card.pdf`, `Student-Card-${card.studentCode}.pdf`); toast.success('Student card PDF downloaded'); }
    catch (requestError: any) { toast.error(requestError.message || 'Failed to download student card PDF'); }
    finally { setDownloading(false); }
  };
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground" aria-label="Official student card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="flex items-center gap-2"><CreditCard className="size-5 text-academic-teal" /><h2 className="font-semibold">Official Student Card</h2></div>{data && <Badge variant="outline" className={expired ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}><ShieldCheck className="size-3" />{data.status === 'ACTIVE' ? 'Active' : data.status}</Badge>}</header>
      {loading ? <p role="status" className="p-8 text-sm text-muted-foreground">Checking for an issued student card…</p> : error ? <div role="alert" className="space-y-3 p-6"><p className="text-sm">Could not load the student card. Please retry.</p><Button variant="outline" onClick={() => setReloadKey(value => value + 1)}><RefreshCw className="size-4" />Retry</Button></div> : data && card ? <div className="grid min-w-0 gap-6 p-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:items-center">
        <div className="min-w-0 rounded-lg bg-muted/50 p-4"><div className="mx-auto aspect-[53.98/85.6] w-full max-w-[17rem] overflow-hidden rounded-xl border border-slate-200 shadow-sm"><StudentIdentityCardFace data={data} side={side} qr={qr} /></div><div className="mt-4 flex justify-center gap-2" aria-label="Card side"><Button variant={side === 'front' ? 'secondary' : 'ghost'} size="sm" aria-pressed={side === 'front'} onClick={() => setSide('front')}>Front</Button><Button variant={side === 'back' ? 'secondary' : 'ghost'} size="sm" aria-pressed={side === 'back'} onClick={() => setSide('back')}>Back / QR</Button></div></div>
        <div className="min-w-0 space-y-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">School-issued identity</p><p className="mt-2 break-words text-xl font-semibold">{card.studentName}</p><p className="mt-1 font-mono text-sm text-muted-foreground">{card.studentCode}</p></div><dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Document number</dt><dd className="mt-1 break-all font-mono text-xs">{card.documentNumber}</dd></div><div><dt className="text-muted-foreground">Valid through</dt><dd className="mt-1">{expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '—'}</dd></div></dl><p className="text-xs leading-relaxed text-muted-foreground">The photo on this card is managed by admin. Check the QR verification page for the current card status.</p><div className="flex flex-wrap gap-2"><Button render={<Link to={officialDocumentViewPath(card)} />} nativeButton={false}><CreditCard className="size-4" />View / Print Card</Button><Button variant="outline" onClick={downloadPdf} disabled={downloading}><Download className="size-4" />{downloading ? 'Downloading…' : 'PDF'}</Button><Button variant="ghost" render={<a href={`/verify/${card.verifyToken}`} target="_blank" rel="noreferrer" />} nativeButton={false}><ExternalLink className="size-4" />Verify</Button></div></div>
      </div> : <div className="flex flex-col items-center gap-3 p-8 text-center"><CreditCard className="size-9 text-muted-foreground" /><h3 className="font-semibold">No student card issued</h3><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Ask admin to issue a student ID card. It will appear here automatically once generated.</p></div>}
    </section>
  );
}
