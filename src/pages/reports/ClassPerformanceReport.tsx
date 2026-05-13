import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, FileSpreadsheet, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrintLayout } from '../../components/reports/PrintLayout';

export default function ClassPerformanceReport() {
  const [termFilter, setTermFilter] = useState('Term 1 - 2025');

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Class Performance Comparison</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline">
             <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
           </Button>
           <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
         <div className="space-y-1.5 flex-1 min-w-[200px]">
           <label className="text-xs font-semibold text-slate-500 uppercase">Term</label>
           <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1 - 2025">Term 1 - 2025</SelectItem>
                <SelectItem value="Midterm - 2025">Midterm - 2025</SelectItem>
                <SelectItem value="Finals - 2025">Finals - 2025</SelectItem>
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5">
           <Filter className="mr-2 h-4 w-4" /> Apply Filters
         </Button>
      </div>

      <PrintLayout 
        title={`Class Performance - ${termFilter}`} 
        preparedBy="Academic Admin"
        filters={{ 'Term': termFilter }}
      >
        <table className="w-full text-sm text-center border-collapse mt-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-left">Class Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Total Students</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Math Avg (%)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Science Avg (%)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">English Avg (%)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right bg-slate-200">Overall Avg (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">Grade 10A</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">32</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">76.5</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">81.2</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">85.0</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">80.9</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">Grade 10B</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">30</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">82.0</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">79.5</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">88.4</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">83.3</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">Grade 11A</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">28</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">65.0</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">70.0</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">75.0</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">70.0</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-200">
               <tr>
                  <td colSpan={2} className="px-4 py-3 border border-slate-300 font-bold text-slate-900 text-right">School Average:</td>
                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-900">74.5</td>
                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-900">76.9</td>
                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-900">82.8</td>
                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-900 text-right">78.0</td>
               </tr>
            </tfoot>
        </table>
      </PrintLayout>
    </div>
  );
}
