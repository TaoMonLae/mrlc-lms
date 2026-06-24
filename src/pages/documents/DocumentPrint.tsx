import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';

const TYPE_TITLES: Record<string, string> = {
  REPORT_CARD: 'Term Report Card',
  TRANSCRIPT: 'Academic Transcript',
  ENROLLMENT_CONFIRMATION: 'Enrollment Confirmation',
  COMPLETION_CERTIFICATE: 'Certificate of Completion',
  PROGRESS_REPORT: 'Student Progress Report',
};
const SUBJECT_LABELS: Record<string, string> = { RLA: 'RLA', MATH: 'Math', SCIENCE: 'Science', SOCIAL_STUDIES: 'Social Studies' };
const STATUS_LABELS: Record<string, string> = {
  NOT_READY: 'Not Ready', DEVELOPING: 'Developing', NEAR_READY: 'Near Ready', READY: 'Ready', TEST_SCHEDULED: 'Test Scheduled', PASSED: 'Passed',
};

interface DocRecord {
  id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  studentName: string; studentCode: string; className: string | null; term: string | null;
  issueDate: string; issuedByName: string | null; payload: any;
}
interface Branding { name?: string; address?: string; contactEmail?: string; contactPhone?: string; logoUrl?: string | null; signatureUrl?: string | null; }

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

export default function DocumentPrint() {
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
        try { setQr(await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 })); } catch { /* ignore */ }
      })
      .catch(() => toast.error('Failed to load document'))
      .finally(() => setLoading(false));
    apiGet<Branding>('/api/settings').then(setBranding).catch(() => {});
  }, [id]);

  const handleDownload = async () => {
    if (doc) apiSend(`/api/documents/${doc.id}/download`, 'POST').catch(() => {});
    window.print();
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading document…</div>;
  if (!doc) return <div className="py-20 text-center text-slate-500">Document not found.</div>;

  const p = doc.payload || {};
  const school = p.school || { name: branding.name };
  const student = p.student || {};
  const verifyUrl = `${window.location.origin}/verify/${doc.verifyToken}`;
  const cancelled = doc.status !== 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      {/* Action bar (hidden when printing) */}
      <div className="max-w-[820px] mx-auto mb-4 flex items-center justify-between print:hidden px-4">
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => navigate('/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>
        <Button onClick={handleDownload} className="bg-primary text-primary-foreground">
          <Download className="mr-2 h-4 w-4" /> Download / Print PDF
        </Button>
      </div>

      {/* The document sheet */}
      <div className="relative max-w-[820px] mx-auto bg-white text-slate-900 shadow-xl print:shadow-none print:max-w-none px-12 py-10" id="doc-sheet">
        {cancelled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[120px] font-black uppercase tracking-widest text-red-500/10 rotate-[-30deg]">{doc.status}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-16 w-16 object-contain" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xl">{(school.name || 'S')[0]}</div>
            )}
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">{school.name}</h1>
              {school.address && <p className="text-xs text-slate-500">{school.address}</p>}
              <p className="text-xs text-slate-500">{[school.contactEmail, school.contactPhone].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-bold text-slate-700 uppercase tracking-wider">{TYPE_TITLES[doc.type]}</p>
            <p className="mt-1">No: <span className="font-mono font-semibold text-slate-900">{doc.documentNumber}</span></p>
            <p>Issued: <span className="font-semibold text-slate-900">{fmtDate(doc.issueDate)}</span></p>
            {doc.term && <p>Term: <span className="font-semibold text-slate-900">{doc.term}</span></p>}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-2xl font-bold uppercase tracking-[0.2em] text-slate-800 my-6">{TYPE_TITLES[doc.type]}</h2>

        {/* Student block */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-6">
          <Field label="Student Name" value={student.name} />
          <Field label="Student ID" value={student.code} />
          <Field label="Class" value={student.className} />
          <Field label="Level" value={student.level} />
          <Field label="Academic Year" value={student.academicYear} />
          <Field label="Status" value={student.status} />
        </div>

        {/* Body by type */}
        {doc.type === 'ENROLLMENT_CONFIRMATION' && (
          <p className="text-sm leading-7 text-slate-700">
            This document confirms that <strong>{student.name}</strong> (Student ID <strong>{student.code}</strong>) is
            officially enrolled at <strong>{school.name}</strong>{student.className ? <> in <strong>{student.className}</strong></> : null}
            {student.academicYear ? <> for the academic year <strong>{student.academicYear}</strong></> : null}.
            Enrollment date: <strong>{fmtDate(student.enrollmentDate)}</strong>. Current status: <strong>{student.status}</strong>.
          </p>
        )}

        {doc.type === 'COMPLETION_CERTIFICATE' && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-slate-600">This is to certify that</p>
            <p className="text-2xl font-bold text-slate-900">{student.name}</p>
            <p className="text-sm leading-7 text-slate-700 max-w-xl mx-auto">
              has successfully completed the GED preparation program at <strong>{school.name}</strong>
              {p.termAverage != null ? <> with an overall average of <strong>{p.termAverage}% ({p.letter})</strong></> : null}.
            </p>
            {(p.passedSubjects?.length ?? 0) > 0 && (
              <p className="text-sm text-slate-700">GED subjects passed: <strong>{p.passedSubjects.map((s: string) => SUBJECT_LABELS[s] || s).join(', ')}</strong></p>
            )}
          </div>
        )}

        {(doc.type === 'REPORT_CARD' || doc.type === 'TRANSCRIPT' || doc.type === 'PROGRESS_REPORT') && (
          <div className="space-y-6">
            {/* Academic status */}
            {p.academicStatus && (
              <div className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-200 px-4 py-2 text-sm">
                <span className="font-semibold text-slate-700">Academic Status</span>
                <span className={`font-bold ${p.academicStatus === 'Academic Warning' ? 'text-red-600' : p.academicStatus === 'Honor Roll' ? 'text-emerald-600' : 'text-slate-800'}`}>{p.academicStatus}</span>
              </div>
            )}

            {/* Grades */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Subject Grades</h3>
              <table className="w-full text-sm border border-slate-200">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Subject</th>
                    <th className="text-center px-3 py-2 font-semibold">Average</th>
                    <th className="text-center px-3 py-2 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.subjects || []).map((s: any) => (
                    <tr key={s.subjectId} className="border-t border-slate-100">
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 text-center">{s.average != null ? `${s.average}%` : '—'}</td>
                      <td className="px-3 py-2 text-center font-bold">{s.letter || '—'}</td>
                    </tr>
                  ))}
                  {(p.subjects?.length ?? 0) === 0 && <tr><td colSpan={3} className="px-3 py-3 text-center text-slate-400">No grades recorded.</td></tr>}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                    <td className="px-3 py-2">{doc.type === 'TRANSCRIPT' ? 'Cumulative Average' : 'Term Average'}</td>
                    <td className="px-3 py-2 text-center">{p.termAverage != null ? `${p.termAverage}%` : '—'}</td>
                    <td className="px-3 py-2 text-center">{p.letter || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attendance + GED readiness */}
            <div className="grid grid-cols-2 gap-6">
              {p.attendance && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Attendance Summary</h3>
                  <div className="text-sm space-y-1">
                    <Field label="Days Recorded" value={String(p.attendance.total)} inline />
                    <Field label="Present" value={String(p.attendance.present)} inline />
                    <Field label="Absent" value={String(p.attendance.absent)} inline />
                    <Field label="Late" value={String(p.attendance.late)} inline />
                    <Field label="Excused" value={String(p.attendance.excused)} inline />
                    <Field label="Attendance Rate" value={`${p.attendance.rate}%`} inline />
                  </div>
                </div>
              )}
              {(p.gedReadiness?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">GED Readiness</h3>
                  <div className="text-sm space-y-1">
                    {p.gedReadiness.map((g: any) => (
                      <Field key={g.subject} label={SUBJECT_LABELS[g.subject] || g.subject} value={STATUS_LABELS[g.status] || g.status} inline />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            {(p.comments?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Teacher Comments</h3>
                <div className="space-y-2">
                  {p.comments.slice(0, 8).map((c: any, i: number) => (
                    <p key={i} className="text-sm text-slate-700"><span className="font-semibold">{c.subject}:</span> {c.comment}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer: signature + QR */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between">
          <div className="text-center">
            {branding.signatureUrl && <img src={branding.signatureUrl} alt="" className="h-14 object-contain mx-auto" />}
            <div className="w-52 border-t border-slate-400 mt-1 pt-1 text-xs text-slate-600">
              Authorized Signature
              {doc.issuedByName && <div className="text-[10px] text-slate-400">{doc.issuedByName}</div>}
            </div>
          </div>
          <div className="text-center">
            {qr && <img src={qr} alt="Verification QR" className="h-24 w-24 mx-auto" />}
            <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> Scan to verify</p>
            <p className="text-[9px] text-slate-400 font-mono break-all max-w-[150px]">{verifyUrl}</p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          This is an official document of {school.name}. Verify its authenticity at {window.location.origin}/verify using the document number {doc.documentNumber}.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, inline }: { label: string; value?: string | null; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex justify-between">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{value || '—'}</span>
      </div>
    );
  }
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest text-slate-400 block">{label}</span>
      <span className="font-semibold text-slate-900">{value || '—'}</span>
    </div>
  );
}
