import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';

// Standard ID-1 / "CR80" card size (ISO/IEC 7810) — the same physical
// dimensions used by credit cards, driver's licenses and most school ID
// cards worldwide.
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;
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
  issueDate: string;
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
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [branding, setBranding] = useState<Branding>({});
  const [qr, setQr] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
  const verifyUrl = `${window.location.origin}/verify/${doc.verifyToken}`;
  const revoked = doc.status !== 'ACTIVE';
  const initials = (doc.studentName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      <style>{`
        @page { size: ${CARD_WIDTH_MM}mm ${CARD_HEIGHT_MM}mm; margin: 0; }
        @media print {
          .id-card-face { page-break-after: always; box-shadow: none !important; border: none !important; }
          .id-card-face:last-of-type { page-break-after: auto; }
        }
      `}</style>

      {/* Action bar (hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden px-4">
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => navigate('/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>
        <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
          <Printer className="mr-2 h-4 w-4" /> Print card
        </Button>
      </div>

      <p className="max-w-3xl mx-auto mb-4 text-center text-xs text-slate-500 print:hidden px-4">
        Prints at true CR80 card size ({CARD_WIDTH_MM} × {CARD_HEIGHT_MM} mm / 3.375 × 2.125 in) — the standard size
        used for most ID and payment cards. Print front and back on card stock and trim, or send to a card printer.
      </p>

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 print:gap-0 print:px-0">
        {/* FRONT */}
        <div
          className="id-card-face relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl print:rounded-none"
          style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
        >
          {revoked && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="rotate-[-20deg] text-2xl font-black uppercase tracking-widest text-red-500/20">{doc.status}</span>
            </div>
          )}

          {/* Header strip */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-4 w-4 object-contain" />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[7px] font-black text-slate-900">
                {(school.name || 'S')[0]}
              </div>
            )}
            <span className="truncate text-[7px] font-black uppercase tracking-wider text-white">{school.name || 'School'}</span>
            <span className="ml-auto text-[6px] font-bold uppercase tracking-widest text-slate-300">Student ID</span>
          </div>

          <div className="flex gap-2 p-2.5">
            {/* Photo */}
            <div className="h-[22mm] w-[17mm] shrink-0 overflow-hidden rounded-md border border-slate-300 bg-slate-100">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-400">{initials}</div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black leading-tight text-slate-900">{doc.studentName}</p>
              <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">Student ID</p>
              <p className="mb-1 font-mono text-[9px] font-bold text-slate-800">{doc.studentCode}</p>

              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[6.5px] text-slate-600">
                <div>
                  <span className="block text-slate-400">Class</span>
                  <span className="font-semibold text-slate-800">{doc.className || '—'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Level</span>
                  <span className="font-semibold text-slate-800">{student.level || '—'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">DOB</span>
                  <span className="font-semibold text-slate-800">{fmtDate(student.dateOfBirth)}</span>
                </div>
                <div>
                  <span className="block text-slate-400">{student.academicYear ? 'Year' : 'Issued'}</span>
                  <span className="font-semibold text-slate-800">{student.academicYear || fmtDate(doc.issueDate)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-1 left-2.5 right-2.5 flex items-center justify-between text-[5.5px] font-semibold text-slate-400">
            <span>{doc.documentNumber}</span>
            <span>{student.status || 'ACTIVE'}</span>
          </div>
        </div>

        {/* BACK */}
        <div
          className="id-card-face relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl print:rounded-none"
          style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
        >
          {revoked && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="rotate-[-20deg] text-2xl font-black uppercase tracking-widest text-red-500/20">{doc.status}</span>
            </div>
          )}
          <div className="h-[5mm] w-full bg-slate-900" />
          <div className="flex flex-1 items-center gap-2.5 p-2.5">
            <div className="flex h-[20mm] w-[20mm] shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white p-1">
              {qr && <img src={qr} alt="Verification QR" className="h-full w-full object-contain" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[7px] font-black uppercase tracking-wide text-slate-700">
                <ShieldCheck className="h-2 w-2" /> Scan to verify
              </p>
              <p className="mt-0.5 break-all font-mono text-[5.5px] leading-tight text-slate-400">{verifyUrl}</p>
              <p className="mt-1.5 text-[6px] leading-tight text-slate-500">
                If found, please return to {school.name || 'the school office'}
                {branding.contactPhone ? ` · ${branding.contactPhone}` : ''}.
              </p>
              {school.address && <p className="mt-1 text-[5.5px] leading-tight text-slate-400">{school.address}</p>}
            </div>
          </div>
          <div className="border-t border-slate-100 px-2.5 py-1 text-center text-[5.5px] text-slate-400">
            This card remains the property of {school.name || 'the school'}. Non-transferable.
          </div>
        </div>
      </div>
    </div>
  );
}
