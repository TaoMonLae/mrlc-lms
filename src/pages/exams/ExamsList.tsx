import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, MoreHorizontal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DirectoryColumns, DirectoryRow, DirectorySearch, type ExamAccess } from '../../components/exams/ExamDirectory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { apiSend } from '../../lib/api';

type ExamListRow = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number | null;
  access?: ExamAccess;
  ownerName?: string | null;
  totalPoints: number;
  status: string;
  className: string;
};

export default function ExamsList() {
  const [exams, setExams] = useState<ExamListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const handleArchive = async (exam: ExamListRow) => {
    if (!confirm(`Archive "${exam.title}"? It will be hidden and can no longer be started, but the exam and all attempts are preserved. You can restore it from "Show archived".`)) return;
    try {
      await apiSend(`/api/exams/${exam.id}`, 'DELETE');
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      toast.success('Exam archived');
    } catch (e: any) {
      toast.error(e.message || 'Failed to archive exam');
    }
  };

  const handleRestore = async (exam: ExamListRow) => {
    try {
      await apiSend(`/api/exams/${exam.id}/restore`, 'POST');
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      toast.success('Exam restored');
    } catch (e: any) {
      toast.error(e.message || 'Failed to restore exam');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchExams = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/exams${showArchived ? '?archived=1' : ''}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('You do not have permission to view exams.');
          } else {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to fetch exams');
          }
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        setExams((Array.isArray(data) ? data : []).map((e: any) => ({
          id: e.id,
          title: e.title || 'Untitled', access: e.access, ownerName: e.ownerName,
          subject: e.subject?.name || '—',
          durationMinutes: e.durationMinutes ?? null,
          totalPoints: e.totalMarks ?? (e.questions || []).reduce((sum: number, q: any) => sum + (q.points || 0), 0),
          status: e.status || (e.type === 'MOCK' ? 'DRAFT' : 'PUBLISHED'),
          className: e.class?.name || '—',
        })));
      } catch (error: any) {
        if (!controller.signal.aborted) setLoadError(error?.message || 'Could not load exams. Check your connection and retry.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchExams();
    return () => controller.abort();
  }, [showArchived, retry]);

  const filteredExams = exams.filter(e => {
    return [e.title, e.subject, e.className, e.ownerName].join(' ').toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  return (
    <section className="exam-directory">
      <header className="exam-directory-header">
        <div><h1>Exam library</h1><p>Browse exams by class, subject and owner.</p></div>
        <div className="exam-directory-header-actions">
          <Button variant="outline" render={<Link to="/exam2/grading" />} nativeButton={false}>Grading queue</Button>
          <Button variant="outline" render={<Link to="/exam2/accommodations" />} nativeButton={false}>Accommodations</Button>
          {!showArchived && <Button render={<Link to="/exams/new" />} nativeButton={false}><Plus size={16} />Create exam</Button>}
        </div>
      </header>
      <div className="exam-directory-toolbar">
        <div className="flex flex-wrap items-center gap-3"><strong>{showArchived ? 'Archived exams' : 'Current exams'}</strong>
          <Button variant="ghost" onClick={() => setShowArchived(v => !v)}>{showArchived ? 'Show active' : 'Show archived'}</Button>
        </div>
        <DirectorySearch value={searchTerm} onChange={setSearchTerm} />
      </div>
      {loading ? (
        <div role="status" className="flex items-center justify-center py-12">
          <span className="ml-3 text-muted-foreground">Loading exams...</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="space-y-3 rounded-sm border border-destructive/40 bg-card p-6"><h2 className="font-semibold">Could not load exams</h2><p className="text-sm text-muted-foreground">{loadError}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Retry</Button></div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <p className="text-lg font-medium text-foreground">No exams found</p>
          <p className="text-sm text-muted-foreground">{searchTerm ? 'Try adjusting your search.' : showArchived ? 'Archived exams will appear here. Your active exams are still available under Show active.' : 'Create your first exam to get started.'}</p>
        </div>
      ) : (
        <>
          <DirectoryColumns detail="Exam details" />
          <ul className="exam-directory-list">{filteredExams.map(exam =>
            <DirectoryRow key={exam.id} {...exam} actions={<>
              <Link className="exam-directory-link" to={`/exams/${exam.id}`}>Manage <ArrowRight size={15} /></Link>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={`Actions for ${exam.title}`} className="size-11 p-0" />} nativeButton={true}>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link to={`/exams/${exam.id}`} />} nativeButton={false}>View Dashboard</DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exams/${exam.id}/studio`} />} nativeButton={false}>Open in Studio</DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exam2/${exam.id}/author`} />} nativeButton={false}>Author content</DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exam2/${exam.id}/schedule`} />} nativeButton={false}>Schedule &amp; release</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link to={`/exams/${exam.id}/preview`} />} nativeButton={false}>Preview</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {showArchived ? (
                    <DropdownMenuItem className="text-accent-foreground" onClick={() => handleRestore(exam)}>Restore exam</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="text-destructive" onClick={() => handleArchive(exam)}>Archive exam</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>}>
              <span>{exam.durationMinutes ? `${exam.durationMinutes} min` : 'Untimed'}</span>
              <span>{exam.totalPoints} points</span>
            </DirectoryRow>
          )}</ul>
        </>
      )}
    </section>
  );
}
