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

export default function StudentProfileReport() {
  const [classFilter, setClassFilter] = useState('Grade 10A');

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Student Profile Report</h1>
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

      {/* Filter Panel */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
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
         <Button variant="secondary" className="mb-0.5">
           <Filter className="mr-2 h-4 w-4" /> Apply Filters
         </Button>
      </div>

      <PrintLayout 
        title={`Student Profile Export - ${classFilter}`} 
        preparedBy="Admin User"
        filters={{ 'Class': classFilter }}
      >
        <table className="w-full text-sm text-left border-collapse mt-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">ID</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Student Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Gender</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">DOB</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Guardian Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Contact</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Address</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">STU-2023-001</td>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Ali bin Ahmad</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">Male</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">2010-05-12</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">Ahmad bin Kassim</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">012-3456789</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">12, Jalan Merdeka, KL</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">STU-2023-002</td>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900">Sarah Lee</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">Female</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">2010-08-22</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">David Lee</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">019-8765432</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">Blk B, Ampang</td>
              </tr>
            </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
