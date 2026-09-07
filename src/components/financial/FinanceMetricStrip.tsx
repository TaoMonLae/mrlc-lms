// Adapted from the project's licensed React Bits Pro dashboard-11 pattern.
// Live financial figures are never tweened; motion affects only the container.
import { motion, useReducedMotion } from 'motion/react';
export function FinanceMetricStrip({ items }: { items: { label: string; value: string; note: string; attention?: boolean }[] }) {
  const reduced = useReducedMotion();
  return <motion.section aria-label="Financial position" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
    {items.map(item => <div key={item.label} className="min-w-0 bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
      <p className={`mt-3 break-words text-2xl font-semibold tabular-nums tracking-tight ${item.attention ? 'text-academic-coral' : 'text-foreground'}`}>{item.value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
    </div>)}
  </motion.section>;
}
