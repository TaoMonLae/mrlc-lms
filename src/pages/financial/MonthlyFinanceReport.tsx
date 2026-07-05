import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download, TrendingUp, TrendingDown, Printer, FileSpreadsheet } from "lucide-react";
import { exportReportToExcel } from "@/src/lib/exportReport";
import { PrintLayout } from "../../components/reports/PrintLayout";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

export default function MonthlyFinanceReport() {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CashFlowData | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  // Which single month's numbers are shown in the headline summary cards.
  // Defaults to the current month when viewing the current year, otherwise
  // January of whatever year is selected.
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
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
        `/api/financial-reports/cash-flow?startDate=${startDate}&endDate=${endDate}`,
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
      setError(err.message || "Failed to load monthly finance report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const rows = [
      ["Month", "Income (Fees)", "Income (Donations)", "Total Income", "Total Expenses", "Net", "Cumulative"],
      ...data.monthlyCashFlow.map((m) => [
        `${MONTH_LABELS[m.month - 1]} ${m.year}`,
        m.inflow.fees.toFixed(2),
        m.inflow.donations.toFixed(2),
        m.inflow.total.toFixed(2),
        m.outflow.total.toFixed(2),
        m.netFlow.toFixed(2),
        m.cumulative.toFixed(2),
      ]),
      [],
      ["Summary", ""],
      ["Total Income", data.summary.totalInflow.toFixed(2)],
      ["Total Expenses", data.summary.totalOutflow.toFixed(2)],
      ["Net Cash Flow", data.summary.netCashFlow.toFixed(2)],
      ["Average Monthly Flow", data.summary.averageMonthlyFlow.toFixed(2)],
      ["Ending Balance", data.summary.endingBalance.toFixed(2)],
    ].map((row) => row.join(",")).join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-finance-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildExportOptions = () => {
    if (!data) return null;
    const monthData = data.monthlyCashFlow.find((m) => m.month === selectedMonth) || data.monthlyCashFlow[0];
    const monthLabel = `${MONTH_LABELS[selectedMonth - 1]} ${year}`;
    const monthCategoryEntries = Object.entries(monthData.outflow.byCategory).sort((a, b) => b[1] - a[1]);

    return {
      title: "Monthly Finance Report",
      subtitle: `${monthLabel} — full year ${year} shown below`,
      filename: `monthly-finance-report-${year}-${String(selectedMonth).padStart(2, '0')}`,
      summary: [
        { label: `Income (${monthLabel})`, value: `RM${monthData.inflow.total.toLocaleString()}` },
        { label: `Expenses (${monthLabel})`, value: `RM${monthData.outflow.total.toLocaleString()}` },
        {
          label: `Net (${monthLabel})`,
          value: `${monthData.netFlow >= 0 ? "+" : ""}RM${monthData.netFlow.toLocaleString()}`,
        },
        { label: "Running Balance", value: `RM${monthData.cumulative.toLocaleString()}` },
      ],
      sections: [
        ...(monthCategoryEntries.length
          ? [
              {
                heading: `Expenses by Category — ${monthLabel}`,
                columns: ["Category", "Amount"],
                rows: monthCategoryEntries.map(([category, amount]) => [category, `RM${amount.toLocaleString()}`]),
              },
            ]
          : []),
        {
          heading: `Monthly Breakdown — All of ${year}`,
          columns: ["Month", "Fees", "Donations", "Total Income", "Expenses", "Net", "Cumulative"],
          rows: [
            ...data.monthlyCashFlow.map((m) => [
              `${MONTH_LABELS[m.month - 1]} ${m.year}`,
              `RM${m.inflow.fees.toLocaleString()}`,
              `RM${m.inflow.donations.toLocaleString()}`,
              `RM${m.inflow.total.toLocaleString()}`,
              `RM${m.outflow.total.toLocaleString()}`,
              `${m.netFlow >= 0 ? "+" : ""}RM${m.netFlow.toLocaleString()}`,
              `RM${m.cumulative.toLocaleString()}`,
            ]),
            [
              "Total",
              `RM${data.monthlyCashFlow.reduce((s, m) => s + m.inflow.fees, 0).toLocaleString()}`,
              `RM${data.monthlyCashFlow.reduce((s, m) => s + m.inflow.donations, 0).toLocaleString()}`,
              `RM${data.summary.totalInflow.toLocaleString()}`,
              `RM${data.summary.totalOutflow.toLocaleString()}`,
              `${data.summary.netCashFlow >= 0 ? "+" : ""}RM${data.summary.netCashFlow.toLocaleString()}`,
              `RM${data.summary.endingBalance.toLocaleString()}`,
            ],
          ],
        },
      ],
    };
  };

  const handleExportExcel = () => {
    const opts = buildExportOptions();
    if (opts) exportReportToExcel(opts);
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

  const chartData = data.monthlyCashFlow.map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    Income: m.inflow.total,
    Expenses: m.outflow.total,
    Balance: m.cumulative,
  }));

  const selectedMonthData =
    data.monthlyCashFlow.find((m) => m.month === selectedMonth) || data.monthlyCashFlow[0];
  const monthLabel = `${MONTH_LABELS[selectedMonth - 1]} ${year}`;
  const monthCategoryEntries = Object.entries(selectedMonthData.outflow.byCategory).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Finance Report</h1>
          <p className="text-gray-500">Pick a month for its summary, or scan the full year below</p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={year.toString()}
            onValueChange={(value) => {
              const newYear = parseInt(value);
              setYear(newYear);
              // If we just switched away from the current year, there's no
              // "current month" in that year anymore -- fall back to January.
              if (newYear !== now.getFullYear()) setSelectedMonth(1);
              else setSelectedMonth(now.getMonth() + 1);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, idx) => (
                <SelectItem key={label} value={(idx + 1).toString()}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline">
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

      <PrintLayout title="Monthly Finance Report" filters={{ "Fiscal Year": year.toString(), Month: monthLabel }}>
      {/* Month Summary Cards */}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-3">Summary for {monthLabel}</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                RM{selectedMonthData.inflow.total.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fees RM{selectedMonthData.inflow.fees.toLocaleString()} + Donations RM
                {selectedMonthData.inflow.donations.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                RM{selectedMonthData.outflow.total.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Approved &amp; paid expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${selectedMonthData.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {selectedMonthData.netFlow >= 0 ? "+" : ""}RM{selectedMonthData.netFlow.toLocaleString()}
              </div>
              <div className="flex items-center mt-1">
                {selectedMonthData.netFlow >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Running Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                RM{selectedMonthData.cumulative.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Cumulative through {monthLabel}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {monthCategoryEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthCategoryEntries.map(([category, amount]) => (
                <div key={category} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-gray-600">{category}</span>
                  <span className="font-medium">RM{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Income vs. Expenses — All of {year}</CardTitle>
          <CardDescription>Monthly totals with running cumulative balance, for context</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `RM${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" />
              <Bar dataKey="Expenses" fill="#ef4444" />
              <Line type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown — All of {year}</CardTitle>
          <CardDescription>Income sources, expenses, and running balance (selected month highlighted)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Month</th>
                  <th className="text-right p-3">Fees</th>
                  <th className="text-right p-3">Donations</th>
                  <th className="text-right p-3">Total Income</th>
                  <th className="text-right p-3">Expenses</th>
                  <th className="text-right p-3">Net</th>
                  <th className="text-right p-3">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyCashFlow.map((m) => (
                  <tr
                    key={`${m.year}-${m.month}`}
                    onClick={() => setSelectedMonth(m.month)}
                    className={`border-b cursor-pointer hover:bg-gray-50 ${
                      m.month === selectedMonth ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="p-3">{MONTH_LABELS[m.month - 1]} {m.year}</td>
                    <td className="text-right p-3">RM{m.inflow.fees.toLocaleString()}</td>
                    <td className="text-right p-3">RM{m.inflow.donations.toLocaleString()}</td>
                    <td className="text-right p-3 font-medium">RM{m.inflow.total.toLocaleString()}</td>
                    <td className="text-right p-3">RM{m.outflow.total.toLocaleString()}</td>
                    <td className={`text-right p-3 font-medium ${m.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.netFlow >= 0 ? "+" : ""}RM{m.netFlow.toLocaleString()}
                    </td>
                    <td className="text-right p-3">RM{m.cumulative.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="p-3">Total</td>
                  <td className="text-right p-3">
                    RM{data.monthlyCashFlow.reduce((sum, m) => sum + m.inflow.fees, 0).toLocaleString()}
                  </td>
                  <td className="text-right p-3">
                    RM{data.monthlyCashFlow.reduce((sum, m) => sum + m.inflow.donations, 0).toLocaleString()}
                  </td>
                  <td className="text-right p-3">RM{data.summary.totalInflow.toLocaleString()}</td>
                  <td className="text-right p-3">RM{data.summary.totalOutflow.toLocaleString()}</td>
                  <td className="text-right p-3">
                    {data.summary.netCashFlow >= 0 ? "+" : ""}RM{data.summary.netCashFlow.toLocaleString()}
                  </td>
                  <td className="text-right p-3">RM{data.summary.endingBalance.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      </PrintLayout>
    </div>
  );
}
