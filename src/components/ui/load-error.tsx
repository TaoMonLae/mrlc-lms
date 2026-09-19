import { Button } from '@/components/ui/button';
export function LoadError({ title, message, onRetry }: { title?: string; message: string; onRetry: () => void }) {
  return <section className="rounded-lg border border-destructive/30 bg-card p-5 space-y-3" role="alert">
    {title && <h1 className="text-xl font-semibold text-foreground">{title}</h1>}
    <p className="text-sm text-muted-foreground">{message}</p>
    <Button variant="outline" onClick={onRetry}>Retry</Button>
  </section>;
}
