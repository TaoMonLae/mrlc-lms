import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Printer, TrendingUp, TrendingDown, FileSpreadsheet } from "lucide-react";
import { exportReportToExcel } from "@/src/lib/exportReport";
import { PrintLayout } from "../../components/reports/PrintLayout";
import { formatMoney } from "../../lib/locale";
import { useSettings } from "../../providers/SettingsProvider";

const REPORT_YEARS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() + 1 - index);

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

interface IncomeDetailRow {
  date: string;
  type: "Fee Payment" | "Donation";
  description: string;
  reference: string | null;
  paymentMethod: string | null;
  amount: number;
}

interface ExpenseDetailRow {
  date: string;
  title: string;
  category: string;
  status: string;
  vendor: string | null;
  reference: string | null;
  amount: number;
}

interface IncomeExpenseData {
  period: {
    startDate: string;
    endDate: string;
  };
  income: {
    total: number;
    bySource: {
      fees: number;
      donations: number;
    };
    detail: IncomeDetailRow[];
  };
  expenses: {
    total: number;
    byCategory: Array<{
      category: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    detail: ExpenseDetailRow[];
  };
  summary: {
    netSurplus: number;
    surplusRatio: number;
  };
}

export default function IncomeExpenseReport() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IncomeExpenseData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const currency = systemSettings.currency || "MYR";

  useEffect(() => {
    if (!hasPermission("view_financial_reports") && !hasPermission("view_budgets")) {
      setError("You don't have permission to view financial reports");
      setLoading(false);
      return;
    }

    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, hasPermission]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const token = sessionStorage.getItem('auth_token');

      const response = await fetch(
        `/api/financial-reports/income-expense?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch report data");
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err: any) {
      console.error("Error fetching report:", err);
      setError(err.message || "Failed to load financial report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;

    const csvContent = [
      ["Category", "Amount", "Count", "Percentage"],
      ...data.expenses.byCategory.map(item => [
        item.category,
        item.amount.toFixed(2),
        item.count,
        item.percentage.toFixed(1) + "%"
      ]),
      [],
      ["Income Source", "Amount"],
      ["Fees", data.income.bySource.fees.toFixed(2)],
      ["Donations", data.income.bySource.donations.toFixed(2)],
      ["Total Income", data.income.total.toFixed(2)],
      [],
      ["Summary", ""],
      ["Net Surplus", data.summary.netSurplus.toFixed(2)],
      ["Surplus Ratio", data.summary.surplusRatio.toFixed(1) + "%"]
    ].map(row => row.map(csvCell).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-expense-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!data) return;

    exportReportToExcel({
      title: "Income & Expense Report",
      subtitle: `Fiscal Year ${year}`,
      filename: `income-expense-report-${year}`,
      summary: [
        { label: "Total Income", value: formatMoney(data.income.total, currency) },
        { label: "Total Expenses", value: formatMoney(data.expenses.total, currency) },
        {
          label: "Net Surplus",
          value: `${data.summary.netSurplus >= 0 ? "+" : ""}${formatMoney(data.summary.netSurplus, currency)} (${data.summary.surplusRatio.toFixed(1)}%)`,
        },
      ],
      sections: [
        {
          heading: "Income by Source",
          columns: ["Source", "Amount"],
          rows: [
            ["Fees", formatMoney(data.income.bySource.fees, currency)],
            ["Donations", formatMoney(data.income.bySource.donations, currency)],
            ["Total", formatMoney(data.income.total, currency)],
          ],
        },
        {
          heading: "Expenses by Category",
          columns: ["Category", "Amount", "Count", "Percentage"],
          rows: [
            ...data.expenses.byCategory.map((item) => [
              item.category,
              formatMoney(item.amount, currency),
              item.count,
              `${item.percentage.toFixed(1)}%`,
            ]),
            ["Total", formatMoney(data.expenses.total, currency), data.expenses.byCategory.reduce((s, i) => s + i.count, 0), "100%"],
          ],
        },
        {
          heading: "Income Detail",
          columns: ["Date", "Type", "Description", "Reference", "Payment Method", "Amount"],
          rows: data.income.detail.map((row) => [
            new Date(row.date).toLocaleDateString(),
            row.type,
            row.description,
            row.reference || "-",
            row.paymentMethod || "-",
            formatMoney(row.amount, currency),
          ]),
        },
        {
          heading: "Expense Detail",
          columns: ["Date", "Title", "Category", "Vendor", "Reference", "Status", "Amount"],
          rows: data.expenses.detail.map((row) => [
            new Date(row.date).toLocaleDateString(),
            row.title,
            row.category,
            row.vendor || "-",
            row.reference || "-",
            row.status,
            formatMoney(row.amount, currency),
          ]),
        },
      ],
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const expenseChartData = data.expenses.byCategory.map(item => ({
    name: item.category,
    amount: item.amount,
    percentage: item.percentage,
  }));

  const incomeSourceData = [
    { name: "Fees", amount: data.income.bySource.fees },
    { name: "Donations", amount: data.income.bySource.donations },
  ];

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Income & Expense Report</h1>
          <p className="text-gray-500">Analyze financial performance and trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_YEARS.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportCsv} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      <PrintLayout title="Income & Expense Report" filters={{ "Fiscal Year": year.toString() }}>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatMoney(data.income.total, currency)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fees: {formatMoney(data.income.bySource.fees, currency)} + Donations: {formatMoney(data.income.bySource.donations, currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatMoney(data.expenses.total, currency)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {data.expenses.byCategory.length} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Surplus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.summary.netSurplus >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.summary.netSurplus >= 0 ? "+" : ""}{formatMoney(data.summary.netSurplus, currency)}
              </div>
              <div className="flex items-center mt-1">
                {data.summary.netSurplus >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <p className="text-xs text-gray-500">
                  {data.summary.surplusRatio.toFixed(1)}% of income
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold">
                {new Date(data.period.startDate).toLocaleDateString()} - {new Date(data.period.endDate).toLocaleDateString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Fiscal Year {year}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <section className="print:hidden mb-6 grid border border-foreground bg-card lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]" aria-label="Income and expense analysis">
          <div className="border-b border-foreground lg:border-b-0 lg:border-r">
            <header className="border-b border-foreground px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-teal">Receipt composition</p>
              <h2 className="mt-1 text-base font-semibold">Income by source</h2>
            </header>
            <div>
              {incomeSourceData.map((source, index) => {
                const share = data.income.total > 0 ? (source.amount / data.income.total) * 100 : 0;
                return (
                  <div key={source.name} className={`px-5 py-5 ${index ? "border-t border-border" : ""}`}>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{source.name}</p>
                        <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{formatMoney(source.amount, currency)}</p>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{share.toFixed(1)}%</p>
                    </div>
                    <div className="mt-3 h-1.5 bg-muted"><div className={index ? "h-full bg-[#0c2538]" : "h-full bg-academic-teal"} style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <header className="border-b border-foreground px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-coral">Settled payments</p>
              <h2 className="mt-1 text-base font-semibold">Expenses by category</h2>
            </header>
            <div className="px-3 py-5 sm:px-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => formatMoney(value, currency)} cursor={{ fill: "rgba(12, 37, 56, 0.05)" }} />
                  <Bar dataKey="amount" fill="#e97961" name={`Amount (${currency})`} radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Expenses by Category */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">
            Expenses by Category
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-right p-2">Count</th>
                <th className="text-right p-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.byCategory.map((item, index) => (
                <tr key={index}>
                  <td className="p-2">{item.category}</td>
                  <td className="text-right p-2">{formatMoney(item.amount, currency)}</td>
                  <td className="text-right p-2">{item.count}</td>
                  <td className="text-right p-2">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2">Total</td>
                <td className="text-right p-2">{formatMoney(data.expenses.total, currency)}</td>
                <td className="text-right p-2">
                  {data.expenses.byCategory.reduce((sum, item) => sum + item.count, 0)}
                </td>
                <td className="text-right p-2">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Income Detail */}
        <div className="mb-8 page-break-inside-avoid">
          <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">
            Income Detail ({data.income.detail.length} transactions)
          </h3>
          {data.income.detail.length === 0 ? (
            <p className="text-sm text-slate-500">No income transactions recorded for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">Method</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.income.detail.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.description}</td>
                    <td className="p-2">{row.reference || "-"}</td>
                    <td className="p-2">{row.paymentMethod || "-"}</td>
                    <td className="text-right p-2">{formatMoney(row.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="p-2" colSpan={5}>Total</td>
                  <td className="text-right p-2">{formatMoney(data.income.total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Expense Detail */}
        <div className="page-break-inside-avoid">
          <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">
            Expense Detail ({data.expenses.detail.length} transactions)
          </h3>
          {data.expenses.detail.length === 0 ? (
            <p className="text-sm text-slate-500">No expense transactions recorded for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.detail.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="p-2">{row.title}</td>
                    <td className="p-2">{row.category}</td>
                    <td className="p-2">{row.vendor || "-"}</td>
                    <td className="p-2">{row.reference || "-"}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="text-right p-2">{formatMoney(row.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="p-2" colSpan={6}>Total</td>
                  <td className="text-right p-2">{formatMoney(data.expenses.total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </PrintLayout>
    </div>
  );
}
