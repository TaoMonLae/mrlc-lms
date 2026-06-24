import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBadge, ExternalLink, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';

const TYPE_LABELS: Record<string, string> = {
  REPORT_CARD: 'Term Report Card',
  TRANSCRIPT: 'Academic Transcript',
  ENROLLMENT_CONFIRMATION: 'Enrollment Confirmation',
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  PROGRESS_REPORT: 'Student Progress Report',
};

type Doc = {
  id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  term: string | null; issueDate: string;
};

const statusStyle = (s: string) =>
  s === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : s === 'REISSUED' ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700';

export default function StudentDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Doc[]>('/api/student/documents')
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Failed to load your documents'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileBadge className="h-6 w-6 text-aubergine-600" /> My Documents
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Your official report cards, transcripts and certificates.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-dashed border-slate-200 dark:border-surface-raised rounded-xl p-10 text-center text-slate-500">
          No documents have been issued to you yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((d) => (
            <div key={d.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{TYPE_LABELS[d.type] || d.type}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{d.documentNumber}</p>
                </div>
                <Badge className={`${statusStyle(d.status)} border-0 shrink-0`}>{d.status}</Badge>
              </div>
              <div className="text-xs text-slate-500 space-y-1 mb-4">
                {d.term && <p>Term: <span className="font-medium text-slate-700 dark:text-slate-300">{d.term}</span></p>}
                <p>Issued: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(d.issueDate).toLocaleDateString()}</span></p>
              </div>
              <div className="mt-auto flex gap-2">
                <Button size="sm" className="bg-primary text-primary-foreground flex-1" render={<Link to={`/documents/${d.id}/print`} />} nativeButton={false}>
                  <Eye className="h-4 w-4 mr-1" /> Open / Download
                </Button>
                <Button size="sm" variant="outline" render={<a href={`/verify/${d.verifyToken}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
