import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { apiSend } from '../../lib/api';

// These must match the columns the /api/teachers/import endpoint reads.
const TEMPLATE_COLUMNS = [
  'firstName', 'lastName', 'email', 'password', 'employmentType', 'subjects', 'phone', 'joinedDate', 'baseSalary', 'teacherCode', 'notes',
];

const SAMPLE_ROWS = [
  ['Tao', 'Mon Lae', 'tao.monlae@example.com', '', 'FULL_TIME', 'Mathematics, Science', '+60123456789', '2026-01-15', '1500', '', ''],
  ['Su', 'Myat', 'su.myat@example.com', 'Welcome2026', 'VOLUNTEER', 'English', '', '2026-06-01', '', 'TCH-CUSTOM1', 'Weekend classes'],
];

/** Downloads the teacher import template CSV (headers + example rows). */
export function downloadTeacherTemplate() {
  const csv = Papa.unparse({ fields: TEMPLATE_COLUMNS, data: SAMPLE_ROWS });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teacher_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvRow { [key: string]: string }
interface RowError { row: number; message: string }
interface ImportResult { createdCount: number; failedCount: number; errors: RowError[] }

export function TeacherCsvImport({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [clientErrors, setClientErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => { setFile(null); setRows([]); setClientErrors([]); setResult(null); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setRows([]); setClientErrors([]); setResult(null);
    if (!f) return;
    Papa.parse<CsvRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const parsed = (res.data || []).filter((r) => Object.values(r).some((v) => String(v ?? '').trim()));
        const errs: RowError[] = [];
        parsed.forEach((r, i) => {
          const missing: string[] = [];
          if (!String(r.firstName || '').trim()) missing.push('firstName');
          if (!String(r.lastName || '').trim()) missing.push('lastName');
          if (!String(r.email || '').trim()) missing.push('email');
          if (missing.length) errs.push({ row: i + 2, message: `Missing ${missing.join(', ')}` });
          const employmentType = String(r.employmentType || 'FULL_TIME').trim().toUpperCase();
          if (!['FULL_TIME', 'PART_TIME', 'VOLUNTEER'].includes(employmentType)) {
            errs.push({ row: i + 2, message: 'employmentType must be FULL_TIME, PART_TIME, or VOLUNTEER' });
          }
        });
        setRows(parsed);
        setClientErrors(errs);
        if (parsed.length === 0) toast.error('No data rows found in the file.');
      },
      error: () => toast.error('Could not read the CSV file.'),
    });
  };

  const runImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await apiSend<ImportResult>('/api/teachers/import', 'POST', { rows });
      setResult(res);
      if (res.createdCount > 0) {
        toast.success(`Imported ${res.createdCount} teacher${res.createdCount === 1 ? '' : 's'}.`);
        onImported?.();
      }
      if (res.failedCount > 0) toast.warning(`${res.failedCount} row${res.failedCount === 1 ? '' : 's'} skipped.`);
    } catch (e: any) {
      toast.error(e?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.length - clientErrors.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger render={<Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>} />
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Teachers from CSV</DialogTitle>
          <DialogDescription>
            Download the template, fill in one teacher per row, then upload it here. Leave <code className="text-xs">password</code> blank to use the default <strong>Teacher123!</strong> (teacher must change it at first login), or set one to assign it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: template */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-surface-raised bg-slate-50 dark:bg-surface-raised/40 p-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-aubergine-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-slate-900 dark:text-white">Step 1 — Get the template</p>
              <p className="text-slate-500 dark:text-slate-400">
                Required columns: <code className="text-xs">firstName</code>, <code className="text-xs">lastName</code>, <code className="text-xs">email</code>. Optional: password (min 6 chars), employmentType (FULL_TIME, PART_TIME, or VOLUNTEER; defaults to FULL_TIME), subjects, phone, joinedDate, baseSalary, teacherCode, and notes.
              </p>
              <Button onClick={downloadTeacherTemplate} variant="ghost" size="sm" className="mt-1 -ml-2 text-aubergine-600">
                <Download className="mr-2 h-4 w-4" /> Download template (with example rows)
              </Button>
            </div>
          </div>

          {/* Step 2: upload */}
          <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-3">
            <p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Step 2 — Upload your filled-in file</p>
            <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />
            {file && rows.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Parsed {rows.length} row{rows.length === 1 ? '' : 's'} · {validCount} ready{clientErrors.length ? ` · ${clientErrors.length} need fixing` : ''}.
              </p>
            )}
          </div>

          {/* Client-side validation issues */}
          {clientErrors.length > 0 && !result && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/10 p-3 text-amber-800 dark:text-amber-300">
              <h4 className="flex items-center font-semibold text-sm"><AlertCircle className="mr-2 h-4 w-4" /> Fix these rows before importing:</h4>
              <ul className="mt-1 max-h-32 overflow-auto text-xs list-disc pl-5">
                {clientErrors.slice(0, 20).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </div>
          )}

          {/* Server result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {result.createdCount} imported
                {result.failedCount > 0 && <span className="text-amber-700 dark:text-amber-400">· {result.failedCount} skipped</span>}
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/10 p-3 text-amber-800 dark:text-amber-300">
                  <ul className="max-h-40 overflow-auto text-xs list-disc pl-5">
                    {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button onClick={runImport} disabled={validCount === 0 || clientErrors.length > 0 || importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import {validCount > 0 ? validCount : ''} teacher{validCount === 1 ? '' : 's'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
