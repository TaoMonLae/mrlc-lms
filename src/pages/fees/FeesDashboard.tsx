import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, DollarSign, ArrowUpRight, CheckCircle2, AlertCircle, FileText, Download, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '../../lib/permissions';
import { format } from 'date-fns';

const MOCK_FEES = [
  {
    id: 'f1',
    studentId: '1',
    studentName: 'Ali bin Ahmad',
    studentIdNumber: 'STU-2023-001',
    class: 'Grade 10A',
    totalDue: 1500,
    totalPaid: 1500,
    balance: 0,
    status: 'PAID',
    lastPaymentDate: '2025-05-10T10:00:00Z',
  },
  {
    id: 'f2',
    studentId: '2',
    studentName: 'Sarah Lee',
    studentIdNumber: 'STU-2023-002',
    class: 'Grade 10B',
    totalDue: 1500,
    totalPaid: 500,
    balance: 1000,
    status: 'PARTIAL',
    lastPaymentDate: '2025-04-15T10:00:00Z',
  },
  {
    id: 'f3',
    studentId: '3',
    studentName: 'John Doe',
    studentIdNumber: 'STU-2023-003',
    class: 'Grade 10A',
    totalDue: 1500,
    totalPaid: 0,
    balance: 1500,
    status: 'UNPAID',
    lastPaymentDate: null,
  }
];

export default function FeesDashboard() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  const filteredFees = MOCK_FEES.filter(f => {
    const matchesSearch = f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesClass = classFilter === 'ALL' || f.class === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const totalCollected = MOCK_FEES.reduce((sum, f) => sum + f.totalPaid, 0);
  const totalOutstanding = MOCK_FEES.reduce((sum, f) => sum + f.balance, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fees & Payments</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage student fees and track payments.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPermission('manage_fees') && (
            <>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export Report
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 w-full sm:w-auto" render={<Link to="/fees/payments/new" />} nativeButton={false}>
                <DollarSign className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Collected</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">MYR {totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Outstanding</p>
           <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">MYR {totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Collection Rate</p>
           <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
             {Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)}%
           </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by student name or ID..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                <SelectItem value="Grade 10A">Grade 10A</SelectItem>
                <SelectItem value="Grade 10B">Grade 10B</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total Due</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium">Last Payment</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-xs">
                        {fee.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{fee.studentName}</div>
                        <div className="text-xs text-slate-500">{fee.studentIdNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {fee.class}
                  </td>
                  <td className="px-6 py-4">
                    {fee.status === 'PAID' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 dark:bg-emerald-900/30 dark:text-emerald-400 py-0.5"><CheckCircle2 className="h-3 w-3 mr-1"/> Paid</Badge>}
                    {fee.status === 'PARTIAL' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400 py-0.5">Partial</Badge>}
                    {fee.status === 'UNPAID' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400 py-0.5"><AlertCircle className="h-3 w-3 mr-1"/> Unpaid</Badge>}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {fee.totalDue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {fee.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {fee.lastPaymentDate ? format(new Date(fee.lastPaymentDate), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" render={<Link to={`/fees/students/${fee.studentId}`} />} nativeButton={false}>
                       View <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              
              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No fee records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
