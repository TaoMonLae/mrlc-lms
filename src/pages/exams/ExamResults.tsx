import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ExamResults() {
  const { id } = useParams();

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exam Results</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">View and grade all student submissions.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search students..." className="pl-9" />
        </div>
      </div>

       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Time Taken</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Min Khant Aung</td>
                <td className="px-6 py-4"><Badge className="bg-emerald-500">GRADED</Badge></td>
                <td className="px-6 py-4 text-emerald-600 font-bold">95 / 100</td>
                <td className="px-6 py-4 text-slate-500">45m 12s</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm">Review</Button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Zun Pwint Phyu</td>
                <td className="px-6 py-4"><Badge variant="secondary" className="bg-amber-100 text-amber-800">NEEDS GRADING</Badge></td>
                <td className="px-6 py-4 text-amber-600 font-bold">-- / 100</td>
                <td className="px-6 py-4 text-slate-500">59m 40s</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">Grade Now</Button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Aung Ko Myat</td>
                <td className="px-6 py-4"><Badge variant="outline">NOT STARTED</Badge></td>
                <td className="px-6 py-4 text-slate-400 font-bold">-- / 100</td>
                <td className="px-6 py-4 text-slate-400">--</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" disabled>Review</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
