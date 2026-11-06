import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import QRCode from 'qrcode';
import { ArrowLeft, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import type { VolunteerDocumentRecord } from '@/shared/volunteerDocuments';
import VolunteerDocumentSheet from './VolunteerDocumentSheet';

export default function VolunteerDocumentPrint() {
  const { id } = useParams();
  const [document, setDocument] = useState<VolunteerDocumentRecord | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setDocument(null); setQr(''); setError(''); setPrintError('');
    if (!id) { setLoading(false); setError('This document link is incomplete.'); return; }
    apiGet<VolunteerDocumentRecord>(`/api/volunteer-documents/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async record => {
        const dataUrl = await QRCode.toDataURL(record.verifyUrl, { margin: 4, width: 320, errorCorrectionLevel: 'M' });
        if (controller.signal.aborted) return;
        setDocument(record); setQr(dataUrl);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load this document.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);

  const printDocument = async () => {
    if (printing) return;
    setPrinting(true); setPrintError('');
    const currentPage = pageRef.current;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const images = [...(pageRef.current?.querySelectorAll<HTMLImageElement>('.volunteer-sheet img') || [])];
      await Promise.race([
        Promise.all([
          window.document.fonts.ready,
          ...images.map(async image => {
            try { await image.decode(); } catch {
              if (image.hasAttribute('data-volunteer-signature') || image.classList.contains('volunteer-qr')) {
                throw new Error('A signature or verification QR code could not load. Refresh the document before printing.');
              }
            }
          }),
        ]),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('The document is still loading. Wait a moment, then try printing again.')), 10000); }),
      ]);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (!currentPage || pageRef.current !== currentPage || currentPage.dataset.documentId !== document?.id) return;
      window.print();
    } catch (cause) {
      setPrintError(cause instanceof Error ? cause.message : 'Unable to prepare the document for printing.');
    } finally {
      clearTimeout(timeout); setPrinting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" /> Loading document…</div>;
  if (!document || error) return <div className="mx-auto max-w-lg space-y-4 px-6 py-24 text-center"><h1 className="text-xl font-semibold">Document unavailable</h1><p className="text-sm text-muted-foreground" role="alert">{error || 'This document could not be found.'}</p><div className="flex justify-center gap-3"><Button variant="outline" onClick={() => setAttempt(n => n + 1)}><RefreshCw className="mr-2 size-4" />Retry</Button><Link className={buttonVariants()} to="/documents/volunteers">Back to volunteer documents</Link></div></div>;
  const landscape = document.type === 'VOLUNTEER_APPRECIATION_CERTIFICATE';

  return (
    <main className="volunteer-print-page" ref={pageRef} data-document-id={document.id}>
      <div className="volunteer-print-toolbar">
        <Link className={buttonVariants({ variant: 'ghost' })} to="/documents/volunteers"><ArrowLeft className="mr-2 size-4" />Volunteer documents</Link>
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-600">A4 · {landscape ? 'Landscape' : 'Portrait'}</span><Button onClick={() => void printDocument()} disabled={!qr || printing}>{printing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}{printing ? 'Preparing document…' : 'Print / Save PDF'}</Button></div>
      </div>
      {document.status !== 'ACTIVE' && <p className="volunteer-print-notice" role="alert">This document is {document.status.toLowerCase()} and is no longer valid. The verification page shows its current status.</p>}
      {document.status === 'ACTIVE' && document.payload.version === 2 && document.signingStatus !== 'SIGNED' && <p className="volunteer-print-notice" role="status">Awaiting signatures. This document is not yet valid. Each assigned signatory must sign using their own MRLC account.</p>}
      {printError && <p className="volunteer-print-notice" role="alert">{printError}</p>}
      <VolunteerDocumentSheet type={document.type} payload={document.payload} documentNumber={document.documentNumber} issueDate={document.issueDate} verifyUrl={document.verifyUrl} qrDataUrl={qr} status={document.status} signatures={document.signatures} signingStatus={document.signingStatus} />
      <p className="volunteer-print-help">Choose “Save as PDF” in the print dialog. Use A4 paper, {landscape ? 'landscape' : 'portrait'} orientation, and disable browser headers and footers.</p>
    </main>
  );
}
