import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrintLayout } from '../../components/reports/PrintLayout';

export default function MonthlySummaryReport() {
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Monthly School Summary</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
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
           <Filter className="mr-2 h-4 w-4" /> Apply Filter
         </Button>
      </div>

      <PrintLayout 
        title="Monthly Admin Summary" 
        preparedBy="System Administrator"
        filters={{ 'Reporting Month': monthFilter }}
      >
        <div className="space-y-8 mt-4">
           
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Total Active Students</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">452</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Avg Attendance</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">94.5%</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Open Cases</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1 text-amber-600">12</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center bg-slate-50">
                 <p className="text-xs text-slate-500 uppercase font-bold">Fee Collection</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">MYR 45.2k</p>
              </div>
           </div>

           <div>
              <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">Case Management (Incidents)</h3>
              <table className="w-full text-sm text-left border-collapse">
                 <thead className="bg-slate-100">
                    <tr>
                       <th className="px-4 py-2 border border-slate-300 font-semibold">Category</th>
                       <th className="px-4 py-2 border border-slate-300 font-semibold text-center">New Cases</th>
                       <th className="px-4 py-2 border border-slate-300 font-semibold text-center">Resolved</th>
                       <th className="px-4 py-2 border border-slate-300 font-semibold text-center">Remaining Open</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td className="px-4 py-2 border border-slate-300">Attendance</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">5</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">3</td>
                       <td className="px-4 py-2 border border-slate-300 text-center font-bold">2</td>
                    </tr>
                    <tr>
                       <td className="px-4 py-2 border border-slate-300">Academic</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">15</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">10</td>
                       <td className="px-4 py-2 border border-slate-300 text-center font-bold">5</td>
                    </tr>
                    <tr>
                       <td className="px-4 py-2 border border-slate-300 text-red-700 font-medium">Protection / Safety</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">2</td>
                       <td className="px-4 py-2 border border-slate-300 text-center">1</td>
                       <td className="px-4 py-2 border border-slate-300 text-center font-bold text-red-700">1</td>
                    </tr>
                 </tbody>
              </table>
           </div>

           <div>
              <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">Staff & HR Summary</h3>
              <p className="text-sm text-slate-700 mb-2">Active Teaching Staff: 30</p>
              <p className="text-sm text-slate-700 mb-2">Active Admin Staff: 8</p>
              <p className="text-sm text-slate-700">Staff Attendance Rate: 98.2%</p>
           </div>
        </div>
      </PrintLayout>
    </div>
  );
}
