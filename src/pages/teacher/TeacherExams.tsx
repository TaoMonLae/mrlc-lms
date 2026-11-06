import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { DirectoryColumns, DirectoryRow, DirectorySearch, type ExamAccess } from '../../components/exams/ExamDirectory';
import { apiGet } from "../../lib/api";

interface TeacherExam {
  id: string; title: string; class: string; date: string; duration: string;
  ownerName?: string | null; access?: ExamAccess;
  type: string; status: string; submissions: number; total: number; avg?: string;
}

export default function TeacherExams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [teacherExams, setTeacherExams] = useState<TeacherExam[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiGet<TeacherExam[]>('/api/teacher/exams', { signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) setTeacherExams(r ?? []); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load assessments. Please retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const filteredExams = teacherExams.filter(e =>
    (tab === 'all' || (tab === 'drafts' ? e.status === 'DRAFT' : ['ACTIVE', 'PUBLISHED', 'SCHEDULED', 'UPCOMING', 'NEEDS_GRADING'].includes(e.status))) &&
    [e.title, e.class, e.type, e.ownerName].join(' ').toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <section className="exam-directory">
      <header className="exam-directory-header">
        <div><h1>Assessments &amp; exams</h1><p>Follow submissions and grading across your assigned classes.</p></div>
        <Button id="create-assessment-btn" render={<Link to="/exams/new" />} nativeButton={false}><Plus size={16} />Create assessment</Button>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="exam-directory-toolbar">
          <TabsList aria-label="Assessment status" className="h-auto max-w-full flex-wrap">
            <TabsTrigger value="all">All assessments</TabsTrigger>
            <TabsTrigger value="active">Active / Grading</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>
          <DirectorySearch value={searchTerm} onChange={setSearchTerm} />
        </div>
        <TabsContent value={tab}>
          {loading && <p role="status" className="exam-directory-message">Loading assessments…</p>}
          {error && <div role="alert" className="exam-directory-message"><p>{error}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Retry</Button></div>}
          {!loading && !error && (filteredExams.length > 0 ? <>
            <DirectoryColumns detail="Exam activity" />
            <ul className="exam-directory-list">{filteredExams.map(exam =>
              <DirectoryRow key={exam.id} {...exam} subject={exam.type} className={exam.class} actions={<>
                {exam.status === 'DRAFT'
                  ? <Link className="exam-directory-link" to={`/exams/${exam.id}/studio`}>Open in Studio</Link>
                  : <Link className="exam-directory-link" to={`/exams/${exam.id}/results`}>Review answers</Link>}
                {exam.status === 'NEEDS_GRADING' && <Link className="exam-directory-link exam-directory-action" to={`/exam2/grading?examId=${encodeURIComponent(exam.id)}`}>Grade now</Link>}
              </>}>
                <span>{exam.date} · {exam.duration}</span>
                <span>{exam.submissions}/{exam.total} submitted</span>
                {exam.avg && <span>{exam.avg} average</span>}
              </DirectoryRow>
            )}</ul>
          </> : <div className="exam-directory-message">
            <h2 className="font-semibold">No exams found</h2>
            <p>{searchTerm || tab !== 'all' ? 'Try a different search or show all assessments.' : 'Assessments for your classes will appear here.'}</p>
            {(searchTerm || tab !== 'all') && <Button variant="outline" onClick={() => { setSearchTerm(''); setTab('all'); }}>Clear filters</Button>}
          </div>)}
        </TabsContent>
      </Tabs>
    </section>
  );
}
