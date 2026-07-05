import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  utilization?: number;
  status?: string;
  currency?: string;
  size?: "default" | "compact";
  showLabels?: boolean;
  className?: string;
}

export function BudgetProgress({
  name,
  allocated,
  spent,
  remaining,
  utilization,
  status,
  currency = "RM",
  size = "default",
  showLabels = true,
  className,
}: BudgetProgressProps) {
  // `??` not `||`: a legitimate 0% utilization must not trigger recomputation,
  // and dividing by a zero allocation would produce NaN/Infinity.
  const calculatedUtilization = utilization ?? (allocated > 0 ? (spent / allocated) * 100 : 0);

  const getStatusColor = () => {
    if (calculatedUtilization >= 100) return "text-red-600 bg-red-100";
    if (calculatedUtilization >= 80) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getStatusIcon = () => {
    if (calculatedUtilization >= 100) return <AlertTriangle className="w-3 h-3" />;
    if (calculatedUtilization >= 80) return <Clock className="w-3 h-3" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  const getProgressColor = () => {
    if (calculatedUtilization >= 100) return "bg-red-500";
    if (calculatedUtilization >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (size === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{name}</span>
          <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
            {calculatedUtilization.toFixed(1)}%
          </Badge>
        </div>
        <Progress value={Math.min(calculatedUtilization, 100)} className="h-2" />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={cn("pb-3", size === "default" ? "" : "pb-2")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(size === "default" ? "" : "text-sm")}>{name}</CardTitle>
          {status && (
            <Badge variant="outline" className="text-xs">
              {status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress
            value={Math.min(calculatedUtilization, 100)}
            className={cn("h-3", getProgressColor())}
          />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={cn("font-medium", getStatusColor())}>
                {calculatedUtilization.toFixed(1)}% utilized
              </span>
            </div>
            <span className="text-gray-500">
              of {currency}{allocated.toLocaleString()}
            </span>
          </div>
        </div>

        {showLabels && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-gray-500">Allocated</p>
              <p className="text-sm font-semibold">
                {currency}{allocated.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-sm font-semibold text-red-600">
                {currency}{spent.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-sm font-semibold text-green-600">
                {currency}{remaining.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Budget comparison card for showing budget vs actual
interface BudgetComparisonCardProps {
  name: string;
  budget: number;
  actual: number;
  variance: number;
  fiscalYear?: number;
  currency?: string;
  showVariance?: boolean;
  className?: string;
}

export function BudgetComparisonCard({
  name,
  budget,
  actual,
  variance,
  fiscalYear,
  currency = "RM",
  showVariance = true,
  className,
}: BudgetComparisonCardProps) {
  const utilization = budget > 0 ? (actual / budget) * 100 : 0;
  const isOverBudget = actual > budget;
  const isUnderBudget = actual < budget;

  const getVarianceColor = () => {
    if (isOverBudget) return "text-red-600";
    if (isUnderBudget) return "text-green-600";
    return "text-gray-600";
  };

  const getVarianceIcon = () => {
    if (isOverBudget) return "↑";
    if (isUnderBudget) return "↓";
    return "=";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{name}</CardTitle>
          {fiscalYear && (
            <Badge variant="outline" className="text-xs">
              {fiscalYear}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Budget</span>
            <span className="font-semibold">
              {currency}{budget.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Actual</span>
            <span className={cn("font-semibold", isOverBudget ? "text-red-600" : "text-green-600")}>
              {currency}{actual.toLocaleString()}
            </span>
          </div>
          {showVariance && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-gray-500">Variance</span>
              <div className={cn("flex items-center gap-1 font-semibold", getVarianceColor())}>
                <span>{getVarianceIcon()}</span>
                <span>{currency}{Math.abs(variance).toLocaleString()}</span>
                <span className="text-xs text-gray-500">
                  ({budget > 0 ? Math.abs((variance / budget) * 100).toFixed(1) : "0.0"}%)
                </span>
              </div>
            </div>
          )}
        </div>

        <Progress
          value={Math.min(utilization, 100)}
          className={cn(
            "h-2",
            isOverBudget ? "bg-red-500" : utilization > 80 ? "bg-yellow-500" : "bg-green-500"
          )}
        />
      </CardContent>
    </Card>
  );
}

// Budget health indicator
interface BudgetHealthIndicatorProps {
  utilization: number;
  threshold?: number;
  warningThreshold?: number;
  showLabel?: boolean;
  size?: "default" | "small";
}

export function BudgetHealthIndicator({
  utilization,
  threshold = 100,
  warningThreshold = 80,
  showLabel = true,
  size = "default"
}: BudgetHealthIndicatorProps) {
  const getHealthStatus = () => {
    if (utilization >= threshold) return { status: "exceeded", color: "red", icon: "⚠️" };
    if (utilization >= warningThreshold) return { status: "warning", color: "yellow", icon: "⚡" };
    return { status: "healthy", color: "green", icon: "✓" };
  };

  const health = getHealthStatus();

  if (size === "small") {
    return (
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full bg-${health.color}-500`} />
        {showLabel && (
          <span className={`text-xs text-${health.color}-600 capitalize`}>
            {health.status}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", `text-${health.color}-600`)}>
      <span className={`w-3 h-3 rounded-full bg-${health.color}-500`} />
      <span className="text-lg">{health.icon}</span>
      {showLabel && (
        <span className="font-medium capitalize">{health.status}</span>
      )}
      <span className="text-sm text-gray-500">({utilization.toFixed(1)}%)</span>
    </div>
  );
}
