// Shared PDF/Excel export helpers for the financial report pages.
//
// Both formats are generated entirely client-side (jsPDF + jspdf-autotable
// for PDF, SheetJS/xlsx for Excel) from the same data the page is already
// rendering, so there's no server round-trip and no risk of the export
// drifting from what's on screen.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function exportReportToPdf(opts: ExportReportOptions) {
  const doc = new jsPDF();
  const marginLeft = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(opts.title, marginLeft, y);
  y += 6;

  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(opts.subtitle, marginLeft, y);
    y += 5;
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginLeft, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  if (opts.summary && opts.summary.length) {
    autoTable(doc, {
      startY: y,
      body: opts.summary.map((s) => [s.label, s.value]),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { textColor: [100, 116, 139] },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: marginLeft, right: marginLeft },
      tableWidth: pageWidth - marginLeft * 2,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  opts.sections.forEach((section) => {
    // Start a new page if a section heading would land too close to the bottom.
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 16;
    }
    if (section.heading) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(section.heading, marginLeft, y);
      y += 6;
    }
    autoTable(doc, {
      startY: y,
      head: [section.columns],
      body: section.rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2 },
      margin: { left: marginLeft, right: marginLeft },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  });

  doc.save(`${opts.filename}.pdf`);
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
