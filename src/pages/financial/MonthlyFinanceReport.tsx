import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Download, TrendingDown, TrendingUp, Printer, FileSpreadsheet, ReceiptText, Wallet } from "lucide-react";
import { exportReportToExcel } from "@/src/lib/exportReport";
import { formatMoney } from "@/src/lib/locale";
import { useSettings } from "@/src/providers/SettingsProvider";
import { PrintLayout } from "../../components/reports/PrintLayout";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const REPORT_YEARS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() + 1 - index);

type ReportView = "income" | "expenses";

interface MonthlyCashFlow {
  month: number;
  year: number;
  inflow: { total: number; fees: number; donations: number };
  outflow: { total: number; byCategory: Record<string, number> };
  netFlow: number;
  cumulative: number;
}

interface CashFlowData {
  period: { startDate: string; endDate: string };
  monthlyCashFlow: MonthlyCashFlow[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageMonthlyFlow: number;
    endingBalance: number;
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function MonthlyFinanceReport() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CashFlowData | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [reportView, setReportView] = useState<ReportView>("income");
  const [error, setError] = useState<string | null>(null);
  const currency = systemSettings.currency || "MYR";

  useEffect(() => {
    if (!hasPermission("view_financial_reports") && !hasPermission("view_budgets")) {
      setError("You don't have permission to view financial reports");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = sessionStorage.getItem("auth_token");
        const response = await fetch(
          `/api/financial-reports/cash-flow?startDate=${year}-01-01&endDate=${year}-12-31`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Failed to fetch report data");
        setData(body);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load monthly finance report");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchReport();
    return () => controller.abort();
  }, [year, hasPermission]);

  const downloadCsv = () => {
    if (!data) return;
    const rows: Array<Array<string | number>> = reportView === "income"
      ? [
          ["Month", "Fees Collected", "Donations", "Total Income"],
          ...data.monthlyCashFlow.map((month) => [
            `${MONTH_LABELS[month.month - 1]} ${month.year}`,
            month.inflow.fees.toFixed(2),
            month.inflow.donations.toFixed(2),
            month.inflow.total.toFixed(2),
          ]),
          ["Total", data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.fees, 0).toFixed(2), data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.donations, 0).toFixed(2), data.summary.totalInflow.toFixed(2)],
        ]
      : [
          ["Month", "Paid Expenses", "Net Cash Flow", "Running Balance"],
          ...data.monthlyCashFlow.map((month) => [
            `${MONTH_LABELS[month.month - 1]} ${month.year}`,
            month.outflow.total.toFixed(2),
            month.netFlow.toFixed(2),
            month.cumulative.toFixed(2),
          ]),
          ["Total", data.summary.totalOutflow.toFixed(2), data.summary.netCashFlow.toFixed(2), data.summary.endingBalance.toFixed(2)],
        ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-${reportView}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildExportOptions = () => {
    if (!data) return null;
    const monthLabel = `${MONTH_LABELS[selectedMonth - 1]} ${year}`;
    const selected = data.monthlyCashFlow.find((month) => month.month === selectedMonth) || data.monthlyCashFlow[0];
    if (!selected) return null;

    if (reportView === "income") {
      return {
        title: "Monthly Income / Fees Report",
        subtitle: `${monthLabel} — full year ${year} shown below`,
        filename: `monthly-income-fees-${year}-${String(selectedMonth).padStart(2, "0")}`,
        summary: [
          { label: `Fees collected (${monthLabel})`, value: formatMoney(selected.inflow.fees, currency) },
          { label: `Donations (${monthLabel})`, value: formatMoney(selected.inflow.donations, currency) },
          { label: `Total income (${monthLabel})`, value: formatMoney(selected.inflow.total, currency) },
          { label: `Annual income (${year})`, value: formatMoney(data.summary.totalInflow, currency) },
        ],
        sections: [{
          heading: `Monthly Income / Fees — ${year}`,
          columns: ["Month", "Fees Collected", "Donations", "Total Income"],
          rows: data.monthlyCashFlow.map((month) => [
            MONTH_LABELS[month.month - 1],
            formatMoney(month.inflow.fees, currency),
            formatMoney(month.inflow.donations, currency),
            formatMoney(month.inflow.total, currency),
          ]),
        }],
      };
    }

    const categories = Object.entries(selected.outflow.byCategory).sort((a, b) => b[1] - a[1]);
    return {
      title: "Monthly Expense Report",
      subtitle: `${monthLabel} — full year ${year} shown below`,
      filename: `monthly-expenses-${year}-${String(selectedMonth).padStart(2, "0")}`,
      summary: [
        { label: `Paid expenses (${monthLabel})`, value: formatMoney(selected.outflow.total, currency) },
        { label: `Net cash flow (${monthLabel})`, value: formatMoney(selected.netFlow, currency) },
        { label: `Annual expenses (${year})`, value: formatMoney(data.summary.totalOutflow, currency) },
        { label: "Running balance", value: formatMoney(selected.cumulative, currency) },
      ],
      sections: [
        ...(categories.length ? [{
          heading: `Expense Categories — ${monthLabel}`,
          columns: ["Category", "Amount"],
          rows: categories.map(([category, amount]) => [category, formatMoney(amount, currency)]),
        }] : []),
        {
          heading: `Monthly Expenses — ${year}`,
          columns: ["Month", "Paid Expenses", "Net Cash Flow", "Running Balance"],
          rows: data.monthlyCashFlow.map((month) => [
            MONTH_LABELS[month.month - 1],
            formatMoney(month.outflow.total, currency),
            formatMoney(month.netFlow, currency),
            formatMoney(month.cumulative, currency),
          ]),
        },
      ],
    };
  };

  const exportExcel = () => {
    const options = buildExportOptions();
    if (options) exportReportToExcel(options);
  };

  if (error) {
    return <div className="flex h-96 items-center justify-center"><Card className="w-full max-w-md"><CardContent className="pt-6"><p className="text-center text-red-600">{error}</p></CardContent></Card></div>;
  }
  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" /></div>;
  }
  if (!data || data.monthlyCashFlow.length === 0) {
    return <div className="flex h-96 items-center justify-center text-slate-500">No data available</div>;
  }

  const selected = data.monthlyCashFlow.find((month) => month.month === selectedMonth) || data.monthlyCashFlow[0];
  const monthLabel = `${MONTH_LABELS[selected.month - 1]} ${selected.year}`;
  const categories = Object.entries(selected.outflow.byCategory).sort((a, b) => b[1] - a[1]);
  const chartData = data.monthlyCashFlow.map((month) => ({
    name: MONTH_LABELS[month.month - 1],
    Fees: month.inflow.fees,
    Donations: month.inflow.donations,
    Expenses: month.outflow.total,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="print:hidden flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Finance Tracking</h1>
          <p className="text-slate-500">Income / fees and expenses are separated for easier month-by-month review.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select value={year.toString()} onValueChange={(value) => {
            const nextYear = Number(value);
            setYear(nextYear);
            setSelectedMonth(nextYear === now.getFullYear() ? now.getMonth() + 1 : 1);
          }}>
            <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_YEARS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTH_LABELS.map((label, index) => <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={downloadCsv} variant="outline"><Download className="mr-2 h-4 w-4" />{reportView === "income" ? "Income CSV" : "Expense CSV"}</Button>
          <Button onClick={exportExcel} variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
          <Button onClick={() => window.print()} className="col-span-2"><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
        </div>
      </div>

      {/* The interactive view follows the app theme. The branded white page is
          rendered separately below and is only mounted into the print flow. */}
      <div className="print:hidden space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Income / Fees — {monthLabel}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{formatMoney(selected.inflow.total, currency)}</div><p className="mt-1 text-xs text-slate-500">Fees {formatMoney(selected.inflow.fees, currency)} · Donations {formatMoney(selected.inflow.donations, currency)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expenses — {monthLabel}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatMoney(selected.outflow.total, currency)}</div><p className="mt-1 text-xs text-slate-500">Actual payments made this month</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net — {monthLabel}</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${selected.netFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>{selected.netFlow >= 0 ? "+" : ""}{formatMoney(selected.netFlow, currency)}</div><div className="mt-1 flex items-center text-xs text-slate-500">{selected.netFlow >= 0 ? <TrendingUp className="mr-1 h-4 w-4 text-emerald-600" /> : <TrendingDown className="mr-1 h-4 w-4 text-red-600" />}This month</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Running Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(selected.cumulative, currency)}</div><p className="mt-1 text-xs text-slate-500"><Calendar className="mr-1 inline h-3 w-3" />Cumulative through {monthLabel}</p></CardContent></Card>
        </div>

        <Tabs value={reportView} onValueChange={(value) => setReportView(value as ReportView)} className="space-y-4">
          <TabsList className="grid h-auto w-full max-w-lg grid-cols-2">
            <TabsTrigger value="income"><ReceiptText className="mr-2 h-4 w-4" />Monthly Income / Fees</TabsTrigger>
            <TabsTrigger value="expenses"><Wallet className="mr-2 h-4 w-4" />Monthly Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Income / Fees — {monthLabel}</CardTitle><CardDescription>Cash received is tracked by the date of each collection.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4"><p className="text-sm text-slate-500">Fees Collected</p><p className="mt-1 text-xl font-semibold">{formatMoney(selected.inflow.fees, currency)}</p></div>
                <div className="rounded-lg border p-4"><p className="text-sm text-slate-500">Donations</p><p className="mt-1 text-xl font-semibold">{formatMoney(selected.inflow.donations, currency)}</p></div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><p className="text-sm text-slate-500">Total Income</p><p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(selected.inflow.total, currency)}</p></div>
              </CardContent>
            </Card>
            <Card className="rounded-none border-foreground shadow-none"><CardHeader className="border-b border-foreground"><CardTitle>Monthly income / fees — {year}</CardTitle><CardDescription>Fees and other income are shown independently.</CardDescription></CardHeader><CardContent className="pt-6"><ResponsiveContainer width="100%" height={320}><BarChart data={chartData}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => formatMoney(value, currency)} cursor={{ fill: "rgba(12, 37, 56, 0.05)" }} /><Legend /><Bar dataKey="Fees" stackId="income" fill="#168c83" radius={0} /><Bar dataKey="Donations" stackId="income" fill="#0c2538" radius={0} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Monthly Income / Fees Breakdown</CardTitle><CardDescription>Select any row to review that month.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b"><th className="p-3 text-left">Month</th><th className="p-3 text-right">Fees Collected</th><th className="p-3 text-right">Donations</th><th className="p-3 text-right">Total Income</th></tr></thead><tbody>{data.monthlyCashFlow.map((month) => <tr key={`income-${month.month}`} onClick={() => setSelectedMonth(month.month)} className={`cursor-pointer border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${month.month === selectedMonth ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}`}><td className="p-3">{MONTH_LABELS[month.month - 1]} {month.year}</td><td className="p-3 text-right">{formatMoney(month.inflow.fees, currency)}</td><td className="p-3 text-right">{formatMoney(month.inflow.donations, currency)}</td><td className="p-3 text-right font-medium">{formatMoney(month.inflow.total, currency)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 font-bold"><td className="p-3">Total</td><td className="p-3 text-right">{formatMoney(data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.fees, 0), currency)}</td><td className="p-3 text-right">{formatMoney(data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.donations, 0), currency)}</td><td className="p-3 text-right">{formatMoney(data.summary.totalInflow, currency)}</td></tr></tfoot></table></div></CardContent></Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card><CardHeader><CardTitle>Expenses — {monthLabel}</CardTitle><CardDescription>Only actual bill payments are counted; pending and approved invoices are not treated as cash spent.</CardDescription></CardHeader><CardContent>{categories.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No expense payments recorded for {monthLabel}.</p> : <div className="grid gap-3 sm:grid-cols-2">{categories.map(([category, amount]) => <div key={category} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm text-slate-600 dark:text-slate-300">{category.replaceAll("_", " ")}</span><span className="font-medium">{formatMoney(amount, currency)}</span></div>)}</div>}</CardContent></Card>
            <Card className="rounded-none border-foreground shadow-none"><CardHeader className="border-b border-foreground"><CardTitle>Monthly expenses — {year}</CardTitle><CardDescription>Actual cash paid out each month.</CardDescription></CardHeader><CardContent className="pt-6"><ResponsiveContainer width="100%" height={320}><BarChart data={chartData}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => formatMoney(value, currency)} cursor={{ fill: "rgba(12, 37, 56, 0.05)" }} /><Legend /><Bar dataKey="Expenses" fill="#e97961" radius={0} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Monthly Expense Breakdown</CardTitle><CardDescription>Select any row to review its expense categories.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b"><th className="p-3 text-left">Month</th><th className="p-3 text-right">Paid Expenses</th><th className="p-3 text-right">Net Cash Flow</th><th className="p-3 text-right">Running Balance</th></tr></thead><tbody>{data.monthlyCashFlow.map((month) => <tr key={`expense-${month.month}`} onClick={() => setSelectedMonth(month.month)} className={`cursor-pointer border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${month.month === selectedMonth ? "bg-red-50 dark:bg-red-950/20" : ""}`}><td className="p-3">{MONTH_LABELS[month.month - 1]} {month.year}</td><td className="p-3 text-right font-medium">{formatMoney(month.outflow.total, currency)}</td><td className={`p-3 text-right ${month.netFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>{month.netFlow >= 0 ? "+" : ""}{formatMoney(month.netFlow, currency)}</td><td className="p-3 text-right">{formatMoney(month.cumulative, currency)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 font-bold"><td className="p-3">Total</td><td className="p-3 text-right">{formatMoney(data.summary.totalOutflow, currency)}</td><td className="p-3 text-right">{data.summary.netCashFlow >= 0 ? "+" : ""}{formatMoney(data.summary.netCashFlow, currency)}</td><td className="p-3 text-right">{formatMoney(data.summary.endingBalance, currency)}</td></tr></tfoot></table></div></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only: plain light content avoids leaking dark-mode Card styles
          into the PDF and keeps the complete table and total row visible. */}
      <div className="hidden print:block">
        <PrintLayout
          title={reportView === "income" ? "Monthly Income / Fees Report" : "Monthly Expense Report"}
          filters={{ Year: String(year), Month: monthLabel }}
          className="monthly-finance-print"
          showSignatures={false}
        >
          {reportView === "income" ? (
            <>
              <section className="monthly-print-section">
                <h2 className="text-base font-bold text-slate-900">Income / Fees — {monthLabel}</h2>
                <p className="mb-3 text-xs text-slate-600">Cash received is tracked by the date of each collection.</p>
                <div className="monthly-print-summary grid grid-cols-3 gap-3">
                  <div className="rounded border border-slate-300 p-3"><p className="text-xs text-slate-600">Fees Collected</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(selected.inflow.fees, currency)}</p></div>
                  <div className="rounded border border-slate-300 p-3"><p className="text-xs text-slate-600">Donations</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(selected.inflow.donations, currency)}</p></div>
                  <div className="rounded border border-emerald-600 p-3"><p className="text-xs text-slate-600">Total Income</p><p className="mt-1 text-lg font-bold text-emerald-700">{formatMoney(selected.inflow.total, currency)}</p></div>
                </div>
              </section>
              <section className="monthly-print-section mt-5">
                <h2 className="text-sm font-bold text-slate-900">Monthly Income / Fees Breakdown</h2>
                <table>
                  <thead><tr><th>Month</th><th className="text-right">Fees Collected</th><th className="text-right">Donations</th><th className="text-right">Total Income</th></tr></thead>
                  <tbody>{data.monthlyCashFlow.map((month) => <tr key={`print-income-${month.month}`}><td>{MONTH_LABELS[month.month - 1]} {month.year}</td><td className="text-right">{formatMoney(month.inflow.fees, currency)}</td><td className="text-right">{formatMoney(month.inflow.donations, currency)}</td><td className="text-right">{formatMoney(month.inflow.total, currency)}</td></tr>)}</tbody>
                  <tfoot><tr><td>Total</td><td className="text-right">{formatMoney(data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.fees, 0), currency)}</td><td className="text-right">{formatMoney(data.monthlyCashFlow.reduce((sum, month) => sum + month.inflow.donations, 0), currency)}</td><td className="text-right">{formatMoney(data.summary.totalInflow, currency)}</td></tr></tfoot>
                </table>
              </section>
            </>
          ) : (
            <>
              <section className="monthly-print-section">
                <h2 className="text-base font-bold text-slate-900">Expenses — {monthLabel}</h2>
                <p className="mb-3 text-xs text-slate-600">Only actual bill payments are counted as cash spent.</p>
                <div className="monthly-print-summary grid grid-cols-3 gap-3">
                  <div className="rounded border border-slate-300 p-3"><p className="text-xs text-slate-600">Paid Expenses</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(selected.outflow.total, currency)}</p></div>
                  <div className="rounded border border-slate-300 p-3"><p className="text-xs text-slate-600">Net Cash Flow</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(selected.netFlow, currency)}</p></div>
                  <div className="rounded border border-slate-300 p-3"><p className="text-xs text-slate-600">Running Balance</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(selected.cumulative, currency)}</p></div>
                </div>
                {categories.length > 0 && <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">{categories.map(([category, amount]) => <div key={`print-${category}`} className="flex justify-between border-b border-slate-200 py-1"><span>{category.replaceAll("_", " ")}</span><strong>{formatMoney(amount, currency)}</strong></div>)}</div>}
              </section>
              <section className="monthly-print-section mt-5">
                <h2 className="text-sm font-bold text-slate-900">Monthly Expense Breakdown</h2>
                <table>
                  <thead><tr><th>Month</th><th className="text-right">Paid Expenses</th><th className="text-right">Net Cash Flow</th><th className="text-right">Running Balance</th></tr></thead>
                  <tbody>{data.monthlyCashFlow.map((month) => <tr key={`print-expense-${month.month}`}><td>{MONTH_LABELS[month.month - 1]} {month.year}</td><td className="text-right">{formatMoney(month.outflow.total, currency)}</td><td className="text-right">{formatMoney(month.netFlow, currency)}</td><td className="text-right">{formatMoney(month.cumulative, currency)}</td></tr>)}</tbody>
                  <tfoot><tr><td>Total</td><td className="text-right">{formatMoney(data.summary.totalOutflow, currency)}</td><td className="text-right">{formatMoney(data.summary.netCashFlow, currency)}</td><td className="text-right">{formatMoney(data.summary.endingBalance, currency)}</td></tr></tfoot>
                </table>
              </section>
            </>
          )}
          <style>{`@media print {
            .monthly-finance-print { padding: 0 !important; overflow: visible !important; }
            .monthly-finance-print .report-header { margin-bottom: 12px !important; padding-bottom: 10px !important; }
            .monthly-finance-print .report-header img { width: 58px !important; height: 58px !important; }
            .monthly-finance-print .report-school { font-size: 18px !important; line-height: 1.15 !important; }
            .monthly-finance-print .report-title-badge { max-width: 170px; font-size: 10px; padding: 5px 9px; }
            .monthly-finance-print .report-params { margin-bottom: 12px !important; padding: 8px 12px !important; }
            .monthly-finance-print .report-params h3 { margin-bottom: 4px !important; }
            .monthly-finance-print .print-content { margin-bottom: 0 !important; }
            .monthly-finance-print .monthly-print-section { break-inside: avoid; }
            .monthly-finance-print .print-content table { font-size: 10px; }
            .monthly-finance-print .print-content thead th,
            .monthly-finance-print .print-content tbody td,
            .monthly-finance-print .print-content tfoot td { padding: 4px 7px !important; }
          }`}</style>
        </PrintLayout>
      </div>
    </div>
  );
}
