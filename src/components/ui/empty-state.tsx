/**
 * Empty State Component for consistent empty data displays
 */

import { cn } from "@/lib/utils";
import { type SVGProps } from "react";

interface EmptyStateProps {
  icon?: React.ComponentType<SVGProps<SVGSVGElement>> | React.FC<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

/**
 * Specific empty state variants
 */
export function EmptyListState({
  itemName = "items",
  action,
}: {
  itemName?: string;
  action?: React.ReactNode;
}) {
  return (
    <EmptyState
      icon={() => (
        <svg
          className="h-12 w-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      )}
      title={`No ${itemName} found`}
      description={`Get started by creating your first ${itemName.slice(0, -1)}.`}
      action={action}
    />
  );
}

export function EmptySearchState({
  searchTerm,
  onClear,
}: {
  searchTerm: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={() => (
        <svg
          className="h-12 w-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}".`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-sm font-medium text-aubergine-600 hover:text-aubergine-700"
          >
            Clear search
          </button>
        )
      }
    />
  );
}
