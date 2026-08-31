import { AlertTriangle, Check, Clock3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/src/lib/locale";

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

function money(value: number, currency: string) {
  return /^[A-Z]{3}$/.test(currency) ? formatMoney(value, currency) : `${currency}${value.toLocaleString()}`;
}

function budgetTone(utilization: number) {
  if (utilization >= 100) {
    return { label: "Exceeded", text: "text-academic-coral", bar: "[&>div]:bg-academic-coral", Icon: AlertTriangle };
  }
  if (utilization >= 80) {
    return { label: "Watch", text: "text-academic-gold-foreground", bar: "[&>div]:bg-academic-gold", Icon: Clock3 };
  }
  return { label: "On track", text: "text-academic-teal", bar: "[&>div]:bg-academic-teal", Icon: Check };
}

export function BudgetProgress({
  name,
  allocated,
  spent,
  remaining,
  utilization,
  status,
  currency = "MYR",
  size = "default",
  showLabels = true,
  className,
}: BudgetProgressProps) {
  const calculatedUtilization = utilization ?? (allocated > 0 ? (spent / allocated) * 100 : 0);
  const tone = budgetTone(calculatedUtilization);

  if (size === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className={cn("font-mono text-xs font-semibold tabular-nums", tone.text)}>{calculatedUtilization.toFixed(1)}%</span>
        </div>
        <Progress
          value={Math.min(calculatedUtilization, 100)}
          className={cn("h-1.5 rounded-none bg-muted [&>div]:rounded-none", tone.bar)}
          aria-label={`${name}: ${calculatedUtilization.toFixed(1)} percent utilized`}
        />
      </div>
    );
  }

  return (
    <section className={cn("border border-foreground bg-card", className)} aria-label={`${name} budget position`}>
      <header className="flex items-start justify-between gap-4 border-b border-foreground px-5 py-4">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          {status && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{status}</p>}
        </div>
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", tone.text)}>
          <tone.Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {tone.label}
        </div>
      </header>
      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em]">{calculatedUtilization.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">of {money(allocated, currency)} allocated</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{money(remaining, currency)} remaining</p>
        </div>
        <Progress value={Math.min(calculatedUtilization, 100)} className={cn("mt-4 h-2 rounded-none bg-muted [&>div]:rounded-none", tone.bar)} />
      </div>
      {showLabels && (
        <dl className="grid grid-cols-3 border-t border-foreground">
          {[
            ["Allocated", allocated, "text-foreground"],
            ["Spent", spent, "text-foreground"],
            ["Remaining", remaining, remaining < 0 ? "text-academic-coral" : "text-academic-teal"],
          ].map(([label, value, valueClass], index) => (
            <div key={String(label)} className={cn("min-w-0 px-4 py-3", index && "border-l border-border")}>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
              <dd className={cn("mt-1 truncate font-mono text-xs font-semibold tabular-nums", String(valueClass))}>{money(Number(value), currency)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

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
  currency = "MYR",
  showVariance = true,
  className,
}: BudgetComparisonCardProps) {
  const utilization = budget > 0 ? (actual / budget) * 100 : 0;
  const tone = budgetTone(utilization);
  const favorable = variance >= 0;

  return (
    <section className={cn("border border-foreground bg-card", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-foreground px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          {fiscalYear && <p className="mt-1 font-mono text-[10px] text-muted-foreground">FY {fiscalYear}</p>}
        </div>
        <span className={cn("font-mono text-sm font-semibold tabular-nums", tone.text)}>{utilization.toFixed(1)}%</span>
      </header>
      <dl>
        {[
          ["Approved budget", budget, "text-foreground"],
          ["Actual expenses", actual, actual > budget ? "text-academic-coral" : "text-foreground"],
          ...(showVariance ? [[favorable ? "Headroom" : "Over budget", Math.abs(variance), favorable ? "text-academic-teal" : "text-academic-coral"]] : []),
        ].map(([label, value, valueClass], index) => (
          <div key={String(label)} className={cn("flex items-center justify-between gap-4 px-5 py-3 text-sm", index && "border-t border-border")}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("font-mono font-semibold tabular-nums", String(valueClass))}>{money(Number(value), currency)}</dd>
          </div>
        ))}
      </dl>
      <Progress value={Math.min(utilization, 100)} className={cn("h-1.5 rounded-none bg-muted [&>div]:rounded-none", tone.bar)} />
    </section>
  );
}

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
  size = "default",
}: BudgetHealthIndicatorProps) {
  const health = utilization >= threshold
    ? { status: "Exceeded", dot: "bg-academic-coral", text: "text-academic-coral" }
    : utilization >= warningThreshold
      ? { status: "Watch", dot: "bg-academic-gold", text: "text-academic-gold-foreground" }
      : { status: "On track", dot: "bg-academic-teal", text: "text-academic-teal" };

  return (
    <div className={cn("flex items-center gap-2", health.text, size === "small" ? "text-xs" : "text-sm")}>
      <span className={cn("shrink-0", health.dot, size === "small" ? "h-2 w-2" : "h-2.5 w-2.5")} aria-hidden="true" />
      {showLabel && <span className="font-semibold">{health.status}</span>}
      {size !== "small" && <span className="font-mono text-xs text-muted-foreground">{utilization.toFixed(1)}%</span>}
    </div>
  );
}
