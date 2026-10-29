import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Loader2, ShieldCheck, ShieldX, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatVolunteerMonth, type VolunteerDocumentVerification } from '@/shared/volunteerDocuments';
import { formatVolunteerIssueDate, formatVolunteerSignedAt } from '@/shared/volunteerDocumentDates';

export default function VerifyVolunteerDocument() {
  const { token } = useParams();
  const [result, setResult] = useState<VolunteerDocumentVerification | null>(null);
  const [state, setState] = useState<'loading' | 'found' | 'not-found' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setState('loading');
    if (!token) { setState('not-found'); return; }
    fetch(`/api/verify/volunteer/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 404) { if (!controller.signal.aborted) setState('not-found'); return; }
        if (!response.ok) throw new Error('Verification unavailable');
        const data: VolunteerDocumentVerification = await response.json();
        if (!controller.signal.aborted) { setResult(data); setState('found'); }
      })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [token, attempt]);

  const awaitingSignatures = result?.status === 'ACTIVE' && result.signingStatus === 'PENDING';
  const verificationHeading = result?.valid ? 'Verified volunteer document'
    : result?.status === 'CANCELLED' ? 'Document cancelled'
    : result?.status === 'REISSUED' ? 'Document superseded'
    : awaitingSignatures ? 'Awaiting authorized signatures' : 'Document not verified';
  const verificationDescription = result?.valid ? 'This document matches the issuing organization’s active record.'
    : awaitingSignatures ? 'This record has been prepared but is not yet valid. The assigned signatories must complete their signatures.'
    : 'This record is not valid. Contact the issuing organization for an updated document.';
  const serviceMonth = (value: string) => /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value) ? formatVolunteerMonth(value) : 'Date unavailable';

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-xl overflow-hidden rounded-sm border border-border bg-card">
        <header className="bg-[#0c2538] px-6 py-6 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">{result?.organization.name || 'Mon Refugee Organization'}</p>
          <h1 className="mt-2 text-xl font-semibold">{result?.school.name || 'Mon Refugee Learning Centre'}</h1>
          <p className="mt-1 text-sm text-white/75">{result?.school.program || 'GED Program'} · Document verification</p>
        </header>
        <div className="px-6 py-8 sm:px-8" aria-live="polite">
          {state === 'loading' && <div className="py-10 text-center" role="status"><Loader2 className="mx-auto mb-3 size-8 animate-spin text-muted-foreground" /><p>Checking document status…</p></div>}
          {state === 'not-found' && <div className="py-8 text-center"><ShieldX className="mx-auto mb-4 size-12 text-destructive" /><h2 className="text-xl font-semibold">Document not found</h2><p className="mt-2 text-sm text-muted-foreground">No issued volunteer document matches this link. Check the address or scan the QR code on the original document.</p></div>}
          {state === 'error' && <div className="py-8 text-center"><ShieldAlert className="mx-auto mb-4 size-12 text-amber-600" /><h2 className="text-xl font-semibold">Unable to verify right now</h2><p className="mt-2 text-sm text-muted-foreground">The verification service could not be reached. This does not determine whether the document is valid.</p><Button className="mt-5" variant="outline" onClick={() => setAttempt(n => n + 1)}><RefreshCw className="mr-2 size-4" />Try again</Button></div>}
          {state === 'found' && result && <>
            <div className="mb-7 flex items-start gap-3">
              {result.valid ? <ShieldCheck className="mt-1 size-9 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-1 size-9 shrink-0 text-amber-600" />}
              <div><h2 className="text-xl font-semibold">{verificationHeading}</h2><p className="mt-1 text-sm text-muted-foreground">{verificationDescription}</p></div>
            </div>
            <dl className="divide-y divide-border border-y border-border text-sm">
              <VerificationRow label="Issued to" value={result.recipientName} />
              <VerificationRow label="Document" value={result.documentType} />
              <VerificationRow label="Volunteer role" value={result.role} />
              <VerificationRow label="From" value={serviceMonth(result.fromMonth)} />
              <VerificationRow label="To" value={serviceMonth(result.toMonth)} />
              {result.hoursPerWeek != null && <VerificationRow label="Hours per week" value={String(result.hoursPerWeek)} />}
              {result.totalHours != null && <VerificationRow label="Total volunteer hours" value={String(result.totalHours)} />}
              <VerificationRow label="Document number" value={result.documentNumber} />
              <VerificationRow label="Issued on" value={formatVolunteerIssueDate(result.issueDate)} />
              <VerificationRow label="Status" value={result.valid ? 'Active' : result.status === 'CANCELLED' ? 'Cancelled' : result.status === 'REISSUED' ? 'Reissued' : awaitingSignatures ? 'Awaiting signatures' : 'Not verified'} />
              <VerificationRow label="Digital signatures" value={result.signingStatus === 'SIGNED' ? 'Complete' : result.signingStatus === 'PENDING' ? 'Pending' : 'Not recorded for this document'} />
            </dl>
            {Boolean(result.signatures?.length) && <section className="mt-6" aria-labelledby="volunteer-verified-signatures">
              <h3 id="volunteer-verified-signatures" className="text-sm font-semibold">Recorded signatories</h3>
              <ul className="mt-3 space-y-4">
                {result.signatures!.map(signature => <li key={signature.slot} className="border-l-2 border-academic-teal pl-3 text-sm">
                  <p className="font-semibold">{signature.signerName}</p>
                  <p className="text-muted-foreground">{signature.signerTitle} · {signature.slot === 'SCHOOL' ? result.school.name : result.organization.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Signed <time dateTime={signature.signedAt}>{formatVolunteerSignedAt(signature.signedAt)}</time></p>
                </li>)}
              </ul>
            </section>}
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Compare the recipient, service period and document number above with the original. Verification confirms the recorded volunteer service; it does not certify academic qualifications or paid employment.</p>
          </>}
        </div>
      </section>
    </main>
  );
}

function VerificationRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-5"><dt className="shrink-0 text-muted-foreground sm:w-36">{label}</dt><dd className="min-w-0 break-words font-medium">{value}</dd></div>;
}
