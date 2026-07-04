import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download, TrendingUp, TrendingDown } from "lucide-react";

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
  };
  expenses: {
    total: number;
    byCategory: Array<{
      category: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
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
  }, [year, hasPermission]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const response = await fetch(
        `/api/financial-reports/income-expense?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Failed to load financial report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income & Expense Report</h1>
          <p className="text-gray-500">Analyze financial performance and trends</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-32">
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
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Detailed Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Detailed view of expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-right p-3">Count</th>
                  <th className="text-right p-3">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.byCategory.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">{item.category}</td>
                    <td className="text-right p-3">RM{item.amount.toLocaleString()}</td>
                    <td className="text-right p-3">{item.count}</td>
                    <td className="text-right p-3">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="p-3">Total</td>
                  <td className="text-right p-3">RM{data.expenses.total.toLocaleString()}</td>
                  <td className="text-right p-3">
                    {data.expenses.byCategory.reduce((sum, item) => sum + item.count, 0)}
                  </td>
                  <td className="text-right p-3">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
