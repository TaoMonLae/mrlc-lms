import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RolesPermissions() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Roles & Permissions</h2>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">View system-wide role configurations. (Read-only)</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Role Definitions</h3>
            <p className="text-sm text-slate-500">Modules accessible by each role.</p>
          </div>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Description & Access Areas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">ADMIN</td>
                <td className="px-6 py-4">
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Full system access.</p>
                  <p className="text-slate-500 dark:text-slate-400">Can manage users, roles, settings, students, teachers, classes, subjects, exams, attendance, system configs.</p>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">TEACHER</td>
                <td className="px-6 py-4">
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Academic & classroom management.</p>
                  <p className="text-slate-500 dark:text-slate-400">Can access Teacher Dashboard, assigned classes, attendance for assigned classes, exams for their subjects, library, and specific reports. Cannot access user management.</p>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">STUDENT</td>
                <td className="px-6 py-4">
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Personal academic portal.</p>
                  <p className="text-slate-500 dark:text-slate-400">Can access Student Dashboard, own profile, own attendance history, own exam results, general library, and fee balance. Cannot edit academic records.</p>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-slate-400 italic">STAFF</td>
                <td className="px-6 py-4">
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">General administration (Future).</p>
                  <p className="text-slate-500 dark:text-slate-400">Assigned specific custom permissions for library, HR, or front-desk management.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
