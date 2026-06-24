import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, ShieldAlert, Loader2 } from 'lucide-react';

interface VerifyResult {
  valid: boolean;
  status: string;
  documentNumber: string;
  documentType: string;
  studentName: string;
  term: string | null;
  issueDate: string;
  school: { name: string; logoUrl: string | null };
  cancelledReason: string | null;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

export default function VerifyDocument() {
  const { token } = useParams();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/verify/${token}`)
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return; }
        setResult(await r.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
          {result?.school.logoUrl ? (
            <img src={result.school.logoUrl} alt="" className="h-10 w-10 object-contain bg-white/10 rounded p-1" />
          ) : (
            <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center font-bold">{(result?.school.name || 'S')[0]}</div>
          )}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">{result?.school.name || 'Document Verification'}</p>
            <p className="text-[11px] text-slate-300">Official Document Verification</p>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="py-10 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Verifying…</div>
          )}

          {!loading && (notFound || !result) && (
            <div className="py-8 text-center">
              <ShieldX className="h-14 w-14 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900">Document Not Found</h2>
              <p className="text-sm text-slate-500 mt-1">No document matches this verification link. It may be invalid or mistyped.</p>
            </div>
          )}

          {!loading && result && (
            <>
              <div className="text-center mb-6">
                {result.valid ? (
                  <>
                    <ShieldCheck className="h-14 w-14 text-emerald-500 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-emerald-700">Valid Document</h2>
                    <p className="text-sm text-slate-500">This is an authentic document issued by {result.school.name}.</p>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-14 w-14 text-amber-500 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-amber-700">{result.status === 'CANCELLED' ? 'Cancelled Document' : 'Superseded Document'}</h2>
                    <p className="text-sm text-slate-500">
                      {result.status === 'CANCELLED'
                        ? 'This document has been cancelled and is no longer valid.'
                        : 'This document has been reissued; a newer version exists.'}
                    </p>
                    {result.cancelledReason && <p className="text-xs text-slate-400 mt-1">Reason: {result.cancelledReason}</p>}
                  </>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                <Row label="Document Number" value={result.documentNumber} mono />
                <Row label="Document Type" value={result.documentType} />
                <Row label="Issued To" value={result.studentName} />
                {result.term && <Row label="Term / Period" value={result.term} />}
                <Row label="Issue Date" value={fmtDate(result.issueDate)} />
                <Row label="Status" value={result.status} />
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-5">
                Only non-sensitive verification details are shown. Grades and personal records are never disclosed on this page.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
