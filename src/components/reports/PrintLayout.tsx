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

  return (
    <div className="hidden print:block bg-white text-black bg-none p-8 max-w-[210mm] mx-auto min-h-[297mm]">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-4">
          {brandingSettings.logoUrl ? (
            <img src={brandingSettings.logoUrl} alt={schoolProfile.name} className="h-20 w-20 object-contain" />
          ) : (
            <div className="h-20 w-20 border-2 border-slate-800 flex items-center justify-center rounded-lg font-bold text-slate-800 text-3xl">
              {schoolProfile.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{schoolProfile.name}</h1>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{schoolProfile.address}</p>
            <div className="text-sm text-slate-600 mt-1 flex gap-4">
              <span>Tel: {schoolProfile.phone}</span>
              <span>Email: {schoolProfile.email}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600 mt-1">Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          <p className="text-sm text-slate-600">A.Y. {schoolProfile.academicYear}</p>
        </div>
      </div>

      {/* Filters Summary */}
      {filters && Object.keys(filters).length > 0 && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded">
          <h3 className="text-sm font-semibold text-slate-800 mb-2 uppercase tracking-tight">Report Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(filters).map(([key, value]) => (
              <div key={key}>
                <span className="text-slate-500 font-medium">{key}:</span> <span className="text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mb-12 print-content">
        {children}
      </div>

      {/* Footer / Signatures - will be pushed to bottom or after content depending on height */}
      <div className="mt-16 pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-sm page-break-inside-avoid">
        <div className="text-center">
          <div className="border-b border-slate-400 h-16 mb-2 flex items-end justify-center pb-2">
            {preparedBy && <span className="italic text-slate-600">{preparedBy}</span>}
          </div>
          <p className="font-medium text-slate-800">Prepared By</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-slate-400 h-16 mb-2 flex items-end justify-center pb-2">
            {/* Empty for signature */}
          </div>
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
        End of Report - {schoolProfile.shortName} LMS System
      </div>

      <style>{`
        @media print {
          body {
            background: white;
            color: black;
          }
          /* Hide the main app shell when printing */
          #root > div > div:not(.print\\:block) {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          table { page-break-inside:auto }
          tr    { page-break-inside:avoid; page-break-after:auto }
          thead { display:table-header-group }
          tfoot { display:table-footer-group }
        }
      `}</style>
    </div>
  );
}
