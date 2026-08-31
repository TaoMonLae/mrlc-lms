import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { BudgetComparisonCard, BudgetHealthIndicator } from "@/src/components/financial/BudgetProgress";
import { cn } from "@/lib/utils";
import { exportReportToExcel } from "@/src/lib/exportReport";
import { PrintLayout } from "../../components/reports/PrintLayout";
import { formatMoney } from "../../lib/locale";
import { useSettings } from "../../providers/SettingsProvider";

const REPORT_YEARS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() + 1 - index);

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

interface BudgetComparison {
  id: string;
  name: string;
  code: string;
  category: string;
  fiscalYear: number;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
  };
  actual: {
    expenses: number;
  };
  variance: {
    amount: number;
    percentage: number;
    favorable: boolean;
  };
  status: string;
  utilization: number;
}

interface Summary {
  totalAllocated: number;
  totalSpent: number;
  totalActualExpenses: number;
  totalVariance: number;
  overallUtilization: number;
}

export default function BudgetVsActualReport() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    budgets: BudgetComparison[];
    summary: Summary;
  } | null>(null);
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

      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(
        `/api/financial-reports/budget-vs-actual?fiscalYear=${year}`,
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
      setError(err.message || "Failed to load budget report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;

    const csvContent = [
      ["Budget", "Category", "Allocated", "Spent", "Actual Expenses", "Variance", "Variance %", "Utilization", "Status"],
      ...data.budgets.map(budget => [
        budget.name,
        budget.category || "-",
        budget.budget.allocated.toFixed(2),
        budget.budget.spent.toFixed(2),
        budget.actual.expenses.toFixed(2),
        budget.variance.amount.toFixed(2),
        budget.variance.percentage.toFixed(1) + "%",
        budget.utilization.toFixed(1) + "%",
        budget.status,
      ]),
      [],
      ["SUMMARY", ""],
      ["Total Allocated", data.summary.totalAllocated.toFixed(2)],
      ["Total Spent", data.summary.totalSpent.toFixed(2)],
      ["Total Actual Expenses", data.summary.totalActualExpenses.toFixed(2)],
      ["Total Variance", data.summary.totalVariance.toFixed(2)],
      ["Overall Utilization", data.summary.overallUtilization.toFixed(1) + "%"]
    ].map(row => row.map(csvCell).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-vs-actual-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!data) return;

    exportReportToExcel({
      title: "Budget vs Actual Report",
      subtitle: `Fiscal Year ${year}`,
      filename: `budget-vs-actual-${year}`,
      summary: [
        { label: "Total Allocated", value: formatMoney(data.summary.totalAllocated, currency) },
        { label: "Total Actual Expenses", value: formatMoney(data.summary.totalActualExpenses, currency) },
        {
          label: "Total Variance",
          value: `${data.summary.totalVariance >= 0 ? "+" : ""}${formatMoney(data.summary.totalVariance, currency)}`,
        },
        { label: "Overall Utilization", value: `${data.summary.overallUtilization.toFixed(1)}%` },
      ],
      sections: [
        {
          heading: "Budgets",
          columns: ["Budget", "Category", "Allocated", "Spent", "Actual", "Variance", "Variance %", "Utilization", "Status"],
          rows: data.budgets.map((budget) => [
            budget.name,
            budget.category || "-",
            formatMoney(budget.budget.allocated, currency),
            formatMoney(budget.budget.spent, currency),
            formatMoney(budget.actual.expenses, currency),
            `${budget.variance.amount >= 0 ? "+" : ""}${formatMoney(budget.variance.amount, currency)}`,
            `${budget.variance.percentage.toFixed(1)}%`,
            `${budget.utilization.toFixed(1)}%`,
            budget.status,
          ]),
        },
      ],
    });
  };

  const getVarianceColor = (favorable: boolean) => {
    return favorable ? "text-academic-teal" : "text-academic-coral";
  };

  const getHealthStatus = (utilization: number) => {
    if (utilization >= 100) return { marker: "!", text: "Exceeded", className: "text-academic-coral" };
    if (utilization >= 90) return { marker: "•", text: "Watch", className: "text-academic-gold-foreground" };
    return { marker: "✓", text: "On track", className: "text-academic-teal" };
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

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget vs Actual Report</h1>
          <p className="text-gray-500">Compare budgeted amounts with actual spending</p>
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

      {/* Interactive screen-only view */}
      <div className="print:hidden space-y-6">
        <section className="grid border border-foreground bg-card sm:grid-cols-2 xl:grid-cols-5" aria-label="Budget position summary">
          {[
            ["Approved allocation", formatMoney(data.summary.totalAllocated, currency), "Budget register"],
            ["Ledger spend", formatMoney(data.summary.totalSpent, currency), "Posted to budgets"],
            ["Actual expenses", formatMoney(data.summary.totalActualExpenses, currency), "Gross approved invoices"],
            ["Variance", `${data.summary.totalVariance >= 0 ? "+" : ""}${formatMoney(data.summary.totalVariance, currency)}`, data.summary.totalVariance >= 0 ? "Headroom" : "Over budget"],
            ["Utilization", `${data.summary.overallUtilization.toFixed(1)}%`, `${data.budgets.length} active records`],
          ].map(([label, value, note], index) => (
            <div key={label} className={cn("min-w-0 px-5 py-5", index && "border-t border-foreground sm:border-l sm:border-t-0", index === 2 && "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0")}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
              <p className={cn("mt-2 truncate font-mono text-lg font-semibold tabular-nums", label === "Variance" && (data.summary.totalVariance >= 0 ? "text-academic-teal" : "text-academic-coral"))}>{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </section>

        <Tabs defaultValue="cards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cards">Card View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.budgets.map((budget) => {
                return (
                  <BudgetComparisonCard
                    key={budget.id}
                    name={budget.name}
                    budget={budget.budget.allocated}
                    actual={budget.actual.expenses}
                    variance={budget.variance.amount}
                    fiscalYear={budget.fiscalYear}
                    currency={currency}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Budget</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.budgets.map((budget) => {
                      const health = getHealthStatus(budget.utilization);
                      return (
                        <TableRow key={budget.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{budget.name}</div>
                              <div className="text-xs text-gray-500">{budget.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {budget.category && (
                              <Badge variant="outline">{budget.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(budget.budget.allocated, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(budget.budget.spent, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(budget.actual.expenses, currency)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${getVarianceColor(budget.variance.favorable)}`}>
                            {budget.variance.amount >= 0 ? "+" : ""}
                            {formatMoney(budget.variance.amount, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {budget.variance.percentage.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {budget.utilization.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{budget.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-2", health.className)}>
                              <span className="font-mono text-sm font-bold">{health.marker}</span>
                              <span className="text-xs">{health.text}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Overall budget performance for {year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Budgets</p>
                <p className="text-2xl font-bold">{data.budgets.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Over Budget</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.budgets.filter(b => b.utilization >= 100).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">On Track</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.budgets.filter(b => b.utilization >= 70 && b.utilization < 100).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Under Budget</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.budgets.filter(b => b.utilization < 70).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Health</p>
                <BudgetHealthIndicator
                  utilization={data.summary.overallUtilization}
                  threshold={90}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print-only branded view */}
      <div className="hidden print:block">
        <PrintLayout title="Budget vs Actual Report" filters={{ "Fiscal Year": year.toString() }}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Allocated</p>
              <p className="text-lg font-bold mt-1">{formatMoney(data.summary.totalAllocated, currency)}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Actual Expenses</p>
              <p className="text-lg font-bold mt-1">{formatMoney(data.summary.totalActualExpenses, currency)}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Variance</p>
              <p className={`text-lg font-bold mt-1 ${data.summary.totalVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {data.summary.totalVariance >= 0 ? "+" : ""}{formatMoney(data.summary.totalVariance, currency)}
              </p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Utilization</p>
              <p className="text-lg font-bold mt-1">{data.summary.overallUtilization.toFixed(1)}%</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Budgets</p>
              <p className="text-lg font-bold mt-1">{data.budgets.length}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Budget</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Allocated</th>
                <th className="text-right p-2">Spent</th>
                <th className="text-right p-2">Actual</th>
                <th className="text-right p-2">Variance</th>
                <th className="text-right p-2">Utilization</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.budgets.map((budget) => (
                <tr key={budget.id}>
                  <td className="p-2">{budget.name} <span className="text-slate-500">({budget.code})</span></td>
                  <td className="p-2">{budget.category || "-"}</td>
                  <td className="text-right p-2">{formatMoney(budget.budget.allocated, currency)}</td>
                  <td className="text-right p-2">{formatMoney(budget.budget.spent, currency)}</td>
                  <td className="text-right p-2">{formatMoney(budget.actual.expenses, currency)}</td>
                  <td className="text-right p-2">
                    {budget.variance.amount >= 0 ? "+" : ""}{formatMoney(budget.variance.amount, currency)} ({budget.variance.percentage.toFixed(1)}%)
                  </td>
                  <td className="text-right p-2">{budget.utilization.toFixed(1)}%</td>
                  <td className="p-2">{budget.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2" colSpan={2}>Total</td>
                <td className="text-right p-2">{formatMoney(data.summary.totalAllocated, currency)}</td>
                <td className="text-right p-2">{formatMoney(data.summary.totalSpent, currency)}</td>
                <td className="text-right p-2">{formatMoney(data.summary.totalActualExpenses, currency)}</td>
                <td className="text-right p-2">
                  {data.summary.totalVariance >= 0 ? "+" : ""}{formatMoney(data.summary.totalVariance, currency)}
                </td>
                <td className="text-right p-2">{data.summary.overallUtilization.toFixed(1)}%</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </PrintLayout>
      </div>
    </div>
  );
}
