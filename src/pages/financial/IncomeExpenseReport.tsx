import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Printer, TrendingUp, TrendingDown, FileSpreadsheet } from "lucide-react";
import { exportReportToExcel } from "@/src/lib/exportReport";
import { PrintLayout } from "../../components/reports/PrintLayout";

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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IncomeExpenseData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

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
    ].map(row => row.join(",")).join("\n");

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
        { label: "Total Income", value: `RM${data.income.total.toLocaleString()}` },
        { label: "Total Expenses", value: `RM${data.expenses.total.toLocaleString()}` },
        {
          label: "Net Surplus",
          value: `${data.summary.netSurplus >= 0 ? "+" : ""}RM${data.summary.netSurplus.toLocaleString()} (${data.summary.surplusRatio.toFixed(1)}%)`,
        },
      ],
      sections: [
        {
          heading: "Income by Source",
          columns: ["Source", "Amount"],
          rows: [
            ["Fees", `RM${data.income.bySource.fees.toLocaleString()}`],
            ["Donations", `RM${data.income.bySource.donations.toLocaleString()}`],
            ["Total", `RM${data.income.total.toLocaleString()}`],
          ],
        },
        {
          heading: "Expenses by Category",
          columns: ["Category", "Amount", "Count", "Percentage"],
          rows: [
            ...data.expenses.byCategory.map((item) => [
              item.category,
              `RM${item.amount.toLocaleString()}`,
              item.count,
              `${item.percentage.toFixed(1)}%`,
            ]),
            ["Total", `RM${data.expenses.total.toLocaleString()}`, data.expenses.byCategory.reduce((s, i) => s + i.count, 0), "100%"],
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
            `RM${row.amount.toLocaleString()}`,
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
            `RM${row.amount.toLocaleString()}`,
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

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      <div className="print:hidden flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income & Expense Report</h1>
          <p className="text-gray-500">Analyze financial performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
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
                RM{data.income.total.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fees: RM{data.income.bySource.fees.toLocaleString()} + Donations: RM{data.income.bySource.donations.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                RM{data.expenses.total.toLocaleString()}
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
                {data.summary.netSurplus >= 0 ? "+" : ""}RM{data.summary.netSurplus.toLocaleString()}
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
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Income by Source</CardTitle>
              <CardDescription>Breakdown of income sources</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {incomeSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown of expense categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#ef4444" name="Amount (RM)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

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
                  <td className="text-right p-2">RM{item.amount.toLocaleString()}</td>
                  <td className="text-right p-2">{item.count}</td>
                  <td className="text-right p-2">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2">Total</td>
                <td className="text-right p-2">RM{data.expenses.total.toLocaleString()}</td>
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
                    <td className="text-right p-2">RM{row.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="p-2" colSpan={5}>Total</td>
                  <td className="text-right p-2">RM{data.income.total.toLocaleString()}</td>
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
                    <td className="text-right p-2">RM{row.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="p-2" colSpan={6}>Total</td>
                  <td className="text-right p-2">RM{data.expenses.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </PrintLayout>
    </div>
  );
}
