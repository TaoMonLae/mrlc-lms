import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Filter, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrintLayout } from '../../components/reports/PrintLayout';

export default function AttendanceReport() {
  const [classFilter, setClassFilter] = useState('Grade 10A');
  const [monthFilter, setMonthFilter] = useState('May 2025');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Report</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline">
             <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
           </Button>
           <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
         <div className="space-y-1.5 flex-1 min-w-[200px]">
           <label className="text-xs font-semibold text-slate-500 uppercase">Class</label>
           <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Classes">All Classes</SelectItem>
                <SelectItem value="Grade 10A">Grade 10A</SelectItem>
                <SelectItem value="Grade 10B">Grade 10B</SelectItem>
              </SelectContent>
            </Select>
         </div>
         <div className="space-y-1.5 flex-1 min-w-[200px]">
           <label className="text-xs font-semibold text-slate-500 uppercase">Month</label>
           <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="April 2025">April 2025</SelectItem>
                <SelectItem value="May 2025">May 2025</SelectItem>
                <SelectItem value="June 2025">June 2025</SelectItem>
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5">
           <Filter className="mr-2 h-4 w-4" /> Apply Filters
         </Button>
      </div>

      {/* Screen Preview */}
      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-surface-raised">
              <tr>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold">Student Name</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold">ID</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Total Days</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Present</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Absent</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Late</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-medium">Ali bin Ahmad</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised">STU-2023-001</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">20</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">15</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">5</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">0</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center font-semibold text-aubergine-600">75%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-medium">Sarah Lee</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised">STU-2023-002</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">20</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">19</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">0</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">1</td>
                <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center font-semibold text-emerald-600">95%</td>
              </tr>
            </tbody>
        </table>
      </div>

      {/* Print Layout */}
      <PrintLayout 
        title="Monthly Attendance Report" 
        preparedBy="Admin User"
        filters={{ 'Class': classFilter, 'Month': monthFilter }}
      >
        <table className="w-full text-sm text-left border-collapse mt-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 w-[30%]">Student Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-center">Days</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-center">Present</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-center">Absent</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-center">Late</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Ali bin Ahmad</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">STU-2023-001</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">20</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">15</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700 font-bold">5</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">0</td>
                <td className="px-4 py-3 border border-slate-300 text-center font-bold">75%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Sarah Lee</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">STU-2023-002</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">20</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">19</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">0</td>
                <td className="px-4 py-3 border border-slate-300 text-center text-slate-700">1</td>
                <td className="px-4 py-3 border border-slate-300 text-center font-bold">95%</td>
              </tr>
            </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 gap-6">
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">Class Average</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">85%</p>
           </div>
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">Perfect Attendance</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
           </div>
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">At Risk (&lt;80%)</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">1</p>
           </div>
        </div>
      </PrintLayout>
    </div>
  );
}
