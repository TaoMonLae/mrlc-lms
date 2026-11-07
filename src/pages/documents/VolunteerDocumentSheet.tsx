import React, { useEffect, useRef } from 'react';
import {
  formatVolunteerMonth,
  volunteerCertificateDesign,
  VOLUNTEER_DOCUMENT_TYPE_LABELS,
  type VolunteerDocumentPayload,
  type VolunteerDocumentRecord,
  type VolunteerDocumentSignature,
  type VolunteerDocumentType,
} from '@/shared/volunteerDocuments';
import { formatVolunteerIssueDate, formatVolunteerSignedAt } from '@/shared/volunteerDocumentDates';
import './volunteerDocuments.css';

export { formatVolunteerIssueDate } from '@/shared/volunteerDocumentDates';

export interface VolunteerDocumentSheetProps {
  type: VolunteerDocumentType;
  payload: VolunteerDocumentPayload;
  documentNumber?: string;
  issueDate?: string;
  verifyUrl?: string;
  qrDataUrl?: string;
  status?: VolunteerDocumentRecord['status'];
  signatures?: VolunteerDocumentSignature[];
  signingStatus?: VolunteerDocumentRecord['signingStatus'];
  draft?: boolean;
}

/** One layout powers the live draft and the issued, printable document. */
export default function VolunteerDocumentSheet({
  type, payload, documentNumber, issueDate, verifyUrl, qrDataUrl, status = 'ACTIVE', signatures = [], signingStatus, draft = false,
}: VolunteerDocumentSheetProps) {
  const certificate = type === 'VOLUNTEER_APPRECIATION_CERTIFICATE';
  const proof = type === 'PART_TIME_VOLUNTEER_CONFIRMATION';
  const volunteer = payload.volunteer;
  const name = volunteer.name || '[Volunteer’s full name]';
  const role = volunteer.role || '[Volunteer role]';
  const serviceMonth = (value: string, placeholder: string) => /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value)
    ? formatVolunteerMonth(value) : draft ? placeholder : 'Date unavailable';
  const from = serviceMonth(volunteer.fromMonth, '[Start month / year]');
  const to = serviceMonth(volunteer.toMonth, '[End month / year]');
  const dense = certificate && (volunteer.contributions.length > 450 || name.length > 65 || role.length > 65);
  const invalid = !draft && status !== 'ACTIVE';
  const pending = !draft && !invalid && payload.version === 2 && signingStatus !== 'SIGNED';
  const schoolSignature = signatures.find(signature => signature.slot === 'SCHOOL');
  const organizationSignature = signatures.find(signature => signature.slot === 'ORGANIZATION');
  const contentRef = useRef<HTMLDivElement>(null);
  const design = certificate ? volunteerCertificateDesign(payload) : 'CLASSIC';
  const hasHours = volunteer.hoursPerWeek != null || volunteer.totalHours != null;
  const signatureRow = (
    <div className={`volunteer-signatures ${payload.organizationSignatory ? '' : 'volunteer-signatures-single'}`}>
      <Signature name={payload.signatory.name} title={payload.signatory.title} organization={payload.school.name} signature={schoolSignature} draft={draft} signingRequested={payload.version === 2} />
      {payload.organizationSignatory && <Signature name={payload.organizationSignatory.name} title={payload.organizationSignatory.title} organization={payload.organization.name} signature={organizationSignature} uploadedSignature={payload.organizationSignatory.uploadedSignature} draft={draft} signingRequested={payload.version === 2} />}
    </div>
  );
  const record = (
    <div className="volunteer-footer-record">
      <p><strong>{documentNumber || 'Document number assigned on issue'}</strong></p>
      <p>Issued: {formatVolunteerIssueDate(issueDate)}</p>
      {invalid && <p className="volunteer-invalid-status">{status === 'CANCELLED' ? 'Cancelled · no longer valid' : 'Reissued · superseded by a newer record'}</p>}
      {pending && <p className="volunteer-invalid-status">Awaiting signatures · not yet valid</p>}
      {!certificate && <p>{[payload.school.contactEmail, payload.school.contactPhone].filter(Boolean).join(' · ')}</p>}
    </div>
  );
  const verification = (
    <div className="volunteer-verification-block">
      {draft ? <div className="volunteer-qr-placeholder" aria-hidden="true">QR</div> : qrDataUrl ? <img className="volunteer-qr" src={qrDataUrl} alt="Scan to verify this document" /> : null}
      <div><p className="volunteer-verification-title">{draft ? 'Verification available after issue' : 'Verify this document'}</p>
        <p>{draft ? 'A unique QR code and document number will be added.' : 'Scan the QR code to check the current record.'}</p>
        {!draft && verifyUrl && <a className="volunteer-verify-url" href={verifyUrl}>{verifyUrl}</a>}
      </div>
    </div>
  );
  const issuers = (
    <>
      {payload.school.logoUrl && <img className="volunteer-school-logo" src={payload.school.logoUrl} alt="School logo" />}
      <div className="volunteer-issuers">
        <p className="volunteer-organization">{payload.organization.name}</p>
        <p className="volunteer-school">{payload.school.name}</p>
        <p className="volunteer-program">{payload.school.program}</p>
      </div>
    </>
  );
  const recognition = <>In recognition of your dedicated volunteer service as <strong>{role}</strong> supporting {payload.school.name} ({payload.school.program}) with {payload.organization.name}.</>;
  const thanks = 'Thank you for sharing your time, skills and care with our learning community.';

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const fit = () => {
      // Transform leaves scrollHeight unchanged, so every measurement uses
      // the original content height rather than repeatedly shrinking it.
      const available = content.clientHeight;
      const required = content.scrollHeight;
      const scale = available > 0 && required > available + 1 ? available / required : 1;
      // beforeprint may capture the DOM before React's next render commits.
      content.style.transform = `scale(${scale})`;
    };
    fit();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(content);
    let active = true;
    document.fonts?.ready.then(() => { if (active) fit(); });
    content.addEventListener('load', fit, true);
    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', fit);
    return () => {
      active = false; observer?.disconnect();
      content.removeEventListener('load', fit, true);
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', fit);
    };
  }, [type, payload, documentNumber, issueDate, verifyUrl, qrDataUrl, draft, status, signatures, signingStatus]);

  return (
    <div className={`volunteer-document-frame ${certificate ? 'volunteer-landscape' : 'volunteer-portrait'}`}>
      <article className={`volunteer-sheet report-print ${certificate ? `volunteer-certificate volunteer-design-${design.toLowerCase()}` : 'volunteer-letter'} ${dense ? 'volunteer-dense' : ''} ${name.length > 100 ? 'volunteer-long-name' : ''} ${!certificate && volunteer.contributions.length > 800 ? 'volunteer-dense-letter' : ''}`} aria-label={`${draft ? 'Draft ' : ''}${VOLUNTEER_DOCUMENT_TYPE_LABELS[type]}`}>
        {invalid && <div className="volunteer-watermark" aria-hidden="true">{status}</div>}
        {pending && <div className="volunteer-watermark volunteer-pending-watermark" aria-hidden="true">AWAITING SIGNATURES</div>}
        {draft && <div className="volunteer-draft-label">DRAFT · NOT ISSUED</div>}
        {design === 'WOVEN' && <><div className="volunteer-woven-band volunteer-woven-top" aria-hidden="true" /><div className="volunteer-woven-band volunteer-woven-bottom" aria-hidden="true" /></>}
        <div className="volunteer-sheet-content" ref={contentRef}>
        {design === 'REGISTRY' ? (
          <div className="volunteer-registry">
            <div className="volunteer-registry-head">
              <div className="volunteer-registry-issuers">{issuers}</div>
              <div className="volunteer-registry-title"><h1 className="volunteer-certificate-title">Certificate of Appreciation</h1><p>Issued {formatVolunteerIssueDate(issueDate)}</p></div>
            </div>
            <div className="volunteer-registry-row"><p className="volunteer-registry-label">Awarded to</p><div className="volunteer-registry-cell"><h2 className="volunteer-recipient">{name}</h2></div></div>
            <div className="volunteer-registry-row volunteer-registry-grow"><p className="volunteer-registry-label">In recognition</p><div className="volunteer-registry-cell">
              <p className="volunteer-certificate-copy">{recognition}</p>
              {volunteer.contributions && <p className="volunteer-contributions">{volunteer.contributions}</p>}
              <p className="volunteer-thanks">{thanks}</p>
            </div></div>
            <div className="volunteer-registry-row"><p className="volunteer-registry-label">Service</p><dl className="volunteer-registry-facts">
              <div><dt>From</dt><dd>{from}</dd></div>
              <div><dt>To</dt><dd>{to}</dd></div>
              {volunteer.hoursPerWeek != null && <div><dt>Hours per week</dt><dd>{volunteer.hoursPerWeek}</dd></div>}
              {volunteer.totalHours != null && <div><dt>Total hours</dt><dd>{volunteer.totalHours}</dd></div>}
            </dl></div>
            <div className="volunteer-registry-foot">
              {signatureRow}
              <div className="volunteer-registry-verify">{verification}{record}</div>
            </div>
          </div>
        ) : design === 'EDITORIAL' ? (
          <div className="volunteer-editorial">
            <aside className="volunteer-editorial-band">
              <div className="volunteer-editorial-issuers">{issuers}</div>
              <p className="volunteer-editorial-mark">Volunteer<br />service</p>
            </aside>
            <div className="volunteer-editorial-main">
              <h1 className="volunteer-certificate-title">Certificate of Appreciation</h1>
              <p className="volunteer-presented">Presented with gratitude to</p>
              <h2 className="volunteer-recipient">{name}</h2>
              <p className="volunteer-certificate-copy">{recognition}</p>
              {volunteer.contributions && <p className="volunteer-contributions">{volunteer.contributions}</p>}
              <dl className="volunteer-editorial-facts">
                <div><dt>From</dt><dd>{from}</dd></div>
                <div><dt>To</dt><dd>{to}</dd></div>
                {hasHours && <div><dt>Hours</dt><dd>{[volunteer.hoursPerWeek != null ? `${volunteer.hoursPerWeek} / week` : null, volunteer.totalHours != null ? `${volunteer.totalHours} total` : null].filter(Boolean).join(' · ')}</dd></div>}
              </dl>
              <p className="volunteer-thanks">{thanks}</p>
              {signatureRow}
              <footer className="volunteer-sheet-footer">{record}{verification}</footer>
            </div>
          </div>
        ) : <>
        <header className="volunteer-sheet-header">{issuers}</header>

        {certificate ? (
          <div className="volunteer-certificate-body">
            <h1 className="volunteer-certificate-title">Certificate of Appreciation</h1>
            <p className="volunteer-presented">Presented with gratitude to</p>
            <h2 className="volunteer-recipient">{name}</h2>
            <p className="volunteer-certificate-copy">In recognition of your dedicated volunteer service as <strong>{role}</strong><br />
              supporting {payload.school.name} ({payload.school.program})<br />
              with {payload.organization.name}.</p>
            <ServicePeriod from={from} to={to} />
            {volunteer.contributions && <p className="volunteer-contributions">{volunteer.contributions}</p>}
            <ServiceHours hoursPerWeek={volunteer.hoursPerWeek} totalHours={volunteer.totalHours} />
            <p className="volunteer-thanks">{thanks}</p>
          </div>
        ) : (
          <div className="volunteer-letter-body">
            <div className="volunteer-letter-meta"><span>Reference: {documentNumber || 'Assigned on issue'}</span><span>{formatVolunteerIssueDate(issueDate)}</span></div>
            <h1 className="volunteer-letter-title">{VOLUNTEER_DOCUMENT_TYPE_LABELS[type]}</h1>
            <p>{proof ? 'To whom it may concern,' : `Dear ${name},`}</p>
            {proof ? (
              <>
                <p>This letter confirms that <strong>{name}</strong> provided <strong>part-time volunteer service</strong> as <strong>{role}</strong> at <strong>{payload.school.name} ({payload.school.program})</strong>, with <strong>{payload.organization.name}</strong>, during the service period below.</p>
                <ServicePeriod from={from} to={to} />
                {volunteer.contributions && <><h2 className="volunteer-letter-subtitle">Volunteer responsibilities and contributions</h2><p className="volunteer-contributions">{volunteer.contributions}</p></>}
                <ServiceHours hoursPerWeek={volunteer.hoursPerWeek} totalHours={volunteer.totalHours} />
                <p>This confirmation records voluntary service in support of our educational activities. It does not certify paid employment or an employment relationship.</p>
                <p>The document number and QR code below may be used to verify this record and its current status.</p>
              </>
            ) : (
              <>
                <p>On behalf of <strong>{payload.organization.name}</strong> and <strong>{payload.school.name} ({payload.school.program})</strong>, thank you for your volunteer service as <strong>{role}</strong>.</p>
                <ServicePeriod from={from} to={to} />
                {volunteer.contributions && <p className="volunteer-contributions">{volunteer.contributions}</p>}
                <ServiceHours hoursPerWeek={volunteer.hoursPerWeek} totalHours={volunteer.totalHours} />
                <p>Your willingness to give your time and share your skills supports our students and the work of our learning centre. We appreciate the contribution you have made to our community.</p>
                <p>Please accept this letter as a record of our thanks and appreciation. We wish you every success in your future endeavours.</p>
              </>
            )}
            <p className="volunteer-salutation">With appreciation,</p>
          </div>
        )}

        {signatureRow}

        <footer className="volunteer-sheet-footer">{record}{verification}</footer>
        </>}
        </div>
      </article>
    </div>
  );
}

function ServicePeriod({ from, to }: { from: string; to: string }) {
  return <dl className="volunteer-service-period"><div><dt>From</dt><dd>{from}</dd></div><div><dt>To</dt><dd>{to}</dd></div></dl>;
}

function ServiceHours({ hoursPerWeek, totalHours }: { hoursPerWeek: number | null; totalHours: number | null }) {
  if (hoursPerWeek == null && totalHours == null) return null;
  return <p className="volunteer-service-hours">{[
    hoursPerWeek == null ? null : `${hoursPerWeek} hours per week`,
    totalHours == null ? null : `${totalHours} total volunteer hours`,
  ].filter(Boolean).join(' · ')}</p>;
}

function Signature({ name, title, organization, signature, uploadedSignature, draft, signingRequested }: {
  name: string;
  title: string;
  organization: string;
  signature?: VolunteerDocumentSignature;
  uploadedSignature?: NonNullable<VolunteerDocumentPayload['organizationSignatory']>['uploadedSignature'];
  draft: boolean;
  signingRequested: boolean;
}) {
  return <div className="volunteer-signature">
    <div className="volunteer-signature-marks">
      {uploadedSignature && <img className="volunteer-signature-image" data-volunteer-signature src={uploadedSignature.imageDataUrl} alt={`Uploaded signature of ${name}`} />}
      {signature && <img className="volunteer-signature-image" data-volunteer-signature src={signature.imageDataUrl} alt={`Signature of ${signature.signerName}`} />}
    </div>
    <div className="volunteer-signature-line" />
    <p className="volunteer-signature-name">{signature?.signerName || name || '[Authorized signatory]'}</p>
    <p>{signature?.signerTitle || title || '[Position / title]'}</p>
    <p className="volunteer-signature-organization">{organization}</p>
    {signature ? <p className="volunteer-signature-audit">Digitally signed<br /><time dateTime={signature.signedAt}>{formatVolunteerSignedAt(signature.signedAt)}</time></p>
      : uploadedSignature ? <p className="volunteer-signature-audit">MRO signature supplied by administrator{!draft && <><br />Uploaded <time dateTime={uploadedSignature.uploadedAt}>{formatVolunteerSignedAt(uploadedSignature.uploadedAt)}</time></>}</p>
      : signingRequested && <p className="volunteer-signature-audit">{draft ? 'Signature added by the authorized account' : 'Awaiting authorized signature'}</p>}
  </div>;
}
