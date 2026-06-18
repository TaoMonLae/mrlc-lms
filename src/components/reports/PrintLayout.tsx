import React, { ReactNode } from 'react';
import { useSettings } from '../../providers/SettingsProvider';
import { format } from 'date-fns';

interface PrintLayoutProps {
  children: ReactNode;
  title: string;
  filters?: Record<string, string>;
  preparedBy?: string;
}

export function PrintLayout({ children, title, filters, preparedBy }: PrintLayoutProps) {
  const { schoolProfile, brandingSettings } = useSettings();

  const accent = brandingSettings.primaryColor || '#7a3dff';
  const logo = brandingSettings.pdfLogoUrl || brandingSettings.logoUrl;

  return (
    <div
      className="report-print hidden print:block bg-white text-black p-8 mx-auto"
      style={{ ['--report-accent' as string]: accent }}
    >
      {/* Header */}
      <div className="report-header flex items-start justify-between pb-5 mb-6">
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt={schoolProfile.name} className="h-20 w-20 object-contain" />
          ) : (
            <div
              className="h-20 w-20 flex items-center justify-center rounded-xl font-bold text-3xl text-white"
              style={{ background: 'var(--report-accent)' }}
            >
              {schoolProfile.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="report-school text-2xl font-bold uppercase tracking-wide">{schoolProfile.name}</h1>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{schoolProfile.address}</p>
            <div className="text-sm text-slate-600 mt-1 flex gap-4">
              {schoolProfile.phone && <span>Tel: {schoolProfile.phone}</span>}
              {schoolProfile.email && <span>Email: {schoolProfile.email}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="report-title-badge">{title}</span>
          <p className="text-sm text-slate-600 mt-2">Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          <p className="text-sm text-slate-600">A.Y. {schoolProfile.academicYear}</p>
        </div>
      </div>

      {/* Filters Summary */}
      {filters && Object.keys(filters).length > 0 && (
        <div className="report-params mb-6 px-4 py-3 rounded-lg">
          <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--report-accent)' }}>
            Report Parameters
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            {Object.entries(filters).map(([key, value]) => (
              <div key={key}>
                <span className="text-slate-500 font-medium">{key}:</span>{' '}
                <span className="text-slate-900 font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mb-12 print-content">{children}</div>

      {/* Footer / Signatures */}
      <div className="mt-16 pt-8 grid grid-cols-3 gap-8 text-sm page-break-inside-avoid report-signatures">
        <div className="text-center">
          <div className="border-b border-slate-400 h-16 mb-2 flex items-end justify-center pb-2">
            {preparedBy && <span className="italic text-slate-600">{preparedBy}</span>}
          </div>
          <p className="font-medium text-slate-800">Prepared By</p>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 h-16 mb-2 flex items-end justify-center pb-2" />
          <p className="font-medium text-slate-800">Verified By</p>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 h-16 mb-2 flex items-end justify-center pb-2">
            {brandingSettings.signatureUrl ? (
              <img src={brandingSettings.signatureUrl} alt="Signature" className="h-12 object-contain" />
            ) : (
              <span className="italic text-slate-600">{schoolProfile.principalName}</span>
            )}
          </div>
          <p className="font-medium text-slate-800">Principal / Administrator</p>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-8">
        End of Report &middot; {schoolProfile.shortName} LMS
      </div>

      <style>{`
        /* ----- Brand theming + neat tables (screen-agnostic; only shown in print) ----- */
        .report-print { max-width: 210mm; }

        .report-header {
          border-bottom: 3px solid var(--report-accent);
        }
        .report-school { color: var(--report-accent); }

        .report-title-badge {
          display: inline-block;
          background: var(--report-accent);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 8px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .report-params {
          background: color-mix(in srgb, var(--report-accent) 7%, white);
          border: 1px solid color-mix(in srgb, var(--report-accent) 28%, white);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Neat, themed tables for every report */
        .report-print .print-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 4px;
        }
        .report-print .print-content thead th {
          background: var(--report-accent) !important;
          color: #ffffff !important;
          font-weight: 600;
          text-align: left;
          padding: 9px 12px;
          border: 1px solid var(--report-accent);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-print .print-content tbody td {
          padding: 8px 12px;
          border: 1px solid #d9d4e8;
          color: #1f2937;
        }
        .report-print .print-content tbody tr:nth-child(even) td {
          background: #f6f4fc;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-print .print-content tbody tr:hover td { background: transparent; }

        @media print {
          /* Isolate the report: hide everything, then reveal only this layout.
             Uses visibility (not display) so descendants can be shown again
             even though ancestors like the app shell are hidden. */
          body * { visibility: hidden; }
          .report-print, .report-print * { visibility: visible; }
          .report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
          }

          body { background: #ffffff; }

          @page {
            size: A4;
            margin: 14mm;
          }

          .page-break-inside-avoid { page-break-inside: avoid; }

          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
}
