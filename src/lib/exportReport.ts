// Shared Excel export helper for the financial report pages.
//
// Generated entirely client-side from the same data the page
// is already rendering, so there's no server round-trip and no risk of the
// export drifting from what's on screen.
//
// PDF export is handled separately via each report page's PrintLayout +
// window.print(), for consistency with the rest of the app's report/PDF
// output (branded header/logo, signature blocks, etc.) — see
// src/components/reports/PrintLayout.tsx.
import JSZip from 'jszip';

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number) {
  let name = '';
  for (let current = index + 1; current > 0; current = Math.floor((current - 1) / 26)) {
    name = String.fromCharCode(65 + ((current - 1) % 26)) + name;
  }
  return name;
}

function sheetXml(rows: (string | number)[][], columnCount: number) {
  const xmlRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`;
      }
      const text = escapeXml(String(value ?? ''));
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const columns = Array.from({ length: Math.max(1, columnCount) }, (_, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="18" customWidth="1"/>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columns}</cols><sheetData>${xmlRows}</sheetData></worksheet>`;
}

function uniqueSheetName(rawName: string, used: Set<string>) {
  const base = rawName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const marker = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - marker.length)}${marker}`;
  }
  used.add(candidate);
  return candidate;
}

/** Build a standards-compliant XLSX archive without the unmaintained SheetJS npm package. */
export async function createReportWorkbook(opts: ExportReportOptions): Promise<Uint8Array> {
  const zip = new JSZip();
  const header: (string | number)[][] = [[opts.title]];
  if (opts.subtitle) header.push([opts.subtitle]);
  header.push([`Generated ${new Date().toLocaleString()}`]);
  header.push([]);
  if (opts.summary && opts.summary.length) {
    opts.summary.forEach((s) => header.push([s.label, s.value]));
    header.push([]);
  }

  const usedNames = new Set<string>();
  const sheets = opts.sections.map((section, idx) => {
    const sheetRows: (string | number)[][] = idx === 0 ? [...header] : [];
    if (section.heading) {
      sheetRows.push([section.heading]);
    }
    sheetRows.push(section.columns);
    sheetRows.push(...section.rows);

    const rawName = section.heading || `Sheet ${idx + 1}`;
    return {
      name: uniqueSheetName(rawName, usedNames),
      rows: sheetRows,
      columnCount: Math.max(section.columns.length, ...sheetRows.map((row) => row.length)),
    };
  });

  const contentTypes = sheets.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentTypes}</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);

  const workbookSheets = sheets.map((sheet, index) =>
    `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join('');
  zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`);
  const workbookRels = sheets.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');
  zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>`);
  const worksheetFolder = zip.folder('xl')?.folder('worksheets');
  sheets.forEach((sheet, index) => {
    worksheetFolder?.file(`sheet${index + 1}.xml`, sheetXml(sheet.rows, sheet.columnCount));
  });

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function exportReportToExcel(opts: ExportReportOptions) {
  const workbook = await createReportWorkbook(opts);
  const blob = new Blob([workbook as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${opts.filename}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
