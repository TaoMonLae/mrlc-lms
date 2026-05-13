import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Play, Users, BarChart3, Clock, CheckCircle2, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MOCK_EXAM = {
  id: 'e1',
  title: 'GED Math Midterm',
  subject: 'Math',
  durationMinutes: 60,
  totalPoints: 100,
  status: 'PUBLISHED',
  classId: 'c1',
  submissions: 15,
  totalStudents: 20,
  avgScore: 78,
};

export default function ExamProfile() {
  const { id } = useParams();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{MOCK_EXAM.title}</h1>
            <Badge className="bg-emerald-500 hover:bg-emerald-600">PUBLISHED</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link to={`/exams/${id}/edit`} />} nativeButton={false}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="secondary" className="text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40" render={<Link to={`/exams/${id}/take`} />} nativeButton={false}>
              <Play className="mr-2 h-4 w-4" /> Preview
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_EXAM.submissions} <span className="text-sm font-normal text-slate-500">/ {MOCK_EXAM.totalStudents}</span></p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Submitted</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_EXAM.avgScore}%</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Avg Score</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_EXAM.durationMinutes}m</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Duration</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_EXAM.totalPoints}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Total Points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 dark:text-white">Recent Submissions</h2>
              <Button variant="ghost" size="sm" render={<Link to={`/exams/${id}/results`} />} nativeButton={false}>View All Results</Button>
            </div>
            <div className="p-0">
               <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Time Taken</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">Min Khant Aung</td>
                    <td className="px-6 py-3 text-emerald-600 font-medium">95 / 100</td>
                    <td className="px-6 py-3 text-slate-500">45m 12s</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm">Details</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">Zun Pwint Phyu</td>
                    <td className="px-6 py-3 text-amber-600 font-medium">Needs Grading</td>
                    <td className="px-6 py-3 text-slate-500">59m 40s</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">Grade Now</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <Settings className="h-4 w-4 mr-2" /> Properties
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Class Target</span>
                <span className="font-medium text-slate-900 dark:text-white">GED Social Studies</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900 dark:text-white">Midterm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-submit</span>
                <span className="font-medium text-slate-900 dark:text-white">Enabled</span>
              </div>
               <div className="flex justify-between">
                <span className="text-slate-500">Timer</span>
                <span className="font-medium text-slate-900 dark:text-white">Enabled (60m)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
