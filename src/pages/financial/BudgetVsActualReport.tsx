import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { BudgetComparisonCard, BudgetProgress, BudgetHealthIndicator } from "@/src/components/financial/BudgetProgress";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    budgets: BudgetComparison[];
    summary: Summary;
  } | null>(null);
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

      const response = await fetch(
        `/api/financial-reports/budget-vs-actual?fiscalYear=${year}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Failed to load budget report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
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
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-vs-actual-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getVarianceColor = (favorable: boolean) => {
    return favorable ? "text-green-600" : "text-red-600";
  };

  const getHealthStatus = (utilization: number) => {
    if (utilization >= 100) return { icon: "⚠️", text: "Exceeded", color: "red" };
    if (utilization >= 90) return { icon: "⚡", text: "Warning", color: "yellow" };
    if (utilization >= 70) return { icon: "✓", text: "On Track", color: "green" };
    return { icon: "○", text: "Under", color: "blue" };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget vs Actual Report</h1>
          <p className="text-gray-500">Compare budgeted amounts with actual spending</p>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM{data.summary.totalAllocated.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Budgeted amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              RM{data.summary.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              According to budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM{data.summary.totalActualExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recorded expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.summary.totalVariance >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {data.summary.totalVariance >= 0 ? "+" : ""}
              RM{data.summary.totalVariance.toLocaleString()}
            </div>
            <div className="flex items-center mt-1">
              {data.summary.totalVariance >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <p className="text-xs text-gray-500">
                {data.summary.totalVariance >= 0 ? "Under budget" : "Over budget"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.overallUtilization.toFixed(1)}%
            </div>
            <BudgetHealthIndicator
              utilization={data.summary.overallUtilization}
              showLabel={false}
              size="small"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.budgets.map((budget) => {
              const health = getHealthStatus(budget.utilization);
              return (
                <BudgetComparisonCard
                  key={budget.id}
                  name={budget.name}
                  budget={budget.budget.allocated}
                  actual={budget.actual.expenses}
                  variance={budget.variance.amount}
                  fiscalYear={budget.fiscalYear}
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
                          RM{budget.budget.allocated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          RM{budget.budget.spent.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          RM{budget.actual.expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getVarianceColor(budget.variance.favorable)}`}>
                          {budget.variance.amount >= 0 ? "+" : ""}
                          RM{budget.variance.amount.toLocaleString()}
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
                          <div className={cn("flex items-center gap-2", `text-${health.color}-600`)}>
                            <span className="text-lg">{health.icon}</span>
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

      {/* Summary Footer */}
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
                {data.budgets.filter(b => b.variance.amount < 0).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">On Track</p>
              <p className="text-2xl font-bold text-green-600">
                {data.budgets.filter(b => b.variance.amount >= 0 && b.variance.amount < b.budget.allocated * 0.1).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Under Budget</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.budgets.filter(b => b.variance.amount > 0).length}
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
  );
}
