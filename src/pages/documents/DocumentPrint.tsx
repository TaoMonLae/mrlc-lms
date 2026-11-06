import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCode from 'qrcode';
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import './documentPrint.css';

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
const READY_TONE: Record<string, string> = {
  READY: 'text-emerald-700', PASSED: 'text-emerald-700', TEST_SCHEDULED: 'text-sky-700', NEAR_READY: 'text-amber-700',
};

interface DocRecord {
  id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  studentName: string; studentCode: string; className: string | null; term: string | null;
  issueDate: string; issuedByName: string | null; payload: any;
}
interface Branding { name?: string; address?: string; contactEmail?: string; contactPhone?: string; logoUrl?: string | null; signatureUrl?: string | null; }

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const titleCase = (v?: string | null) => (v ? v.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : v);
// Subject names come straight from the gradebook ("GED_RLA", "GED-Science");
// show them with plain spaces on an official document.
const subjectName = (v?: string | null) => (v || '').replace(/_/g, ' ').replace(/^GED-/i, 'GED ').replace(/\s+/g, ' ').trim();
// Older documents stored the issuer's login email; never print that as a name.
const signerName = (v?: string | null) => (v && !v.includes('@') ? v : null);
// "Aung Aung Naing - Term Report Card - Final 2026": used as the page title so
// the browser's Save as PDF suggests a file name that identifies the student.
const downloadName = (doc: DocRecord) =>
  [doc.studentName || doc.payload?.student?.name, TYPE_TITLES[doc.type] || 'Document', doc.term]
    .filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

export default function DocumentPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [branding, setBranding] = useState<Branding>({});
  const [qr, setQr] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<DocRecord>(`/api/documents/${id}`)
      .then(async (d) => {
        // Student ID cards use a dedicated CR80-sized print layout, not this
        // A4 document sheet — hand off to that page instead.
        if (d.type === 'STUDENT_ID_CARD') { navigate(`/documents/${id}/id-card`, { replace: true }); return; }
        setDoc(d);
        const verifyUrl = `${window.location.origin}/verify/${d.verifyToken}`;
        try { setQr(await QRCode.toDataURL(verifyUrl, { margin: 0, width: 240 })); } catch { /* ignore */ }
      })
      .catch(() => toast.error('Failed to load document'))
      .finally(() => setLoading(false));
    apiGet<Branding>('/api/settings').then(setBranding).catch(() => {});
  }, [id, navigate]);

  // Keep the student/term file name for the whole visit so Ctrl/Cmd+P gets it too.
  useEffect(() => {
    if (!doc) return;
    const previous = document.title;
    document.title = downloadName(doc);
    return () => { document.title = previous; };
  }, [doc]);

  const handleDownload = async () => {
    if (doc) {
      document.title = downloadName(doc);
      apiSend(`/api/documents/${doc.id}/download`, 'POST').catch(() => {});
    }
    window.print();
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading document…</div>;
  if (!doc) return <div className="py-20 text-center text-slate-500">Document not found.</div>;

  const p = doc.payload || {};
  const school = p.school || { name: branding.name };
  const student = p.student || {};
  const logoUrl = school.logoUrl || branding.logoUrl;
  const verifyBase = `${window.location.origin}/verify`;
  const cancelled = doc.status !== 'ACTIVE';
  const backPath = user?.role === 'STUDENT' ? '/student/documents' : '/documents';
  const title = TYPE_TITLES[doc.type] || 'Official Document';
  const issuer = signerName(doc.issuedByName);
  const showLevel = student.level && student.level !== student.className;
  const subjects: any[] = p.subjects || [];
  const graded = subjects.filter((s) => s.average != null);
  const ungraded = subjects.filter((s) => s.average == null).map((s) => subjectName(s.name));
  const comments: any[] = (p.comments || []).filter((c: any) => c?.comment).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0 print:min-h-0">
      {/* Action bar (hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between gap-3 print:hidden px-1">
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {user?.role === 'STUDENT' ? 'Back to My Documents' : 'Back to Documents'}
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[280px]" title={downloadName(doc)}>{downloadName(doc)}.pdf</span>
          <Button onClick={handleDownload} className="bg-primary text-primary-foreground">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* The A4 sheet */}
      <article className="official-doc relative mx-auto bg-white text-slate-900 shadow-xl flex flex-col" id="doc-sheet">
        {cancelled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[110px] font-black uppercase tracking-widest text-red-500/10 rotate-[-30deg]">{doc.status}</span>
          </div>
        )}

        {/* Letterhead */}
        <header className="flex items-center justify-between gap-6 border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xl">{(school.name || 'S')[0]}</div>
            )}
            <div className="min-w-0">
              <h1 className="text-[17px] leading-tight font-extrabold uppercase tracking-tight text-slate-900">{school.name}</h1>
              {school.address && <p className="text-[11px] text-slate-600 mt-0.5">{school.address}</p>}
              <p className="text-[11px] text-slate-600">{[school.contactEmail, school.contactPhone].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <dl className="shrink-0 text-[11px] leading-5 text-slate-600 text-right">
            <div><dt className="inline">Document No. </dt><dd className="inline font-mono text-[10px] font-semibold text-slate-900 whitespace-nowrap">{doc.documentNumber}</dd></div>
            <div><dt className="inline">Issued </dt><dd className="inline font-semibold text-slate-900">{fmtDate(doc.issueDate)}</dd></div>
            {doc.term && <div><dt className="inline">Term </dt><dd className="inline font-semibold text-slate-900">{doc.term}</dd></div>}
          </dl>
        </header>

        {/* Title */}
        <div className="text-center mt-5 mb-4">
          <h2 className="text-[22px] font-bold uppercase tracking-[0.18em] text-slate-900">{title}</h2>
        </div>

        {/* Student block */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-2.5 text-sm rounded-md border border-slate-200 px-4 py-3">
          <Field label="Student Name" value={student.name} />
          <Field label="Student ID" value={student.code} />
          <Field label="Class" value={student.className} />
          {showLevel && <Field label="Level" value={student.level} />}
          <Field label="Academic Year" value={student.academicYear} />
          {doc.term && <Field label="Term" value={doc.term} />}
          <Field label="Enrollment Status" value={titleCase(student.status)} />
        </div>

        {/* Body by type */}
        {doc.type === 'ENROLLMENT_CONFIRMATION' && (
          <p className="mt-6 text-sm leading-7 text-slate-700">
            This document confirms that <strong>{student.name}</strong> (Student ID <strong>{student.code}</strong>) is
            officially enrolled at <strong>{school.name}</strong>{student.className ? <> in <strong>{student.className}</strong></> : null}
            {student.academicYear ? <> for the academic year <strong>{student.academicYear}</strong></> : null}.
            Enrollment date: <strong>{fmtDate(student.enrollmentDate)}</strong>. Current status: <strong>{titleCase(student.status)}</strong>.
          </p>
        )}

        {doc.type === 'COMPLETION_CERTIFICATE' && (
          <div className="mt-6 text-center space-y-4 py-2">
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
          <>
            {/* Grades */}
            <section className="mt-5 od-keep">
              <div className="flex items-baseline justify-between mb-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Subject Grades</h3>
                {p.academicStatus && (
                  <p className="text-xs text-slate-600">
                    Academic status:{' '}
                    <span className={`font-bold ${p.academicStatus === 'Academic Warning' ? 'text-red-700' : p.academicStatus === 'Honor Roll' ? 'text-emerald-700' : 'text-slate-900'}`}>{p.academicStatus}</span>
                  </p>
                )}
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-y border-slate-300 text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="text-left py-1.5 pr-3 font-semibold">Subject</th>
                    <th className="od-num py-1.5 px-3 font-semibold w-28">Average</th>
                    <th className="text-center py-1.5 pl-3 font-semibold w-20">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {graded.map((s: any) => (
                    <tr key={s.subjectId} className="border-b border-slate-200">
                      <td className="py-1.5 pr-3">{subjectName(s.name)}</td>
                      <td className="od-num py-1.5 px-3">{Number(s.average).toFixed(1)}%</td>
                      <td className="py-1.5 pl-3 text-center font-bold">{s.letter || '—'}</td>
                    </tr>
                  ))}
                  {graded.length === 0 && <tr><td colSpan={3} className="py-3 text-center text-slate-500 border-b border-slate-200">No grades recorded for this term.</td></tr>}
                  <tr className="border-t-2 border-b-2 border-slate-800 font-bold bg-slate-50">
                    <td className="py-2 pr-3">{doc.type === 'TRANSCRIPT' ? 'Cumulative Average' : 'Term Average'}</td>
                    <td className="od-num py-2 px-3">{p.termAverage != null ? `${Number(p.termAverage).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 pl-3 text-center">{p.letter || '—'}</td>
                  </tr>
                </tbody>
              </table>
              {ungraded.length > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-500">Not assessed this term: {ungraded.join(', ')}.</p>
              )}
            </section>

            {/* Attendance + GED readiness */}
            <div className="mt-5 grid grid-cols-2 gap-8 od-keep">
              {p.attendance && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-300 pb-1.5 mb-1.5">Attendance Summary</h3>
                  <div className="text-sm space-y-1">
                    <Field label="Days Recorded" value={String(p.attendance.total)} inline />
                    <Field label="Present" value={String(p.attendance.present)} inline />
                    <Field label="Absent" value={String(p.attendance.absent)} inline />
                    <Field label="Late" value={String(p.attendance.late)} inline />
                    <Field label="Excused" value={String(p.attendance.excused)} inline />
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                      <span>Attendance Rate</span><span className="od-num">{p.attendance.total ? `${p.attendance.rate}%` : '—'}</span>
                    </div>
                  </div>
                </section>
              )}
              {(p.gedReadiness?.length ?? 0) > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-300 pb-1.5 mb-1.5">GED Readiness</h3>
                  <div className="text-sm space-y-1">
                    {p.gedReadiness.map((g: any) => (
                      <div key={g.subject} className="flex justify-between">
                        <span className="text-slate-600">{SUBJECT_LABELS[g.subject] || g.subject}</span>
                        <span className={`font-semibold ${READY_TONE[g.status] || 'text-slate-900'}`}>{STATUS_LABELS[g.status] || g.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Comments */}
            {comments.length > 0 && (
              <section className="mt-5 od-keep">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-300 pb-1.5 mb-1.5">Teacher Comments</h3>
                <div className="space-y-1">
                  {comments.map((c: any, i: number) => (
                    <p key={i} className="text-[13px] leading-snug text-slate-700 line-clamp-2"><span className="font-semibold text-slate-900">{subjectName(c.subject)}:</span> {c.comment}</p>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer: signature + verification, pinned to the bottom of the sheet */}
        <footer className="mt-auto pt-8 od-keep">
          <div className="flex items-end justify-between gap-8 border-t border-slate-300 pt-4">
            <div className="w-56 text-center">
              <div className="h-16 flex items-end justify-center">
                {branding.signatureUrl && <img src={branding.signatureUrl} alt="" className="max-h-16 max-w-full object-contain" />}
              </div>
              <div className="border-t border-slate-500 mt-1 pt-1 text-xs font-semibold text-slate-800">Authorized Signature</div>
              {issuer && <div className="text-[11px] text-slate-600">{issuer}</div>}
              <div className="text-[11px] text-slate-500">{fmtDate(doc.issueDate)}</div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="text-[11px] leading-4 text-slate-600">
                <p className="flex items-center gap-1 font-semibold text-slate-900"><ShieldCheck className="h-3.5 w-3.5" /> Verify this document</p>
                <p className="mt-1">Scan the code or visit</p>
                <p className="font-mono text-[10px] text-slate-900 break-all">{verifyBase}</p>
                <p className="mt-0.5">and enter document number</p>
                <p className="font-mono text-[10px] font-semibold text-slate-900 whitespace-nowrap">{doc.documentNumber}</p>
              </div>
              {qr && <img src={qr} alt="Verification QR code" className="h-[22mm] w-[22mm] shrink-0" />}
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            This is an official document of {school.name}. Any alteration renders it invalid.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value, inline }: { label: string; value?: string | null; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex justify-between">
        <span className="text-slate-600">{label}</span>
        <span className="od-num font-semibold text-slate-900">{value || '—'}</span>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 block">{label}</span>
      <span className="font-semibold text-slate-900 break-words">{value || '—'}</span>
    </div>
  );
}
