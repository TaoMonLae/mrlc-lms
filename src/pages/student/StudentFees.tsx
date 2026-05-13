import React from 'react';
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StudentFees() {
  const summary = {
    balance: 450,
    paid: 2800,
    total: 3250,
    dueDate: '2024-05-20',
  };

  const transactions = [
    { id: '1', date: '2024-02-15', title: 'Term 2 Tuition Fee (Partial)', amount: 1200, status: 'PAID', method: 'Bank Transfer' },
    { id: '2', date: '2024-02-01', title: 'Uniform & Sports Kit', amount: 350, status: 'PAID', method: 'Cash' },
    { id: '3', date: '2023-09-10', title: 'Term 1 Tuition Fee', amount: 1250, status: 'PAID', method: 'Online Payment' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            Fees & Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your school fees, payment history, and receipts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fee Statement Summary */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Wallet className="h-24 w-24" />
              </div>
              <CardContent className="p-8 relative">
                <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] mb-1">Current Outstanding</p>
                <h3 className="text-4xl font-black tracking-tighter mb-6">${summary.balance.toLocaleString()}</h3>
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                    <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-tighter">Due Date</p>
                    <p className="text-xs font-bold">{summary.dueDate}</p>
                  </div>
                  <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-widest text-[10px] h-9 px-6 rounded-xl">
                    Pay Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-center p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Paid</span>
                  <span className="text-lg font-black text-emerald-600">${summary.paid.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Billed</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white">${summary.total.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(summary.paid/summary.total)*100}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                    Payment Progress: {Math.round((summary.paid/summary.total)*100)}%
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" /> Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{tx.date}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {tx.method}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-sm">
                          ${tx.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-widest">
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Info */}
        <div className="space-y-8">
          {/* Payment Help */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" /> How to Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-start gap-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="h-8 w-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Online Portal</h5>
                  <p className="text-[10px] text-slate-500">Pay via Card or Mobile Banking</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-start gap-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="h-8 w-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Bank Transfer</h5>
                  <p className="text-[10px] text-slate-500">Download Account Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mt-4 hover:underline cursor-pointer px-1">
                 Payment Support <HelpCircle className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          {/* Fee Policy Alert */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest">Fee Policy</h4>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Late payments incur a 5% surcharge after the 25th of the month. Results and transcripts will be withheld for students with outstanding balances exceeding $500.
            </p>
          </div>

          {/* Download Receipts */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125" />
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest">Annual Statement</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Download your complete payment summary for the 2023-24 financial year.</p>
            </div>
            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px] h-9">
              Report (PDF) <Download className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
