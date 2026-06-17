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

export default function FeesReport() {
  const [classFilter, setClassFilter] = useState('All Classes');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Summary Report</h1>
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
           <label className="text-xs font-semibold text-slate-500 uppercase">Payment Status</label>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5">
           <Filter className="mr-2 h-4 w-4" /> Apply
         </Button>
      </div>

      <PrintLayout 
        title="Fee Collection Summary" 
        preparedBy="Finance Admin"
        filters={{ 'Class': classFilter, 'Status': statusFilter }}
      >
        <div className="mb-8 grid grid-cols-3 gap-6">
           <div className="border border-slate-300 p-4 rounded">
             <p className="text-xs text-slate-500 uppercase font-bold">Total Expected</p>
             <p className="text-xl font-bold text-slate-900 mt-1">MYR 4,500.00</p>
           </div>
           <div className="border border-slate-300 p-4 rounded bg-slate-50">
             <p className="text-xs text-slate-500 uppercase font-bold">Total Collected</p>
             <p className="text-xl font-bold text-slate-900 mt-1">MYR 2,000.00</p>
           </div>
           <div className="border border-slate-300 p-4 rounded">
             <p className="text-xs text-slate-500 uppercase font-bold">Outstanding</p>
             <p className="text-xl font-bold text-slate-900 mt-1 text-red-600">MYR 2,500.00</p>
           </div>
        </div>

        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 w-[30%]">Student Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Class</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right">Expected (MYR)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right">Paid (MYR)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right">Balance (MYR)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Ali bin Ahmad</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">10A</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">1,500.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">1,500.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">0.00</td>
                <td className="px-4 py-3 border border-slate-300 font-bold text-emerald-600">PAID</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Sarah Lee</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">10B</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">1,500.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">500.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700 font-bold text-amber-600">1,000.00</td>
                <td className="px-4 py-3 border border-slate-300 font-bold text-amber-600">PARTIAL</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">John Doe</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">10A</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">1,500.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700">0.00</td>
                <td className="px-4 py-3 border border-slate-300 text-right text-slate-700 font-bold text-red-600">1,500.00</td>
                <td className="px-4 py-3 border border-slate-300 font-bold text-red-600">UNPAID</td>
              </tr>
            </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
