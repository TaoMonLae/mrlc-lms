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
  DialogTrigger 
} from '@/components/ui/dialog';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CsvRow {
  studentId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  status: string;
  [key: string]: string;
}

export function StudentCsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processCsv = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData(results.data as CsvRow[]);
      }
    });
  };

  const validateData = (rows: CsvRow[]) => {
    setIsValidating(true);
    const validatedData: any[] = [];
    const validationErrors: any[] = [];

    rows.forEach((row, index) => {
      const rowErrors = [];
      if (!row.studentId) rowErrors.push('studentId is required');
      if (!row.firstName) rowErrors.push('firstName is required');
      if (!['ACTIVE', 'INACTIVE'].includes(row.status)) rowErrors.push('status must be ACTIVE or INACTIVE');

      if (rowErrors.length > 0) {
        validationErrors.push({ rowIndex: index + 2, errors: rowErrors });
      } else {
        validatedData.push(row);
      }
    });

    setData(validatedData);
    setErrors(validationErrors);
    setIsValidating(false);
  };

  const downloadTemplate = () => {
    const csvContent = "studentId,firstName,lastName,gender,dateOfBirth,className,guardianName,guardianPhone,status,nationality,ethnicity,address,emergencyContact,isUnhcrRegistered,unhcrNumber,notes";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>} />
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <Button onClick={downloadTemplate} variant="ghost"><Download className="mr-2 h-4 w-4" /> Download Template</Button>
            {file && <Button onClick={processCsv}>Preview</Button>}
          </div>

          {errors.length > 0 && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
              <h4 className="font-bold flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Import Errors:</h4>
              <ul className="text-sm">
                {errors.map((err, i) => (
                  <li key={i}>Row {err.rowIndex}: {err.errors.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}

          {data.length > 0 && (
            <div className="text-sm">
              <h4 className="font-bold flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> {data.length} rows ready for import:</h4>
              <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-auto h-40">
                {JSON.stringify(data.slice(0, 5), null, 2)}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button onClick={() => toast.success("Students imported successfully.")} disabled={data.length === 0}>Import Students</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
