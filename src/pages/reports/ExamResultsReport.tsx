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

export default function ExamResultsReport() {
  const [classFilter, setClassFilter] = useState('Grade 10A');
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exam Results Report</h1>
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
        title={`Exam Results - ${termFilter}`} 
        preparedBy="Academic Admin"
        filters={{ 'Class': classFilter, 'Term': termFilter }}
      >
        <table className="w-full text-sm text-center border-collapse mt-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-left">Student Name</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Mathematics</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">Science</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900">English</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right bg-slate-200">Average (%)</th>
                <th className="px-4 py-3 border border-slate-300 font-semibold text-slate-900 text-right bg-slate-200">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">Ali bin Ahmad</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">85</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">78</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">92</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">85.0</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">A</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">Sarah Lee</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">95</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">91</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">88</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">91.3</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50">A+</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-slate-300 font-medium text-slate-900 text-left">John Doe</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">45</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">55</td>
                <td className="px-4 py-3 border border-slate-300 text-slate-700">60</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50 text-aubergine-600">53.3</td>
                <td className="px-4 py-3 border border-slate-300 text-right font-bold text-slate-900 bg-slate-50 text-aubergine-600">C</td>
              </tr>
            </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
