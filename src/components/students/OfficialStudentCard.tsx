import React from 'react';
import { Link } from 'react-router';
import { CreditCard, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/src/lib/api';
import { officialDocumentViewPath } from '@/shared/officialDocuments';

type StudentCardDocument = {
  id: string;
  documentNumber: string;
  verifyToken: string;
  type: 'STUDENT_ID_CARD';
  status: string;
  issueDate: string;
  className?: string | null;
  term?: string | null;
};

type OfficialStudentCardProps = {
  /** Omit for the signed-in learner; pass an ID on a staff-facing student profile. */
  studentId?: string;
};

export function OfficialStudentCard({ studentId }: OfficialStudentCardProps) {
  const [cards, setCards] = React.useState<StudentCardDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type: 'STUDENT_ID_CARD', status: 'ACTIVE' });
    if (studentId) params.set('studentId', studentId);
    const endpoint = studentId ? `/api/documents?${params}` : `/api/student/documents?${params}`;

    setLoading(true);
    setError(false);
    apiGet<StudentCardDocument[]>(endpoint, { signal: controller.signal })
      .then((documents) => setCards(Array.isArray(documents) ? documents : []))
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [studentId, reloadKey]);

  const card = cards[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white shadow-sm dark:border-indigo-400/20">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <CreditCard className="size-6 text-violet-200" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">Official Student Card</h2>
              {card && <Badge className="border-0 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15"><ShieldCheck className="size-3" /> Active</Badge>}
            </div>
            {loading ? (
              <p className="mt-1 text-sm text-white/65">Checking for your issued card…</p>
            ) : error ? (
              <p className="mt-1 text-sm text-rose-200">The card could not be loaded. Your issued card has not been removed.</p>
            ) : card ? (
              <div className="mt-1 space-y-0.5 text-sm text-white/70">
                <p className="truncate font-mono text-xs text-white/85">{card.documentNumber}</p>
                <p>Issued {new Date(card.issueDate).toLocaleDateString()}{card.className ? ` · ${card.className}` : ''}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-white/65">No active student card has been issued yet. It will appear here automatically after generation.</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {error && (
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          )}
          {card && (
            <>
              <Button className="bg-white text-indigo-950 hover:bg-indigo-50" render={<Link to={officialDocumentViewPath(card)} />} nativeButton={false}>
                <CreditCard className="size-4" /> View / Print Card
              </Button>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label="Open public verification page" render={<a href={`/verify/${card.verifyToken}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                <ExternalLink className="size-4" /> Verify
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
