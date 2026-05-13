import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Calendar, GraduationCap, DollarSign, Activity, FileSpreadsheet, HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '../../lib/permissions';

export default function ReportsDashboard() {
  const { hasPermission, isAdmin } = usePermissions();

  const reports = [
    {
      id: 'students',
      title: 'Student Profiles',
      description: 'Generate detailed student profiles, medical info, and performance summaries.',
      icon: <Users className="h-6 w-6 text-blue-500" />,
      path: '/reports/students',
      color: 'bg-blue-50 dark:bg-blue-900/20',
      allowed: true,
    },
    {
      id: 'attendance',
      title: 'Attendance Reports',
      description: 'Track daily attendance, tardiness, and absence trends by class or student.',
      icon: <Calendar className="h-6 w-6 text-emerald-500" />,
      path: '/reports/attendance',
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
      allowed: true,
    },
    {
      id: 'exams',
      title: 'Exam Results',
      description: 'Academic performance, term grades, and subject-level analysis.',
      icon: <GraduationCap className="h-6 w-6 text-purple-500" />,
      path: '/reports/exams',
      color: 'bg-purple-50 dark:bg-purple-900/20',
      allowed: true,
    },
    {
      id: 'classes',
      title: 'Class Performance',
      description: 'Aggregated class-level academic and behavioral insights.',
      icon: <Activity className="h-6 w-6 text-orange-500" />,
      path: '/reports/classes',
      color: 'bg-orange-50 dark:bg-orange-900/20',
      allowed: true,
    },
    {
      id: 'fees',
      title: 'Fee Payments',
      description: 'Collection rates, outstanding balances, and daily payment logs.',
      icon: <DollarSign className="h-6 w-6 text-amber-500" />,
      path: '/reports/fees',
      color: 'bg-amber-50 dark:bg-amber-900/20',
      allowed: hasPermission('manage_fees') || isAdmin,
    },
    {
      id: 'monthly-summary',
      title: 'Monthly Summary',
      description: 'High-level admin overview of school operations and key metrics.',
      icon: <FileSpreadsheet className="h-6 w-6 text-indigo-500" />,
      path: '/reports/monthly-summary',
      color: 'bg-indigo-50 dark:bg-indigo-900/20',
      allowed: isAdmin,
    }
  ];

  const visibleReports = reports.filter(r => r.allowed);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reports & Export</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Generate, print, and export data insights for your school.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleReports.map((report) => (
          <Link key={report.id} to={report.path} className="group block">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
              <div className={`p-4 rounded-xl w-14 h-14 flex items-center justify-center mb-4 ${report.color}`}>
                {report.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {report.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
                {report.description}
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white flex items-center">
                Generate Report &rarr;
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
