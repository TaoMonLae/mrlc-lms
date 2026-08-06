import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Loader2, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet, apiSend, downloadAuthenticatedFile } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { officialDocumentBackPath } from '@/shared/officialDocuments';
import { inferStudentCardExpiry } from '@/shared/studentCardValidity';

// Standard ID-1 / "CR80" card size (ISO/IEC 7810), rotated into portrait.
// Physical dimensions stay identical to a credit card; only orientation changes.
const CARD_WIDTH_MM = 53.98;
const CARD_HEIGHT_MM = 85.6;
// Rendered well above 300 DPI at the card's physical QR footprint so the
// code stays crisp printed at true size.
const QR_PIXEL_SIZE = 480;

interface DocRecord {
  id: string;
  documentNumber: string;
  verifyToken: string;
  type: string;
  status: string;
  studentName: string;
  studentCode: string;
  className: string | null;
  term?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  payload: any;
}
interface Branding {
  name?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string | null;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function StudentIdCardPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [branding, setBranding] = useState<Branding>({});
  const [qr, setQr] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<DocRecord>(`/api/documents/${id}`)
      .then(async (d) => {
        setDoc(d);
        const verifyUrl = `${window.location.origin}/verify/${d.verifyToken}`;
        try {
          setQr(await QRCode.toDataURL(verifyUrl, { margin: 1, width: QR_PIXEL_SIZE }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => toast.error('Failed to load ID card'))
      .finally(() => setLoading(false));
    apiGet<Branding>('/api/settings').then(setBranding).catch(() => {});
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading ID card…</div>;
  if (!doc) return <div className="py-20 text-center text-slate-500">ID card not found.</div>;
  if (doc.type !== 'STUDENT_ID_CARD') return <div className="py-20 text-center text-slate-500">This document is not a student ID card.</div>;

  const p = doc.payload || {};
  const school = p.school || { name: branding.name };
  const student = p.student || {};
  const logoUrl = school.logoUrl || branding.logoUrl;
  const schoolPhone = school.contactPhone || branding.contactPhone;
  const schoolAddress = school.address || branding.address;
  const verifyUrl = `${window.location.origin}/verify/${doc.verifyToken}`;
  const expiryDate = doc.expiryDate || p.validity?.expiryDate
    || inferStudentCardExpiry(student.academicYear || doc.term, new Date(doc.issueDate)).toISOString();
  const cardStatus = doc.status === 'ACTIVE' && new Date(expiryDate).getTime() < Date.now() ? 'EXPIRED' : doc.status;
  const revoked = cardStatus !== 'ACTIVE';
  const initials = (doc.studentName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');
  const backPath = officialDocumentBackPath(user?.role);
  const handlePrint = () => {
    apiSend(`/api/documents/${doc.id}/download`, 'POST').catch(() => {});
    window.print();
  };
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadAuthenticatedFile(`/api/documents/${doc.id}/student-card.pdf`, `Student-Card-${doc.studentCode}.pdf`);
      toast.success('Student card PDF downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download student card PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      <style>{`
        @page { size: ${CARD_WIDTH_MM}mm ${CARD_HEIGHT_MM}mm; margin: 0; }
        .id-card-face {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          html, body { background: white !important; }
          .id-card-face { page-break-after: always; break-after: page; box-shadow: none !important; border: none !important; }
          .id-card-face:last-of-type { page-break-after: auto; }
        }
      `}</style>

      {/* Action bar (hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-2 print:hidden px-4">
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {user?.role === 'STUDENT' ? 'Back to My Profile' : 'Back to Documents'}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" /> Print card
          </Button>
        </div>
      </div>

      <p className="max-w-3xl mx-auto mb-4 text-center text-xs text-slate-500 print:hidden px-4">
        Portrait CR80 · {CARD_WIDTH_MM} × {CARD_HEIGHT_MM} mm / 2.125 × 3.375 in. Print front and back at 100% scale,
        then trim or send directly to a card printer.
      </p>

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 print:gap-0 print:px-0">
        {/* FRONT */}
        <div
          className="id-card-face relative overflow-hidden rounded-[5mm] border border-slate-200 bg-white shadow-2xl print:rounded-none"
          style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
        >
          {revoked && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="rotate-[-25deg] text-3xl font-black uppercase tracking-[0.25em] text-red-500/25">{cardStatus}</span>
            </div>
          )}

          {/* Branded portrait header */}
          <div className="relative h-[29mm] overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-teal-700 px-[3.5mm] pt-[3mm] text-white">
            <div className="absolute -right-[11mm] -top-[13mm] h-[35mm] w-[35mm] rounded-full border-[4mm] border-white/5" />
            <div className="absolute -bottom-[15mm] -left-[9mm] h-[29mm] w-[29mm] rounded-full bg-teal-300/10" />
            <div className="relative z-10 flex items-center gap-[2mm]">
              {logoUrl ? (
                <div className="flex h-[8mm] w-[8mm] shrink-0 items-center justify-center rounded-full bg-white p-[0.7mm] shadow-sm">
                  <img src={logoUrl} alt="" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-[8mm] w-[8mm] shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-black text-indigo-950">
                  {(school.name || 'S')[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 text-[7px] font-black uppercase leading-tight tracking-[0.08em]">{school.name || 'School'}</p>
                <p className="mt-[0.5mm] text-[5.5px] font-semibold uppercase tracking-[0.2em] text-teal-100">Student identity</p>
              </div>
            </div>
          </div>

          {/* Portrait photo overlaps the brand field */}
          <div className="absolute left-1/2 top-[18mm] z-10 h-[27mm] w-[22mm] -translate-x-1/2 overflow-hidden rounded-[3.5mm] border-[1mm] border-white bg-slate-100 shadow-lg">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100 text-xl font-black text-indigo-300">{initials}</div>
            )}
          </div>

          <div className="px-[3.5mm] pt-[17.5mm] text-center">
            <p className="truncate text-[12px] font-black leading-tight tracking-tight text-slate-950">{doc.studentName}</p>
            <div className="mt-[1.5mm] inline-flex items-center rounded-full bg-indigo-50 px-[3mm] py-[1mm] font-mono text-[8px] font-black tracking-[0.08em] text-indigo-800 ring-1 ring-indigo-100">
              {doc.studentCode}
            </div>

            <div className="mt-[3mm] grid grid-cols-2 gap-[1.5mm] text-left">
              <CardDetail label="Class" value={doc.className || '—'} />
              <CardDetail label="Level" value={student.level || '—'} />
              <CardDetail label="Date of birth" value={fmtDate(student.dateOfBirth)} />
              <CardDetail label="Academic year" value={student.academicYear || doc.term || '—'} />
            </div>

            <div className="mt-[2mm] grid grid-cols-2 overflow-hidden rounded-[2mm] bg-slate-900 text-left text-white">
              <div className="px-[2mm] py-[1.2mm]">
                <span className="block text-[4.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Issued</span>
                <span className="mt-[0.3mm] block text-[5.8px] font-black">{fmtDate(doc.issueDate)}</span>
              </div>
              <div className="border-l border-white/10 px-[2mm] py-[1.2mm]">
                <span className="block text-[4.5px] font-bold uppercase tracking-[0.1em] text-teal-300">Valid through</span>
                <span className="mt-[0.3mm] block text-[5.8px] font-black">{fmtDate(expiryDate)}</span>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-[3.5mm] bottom-[2.5mm] flex items-center justify-between border-t border-slate-100 pt-[1.5mm] text-[4.8px] font-semibold text-slate-400">
            <span className="max-w-[35mm] truncate font-mono">{doc.documentNumber}</span>
            <ShieldCheck className="h-[2.5mm] w-[2.5mm] text-teal-600" />
          </div>
        </div>

        {/* BACK */}
        <div
          className="id-card-face relative flex flex-col overflow-hidden rounded-[5mm] border border-slate-200 bg-white shadow-2xl print:rounded-none"
          style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
        >
          {revoked && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="rotate-[-25deg] text-3xl font-black uppercase tracking-[0.25em] text-red-500/25">{cardStatus}</span>
            </div>
          )}
          <div className="relative h-[19mm] overflow-hidden bg-gradient-to-br from-teal-700 via-indigo-900 to-slate-950 px-[4mm] pt-[3.5mm] text-center text-white">
            <div className="absolute -right-[10mm] -top-[11mm] h-[29mm] w-[29mm] rounded-full border-[3mm] border-white/5" />
            <div className="relative flex items-center justify-center gap-[1.5mm]">
              <ShieldCheck className="h-[4mm] w-[4mm] text-teal-200" />
              <span className="text-[7px] font-black uppercase tracking-[0.16em]">Authentic & verifiable</span>
            </div>
            <p className="relative mt-[1.5mm] text-[5.5px] leading-tight text-white/65">Scan the secure code to confirm this card’s current status.</p>
          </div>

          <div className="flex flex-1 flex-col items-center px-[4mm] pt-[4mm] text-center">
            <div className="flex h-[26mm] w-[26mm] items-center justify-center rounded-[3mm] border border-slate-200 bg-white p-[1.3mm] shadow-sm ring-[1mm] ring-slate-50">
              {qr && <img src={qr} alt="Verification QR" className="h-full w-full object-contain" />}
            </div>
            <p className="mt-[2.5mm] text-[8px] font-black uppercase tracking-[0.16em] text-slate-900">Scan to verify</p>
            <p className="mt-[1mm] max-w-full break-all font-mono text-[4.8px] leading-snug text-slate-400">{verifyUrl}</p>

            <div className="mt-[3mm] w-full rounded-[3mm] bg-slate-50 px-[3mm] py-[2.5mm] text-left ring-1 ring-slate-100">
              <p className="text-[5.5px] font-black uppercase tracking-[0.14em] text-slate-500">If this card is found</p>
              <p className="mt-[1mm] text-[5.8px] font-semibold leading-snug text-slate-700">Please return it to {school.name || 'the school office'}.</p>
              {schoolPhone && <p className="mt-[0.8mm] text-[5.3px] text-slate-500">Tel: {schoolPhone}</p>}
              {schoolAddress && <p className="mt-[0.5mm] line-clamp-2 text-[5px] leading-snug text-slate-400">{schoolAddress}</p>}
            </div>
          </div>

          <div className="mx-[4mm] mb-[2.5mm] border-t border-slate-100 pt-[1.8mm] text-center">
            <p className="text-[4.8px] font-medium leading-tight text-slate-400">Property of {school.name || 'the school'} · Non-transferable</p>
            <p className="mt-[0.8mm] font-mono text-[4.5px] text-slate-300">{doc.documentNumber} · Valid through {fmtDate(expiryDate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[2mm] bg-slate-50 px-[2mm] py-[1.5mm] ring-1 ring-slate-100">
      <span className="block truncate text-[5px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="mt-[0.5mm] block truncate text-[6.5px] font-black text-slate-800">{value}</span>
    </div>
  );
}
