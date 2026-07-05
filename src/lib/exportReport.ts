// Shared Excel export helper for the financial report pages.
//
// Generated entirely client-side (SheetJS/xlsx) from the same data the page
// is already rendering, so there's no server round-trip and no risk of the
// export drifting from what's on screen.
//
// PDF export is handled separately via each report page's PrintLayout +
// window.print(), for consistency with the rest of the app's report/PDF
// output (branded header/logo, signature blocks, etc.) — see
// src/components/reports/PrintLayout.tsx.
import * as XLSX from 'xlsx';

export interface ExportSection {
  /** Optional heading printed above this table (e.g. "Expenses by Category"). */
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface ExportReportOptions {
  title: string;
  /** Short line under the title, e.g. "Fiscal Year 2026" or "July 2026". */
  subtitle?: string;
  /** Filename without extension. */
  filename: string;
  /** Key/value pairs shown as a compact summary block (e.g. Total Income: RM12,000). */
  summary?: { label: string; value: string }[];
  sections: ExportSection[];
}

export function exportReportToExcel(opts: ExportReportOptions) {
  const wb = XLSX.utils.book_new();

  const header: (string | number)[][] = [[opts.title]];
  if (opts.subtitle) header.push([opts.subtitle]);
  header.push([`Generated ${new Date().toLocaleString()}`]);
  header.push([]);
  if (opts.summary && opts.summary.length) {
    opts.summary.forEach((s) => header.push([s.label, s.value]));
    header.push([]);
  }

  opts.sections.forEach((section, idx) => {
    const sheetRows: (string | number)[][] = idx === 0 ? [...header] : [];
    if (section.heading) {
      sheetRows.push([section.heading]);
    }
    sheetRows.push(section.columns);
    sheetRows.push(...section.rows);

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    // Reasonable default column widths so numbers/labels aren't clipped.
    ws['!cols'] = section.columns.map(() => ({ wch: 18 }));

    const rawName = section.heading || `Sheet ${idx + 1}`;
    const sheetName = rawName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || `Sheet ${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${opts.filename}.xlsx`);
}
