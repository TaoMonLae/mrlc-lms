/**
 * Loading Skeleton Components for consistent loading states
 */

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "text" | "circular" | "rectangular";
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    default: "rounded-md",
    text: "h-4 w-full rounded",
    circular: "h-12 w-12 rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-700",
        variantStyles[variant],
        className
      )}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" variant="rectangular" />
        <Skeleton className="h-10 w-24" variant="rectangular" />
        <Skeleton className="h-10 w-24" variant="rectangular" />
        <Skeleton className="h-10 w-24" variant="rectangular" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-16 flex-1" variant="rectangular" />
          <Skeleton className="h-16 w-24" variant="rectangular" />
          <Skeleton className="h-16 w-24" variant="rectangular" />
          <Skeleton className="h-16 w-24" variant="rectangular" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-12" variant="circular" />
        <Skeleton className="h-8 w-24" variant="rectangular" />
      </div>
      <Skeleton className="h-6 w-3/4" variant="text" />
      <Skeleton className="h-4 w-full" variant="text" />
      <Skeleton className="h-4 w-2/3" variant="text" />
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fieldCount = 4 }: { fieldCount?: number }) {
  return (
    <div className="space-y-6 p-6">
      {Array.from({ length: fieldCount }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" variant="text" />
          <Skeleton className="h-10 w-full" variant="rectangular" />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 flex-1" variant="rectangular" />
        <Skeleton className="h-10 w-24" variant="rectangular" />
      </div>
    </div>
  );
}

/**
 * Stats Card Skeleton
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-20" variant="text" />
        <Skeleton className="h-10 w-10" variant="circular" />
      </div>
      <Skeleton className="h-8 w-16" variant="text" />
      <Skeleton className="h-4 w-24" variant="text" />
    </div>
  );
}

/**
 * Page Loading Skeleton
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" variant="rectangular" />
        <Skeleton className="h-4 w-96" variant="text" />
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700">
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}

export { Skeleton };
