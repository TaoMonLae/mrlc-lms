import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { createReportWorkbook } from '../../src/lib/exportReport';

test('Excel report export creates a readable multi-sheet XLSX workbook', async () => {
  const bytes = await createReportWorkbook({
    title: 'Income & Expense <Report>',
    subtitle: 'Fiscal Year 2026',
    filename: 'finance-report',
    summary: [{ label: 'Net surplus', value: 'RM1,250' }],
    sections: [
      {
        heading: 'Summary / Overview',
        columns: ['Category', 'Amount'],
        rows: [['Donations & grants', 2500], ['Expenses', 1250]],
      },
      {
        heading: 'Summary / Overview',
        columns: ['Month', 'Amount'],
        rows: [['July', 1250]],
      },
    ],
  });

  assert.ok(bytes.byteLength > 0);
  const zip = await JSZip.loadAsync(bytes);
  const workbook = await zip.file('xl/workbook.xml')?.async('string');
  const firstSheet = await zip.file('xl/worksheets/sheet1.xml')?.async('string');

  assert.match(workbook || '', /name="Summary  Overview"/);
  assert.match(workbook || '', /name="Summary  Overview 2"/);
  assert.match(firstSheet || '', /Income &amp; Expense &lt;Report&gt;/);
  assert.match(firstSheet || '', /<c r="B9"><v>2500<\/v><\/c>/);
});
