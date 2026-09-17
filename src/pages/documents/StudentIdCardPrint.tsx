import React from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet, apiSend, downloadAuthenticatedFile } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { officialDocumentBackPath } from '@/shared/officialDocuments';
import { inferStudentCardExpiry } from '@/shared/studentCardValidity';
import { StudentIdentityCardFace, type StudentIdentityCardData } from '../../components/students/StudentIdentityCardFace';

const CARD_WIDTH_MM = 53.98;
const CARD_HEIGHT_MM = 85.6;
type DocRecord = { id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  studentName: string; studentCode: string; className?: string | null; term?: string | null;
  issueDate: string; expiryDate?: string | null; payload: any };

export default function StudentIdCardPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = React.useState<DocRecord | null>(null);
  const [branding, setBranding] = React.useState<any>({});
  const [qr, setQr] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  React.useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true); setDoc(null); setQr('');
    apiGet<DocRecord>(`/api/documents/${id}`, { signal: controller.signal }).then(async document => {
      if (controller.signal.aborted) return;
      setDoc(document);
      const code = await QRCode.toDataURL(`${window.location.origin}/verify/${document.verifyToken}`, { margin: 2, width: 480 }).catch(() => '');
      if (!controller.signal.aborted) setQr(code);
    }).catch(error => { if (error.name !== 'AbortError') toast.error('Failed to load ID card'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    apiGet('/api/settings', { signal: controller.signal }).then(setBranding).catch(() => {});
    return () => controller.abort();
  }, [id]);
  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading ID card…</div>;
  if (!doc) return <div className="py-20 text-center text-muted-foreground">ID card not found.</div>;
  if (doc.type !== 'STUDENT_ID_CARD') return <div className="py-20 text-center text-muted-foreground">This document is not a student ID card.</div>;
  const school = doc.payload?.school || {};
  const student = doc.payload?.student || {};
  const expiryDate = doc.expiryDate || doc.payload?.validity?.expiryDate || inferStudentCardExpiry(student.academicYear || doc.term, new Date(doc.issueDate)).toISOString();
  const data: StudentIdentityCardData = {
    studentName: doc.studentName, studentCode: doc.studentCode, documentNumber: doc.documentNumber,
    className: doc.className, academicYear: student.academicYear || doc.term, identityNumber: student.identityNumber,
    issueDate: doc.issueDate, expiryDate, schoolName: school.name || branding.name || 'School',
    schoolPhone: school.contactPhone || branding.contactPhone, logoUrl: school.logoUrl || branding.logoUrl,
    photoUrl: student.photoUrl, status: doc.status === 'ACTIVE' && new Date(expiryDate).getTime() < Date.now() ? 'EXPIRED' : doc.status,
    verifyUrl: `${window.location.origin}/verify/${doc.verifyToken}`,
  };
  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadAuthenticatedFile(`/api/documents/${doc.id}/student-card.pdf`, `Student-Card-${doc.studentCode}.pdf`); }
    catch (error: any) { toast.error(error.message || 'Could not download card PDF'); }
    finally { setDownloading(false); }
  };
  return <div className="min-h-screen bg-muted py-8 print:bg-white print:py-0">
    <style>{`@page { size: ${CARD_WIDTH_MM}mm ${CARD_HEIGHT_MM}mm; margin: 0; }
      .id-card-face { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @media print { html, body { background: white !important; } .id-card-face { break-after: page; box-shadow: none !important; border: none !important; } .id-card-face:last-child { break-after: auto; } }`}</style>
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden"><Button variant="ghost" onClick={() => navigate(officialDocumentBackPath(user?.role))}><ArrowLeft className="size-4" />Back to {user?.role === 'STUDENT' ? 'My Profile' : 'Documents'}</Button><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={handleDownload} disabled={downloading}>{downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Download PDF</Button><Button onClick={() => { apiSend(`/api/documents/${doc.id}/download`, 'POST').catch(() => {}); window.print(); }}><Printer className="size-4" />Print card</Button></div></div>
    <p className="mx-auto mb-4 max-w-xl px-4 text-center text-xs text-muted-foreground print:hidden">Portrait CR80 · {CARD_WIDTH_MM} × {CARD_HEIGHT_MM} mm. Print front and back at 100% scale.</p>
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 print:gap-0 print:px-0">{(['front', 'back'] as const).map(side => <div key={side} className="id-card-face overflow-hidden rounded-xl border border-slate-200 shadow-sm print:rounded-none" style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}><StudentIdentityCardFace data={data} side={side} qr={qr} /></div>)}</div>
  </div>;
}
