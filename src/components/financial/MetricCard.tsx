import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "default" | "compact";
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  variant = "default",
  size = "default"
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800";
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800";
      case "danger":
        return "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
      case "info":
        return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
      default:
        return "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700";
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case "up":
        return <ArrowUp className="w-3 h-3" />;
      case "down":
        return <ArrowDown className="w-3 h-3" />;
      case "neutral":
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-gray-500";

    switch (trend.direction) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "neutral":
        return "text-gray-500";
    }
  };

  if (size === "compact") {
    return (
      <Card className={cn("border-0 shadow-sm", getVariantStyles(), className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && <div className="text-gray-500">{icon}</div>}
              <div>
                <p className="text-xs text-gray-500">{title}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            </div>
            {trend && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(getVariantStyles(), className)}>
      <CardHeader className={cn("pb-2", size === "default" ? "" : "pb-1")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("text-sm font-medium", size === "default" ? "" : "text-xs")}>
            {title}
          </CardTitle>
          {icon && <div className="text-gray-500">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("font-bold", size === "default" ? "text-2xl" : "text-xl")}>
          {value}
        </div>

        {(description || trend) && (
          <div className="mt-2 flex items-center justify-between">
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
            {trend && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(trend.value)}%</span>
                {trend.label && <span className="ml-1">{trend.label}</span>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized metric cards for financial data
export function FinancialMetricCard({
  title,
  amount,
  currency = "RM",
  description,
  trend,
  icon,
  className,
}: {
  title: string;
  amount: number;
  currency?: string;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  className?: string;
}) {
  const formatAmount = (value: number) => {
    return `${currency}${value.toLocaleString()}`;
  };

  return (
    <MetricCard
      title={title}
      value={formatAmount(amount)}
      description={description}
      trend={trend}
      icon={icon}
      className={className}
    />
  );
}

export function PercentageMetricCard({
  title,
  value,
  description,
  threshold = 80,
  icon,
  className,
}: {
  title: string;
  value: number;
  description?: string;
  threshold?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  const getVariant = () => {
    if (value >= threshold) return "danger";
    if (value >= threshold * 0.8) return "warning";
    return "success";
  };

  return (
    <MetricCard
      title={title}
      value={`${value.toFixed(1)}%`}
      description={description}
      icon={icon}
      variant={getVariant()}
      className={className}
    />
  );
}

export function CountMetricCard({
  title,
  count,
  description,
  icon,
  className,
}: {
  title: string;
  count: number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <MetricCard
      title={title}
      value={count}
      description={description}
      icon={icon}
      className={className}
    />
  );
}
