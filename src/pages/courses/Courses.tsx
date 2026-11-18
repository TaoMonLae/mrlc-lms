import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Plus, Search, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../providers/AuthProvider';
import { apiGet, apiSend } from '../../lib/api';
import { COURSE_STATUS_LABELS, GED_COURSE_TEMPLATES, courseProgress, type CourseEnrollmentRecord, type CourseRecord } from '../../../shared/courses';
import { CourseErrorNotice, CourseFacts, CourseIntro, CourseProgressBar, CourseStatus, courseSelect } from './CourseUi';

export default function Courses() {
  const { user } = useAuth();
  const student = user?.role === 'STUDENT';
  const [courses, setCourses] = useState<CourseRecord[]>([]), [enrollments, setEnrollments] = useState<CourseEnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(''), [status, setStatus] = useState('ALL');
  const [creatingGed, setCreatingGed] = useState(false), [gedError, setGedError] = useState(''), [gedMessage, setGedMessage] = useState('');
  const createGedCourses = async () => {
    if (creatingGed) return;
    setCreatingGed(true); setGedError(''); setGedMessage('');
    try {
      const result = await apiSend<{ courses: { created: boolean }[] }>('/api/courses/mrlc-ged', 'POST', {});
      const created = result.courses.filter(course => course.created).length;
      setGedMessage(created ? `${created} independent MRLC-GED course drafts created. Open each to preview, review and assign.` : 'Your four MRLC-GED course drafts already exist.');
      setStatus('ALL'); setQuery(''); setRetry(value => value + 1);
    } catch (error) { setGedError(error instanceof Error ? error.message : 'Could not create the MRLC-GED courses.'); }
    finally { setCreatingGed(false); }
  };
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setCourses([]); setEnrollments([]);
    apiGet(student ? '/api/my-courses' : '/api/courses', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) student ? setEnrollments(data) : setCourses(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [student, user?.id, retry]);
  const filtered = courses.filter(c => (status === 'ALL' || c.status === status) && `${c.draft.title} ${c.draft.subject} ${c.ownerName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const assigned = enrollments.filter(e => `${e.syllabus.title} ${e.syllabus.subject}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="courses-workspace">
    <CourseIntro title={student ? 'My courses' : 'Courses'} description={student ? 'Pick up where you left off. Your readings, practice and assignments follow one learning path.' : 'Build a learning path from the lessons and resources your school already uses.'} actions={!student && <><Link to="/courses/import" className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}><Upload size={16} />Import course</Link><Link to="/courses/new" className={buttonVariants({ className: 'min-h-11' })}><Plus size={16} />Create course</Link></>} />
    {!student && <div className="course-register-note"><BookOpen size={19} aria-hidden="true" /><p><strong>Your course, one syllabus.</strong> Organize modules, connect learning activities, then submit the draft for administrator approval.</p><span>{courses.filter(c => c.status === 'IN_REVIEW').length} awaiting review</span></div>}
    <div className="course-toolbar"><div className="course-search"><Search size={17} aria-hidden="true" /><Input aria-label="Search courses" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses…" /></div>{!student && <select aria-label="Course status" className={courseSelect} value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>
    {loading ? <p role="status" className="course-empty">Loading courses…</p> : error ? <CourseErrorNotice message={error} retry={() => setRetry(n => n + 1)} /> : student ? <div className="course-catalog">{assigned.map(enrollment => {
      const progress = courseProgress(enrollment.syllabus, enrollment.completedIds);
      return <article key={enrollment.id} className="course-catalog-row"><div><p className="course-meta">{enrollment.syllabus.subject} · {enrollment.className} · Version {enrollment.version}</p><h2><Link to={`/courses/learn/${enrollment.id}`}>{enrollment.syllabus.title}</Link></h2><p className="course-summary">{enrollment.syllabus.summary}</p><CourseFacts draft={enrollment.syllabus} /></div><div className="course-catalog-side"><CourseProgressBar {...progress} /><Link className="course-text-link" to={`/courses/learn/${enrollment.id}`}>{progress.completed === progress.total ? 'Review course' : progress.completed ? 'Continue learning' : 'Start course'}<ArrowRight size={16} aria-hidden="true" /></Link></div></article>;
    })}{!assigned.length && <div className="course-empty"><h2>{query ? 'No matching courses' : 'Your next course starts here'}</h2><p>{query ? 'Try a different course title or subject.' : 'Courses will appear here when your teacher assigns them to your class.'}</p>{query && <Button variant="outline" onClick={() => setQuery('')}>Clear search</Button>}</div>}</div> : <div className="course-catalog">{filtered.map(course => <article key={course.id} className="course-catalog-row"><div><p className="course-meta">{course.draft.subject} · {course.ownerName}</p><h2><Link to={`/courses/${course.id}/edit`}>{course.draft.title}</Link></h2><p className="course-summary">{course.draft.summary || 'Add an introduction to this course.'}</p><CourseFacts draft={course.draft} /></div><div className="course-catalog-side"><CourseStatus status={course.status} /><p className="course-meta">{course.publishedVersion ? `Published version ${course.publishedVersion} · ` : ''}{course.enrollmentCount} assignments</p><Link to={`/courses/${course.id}/edit`} className="course-text-link">{user?.role === 'ADMIN' && course.status === 'IN_REVIEW' ? 'Review course' : 'Open course'}<ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}{!filtered.length && <div className="course-empty"><h2>{courses.length ? 'No matching courses' : 'Write the first chapter'}</h2><p>{courses.length ? 'Try another search or status.' : 'Start with your own syllabus or use a GED subject outline below.'}</p>{courses.length > 0 && <Button variant="outline" onClick={() => { setQuery(''); setStatus('ALL'); }}>Clear filters</Button>}</div>}</div>}
    {!student && <section className="course-template-section"><div className="course-section-heading"><h2>Original MRLC-GED courses</h2><p>Create four separate drafts with original lessons and timed unit tests. Teachers can add in-course videos, homework and optional Learning Quest links.</p></div><ul className="course-subject-index">{GED_COURSE_TEMPLATES.map(template => <li key={template.key}><strong>{template.subject}</strong><span>{template.modules.length} units · {template.modules.length} tests</span></li>)}</ul><Button className="min-h-11 mb-4" disabled={creatingGed} onClick={createGedCourses}>{creatingGed ? 'Preparing courses…' : 'Create four MRLC-GED courses'}</Button>{gedError && <CourseErrorNotice message={gedError} />}{gedMessage && <p role="status" className="course-ready">{gedMessage}</p>}<div className="course-section-heading mt-8"><h2>Start with an empty outline</h2><p>Use these chapter plans if you prefer to write every lesson yourself.</p></div><div className="course-template-list">{GED_COURSE_TEMPLATES.map((template, index) => <Link key={template.key} to={`/courses/new?template=${template.key}`}><span className="course-template-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{template.subject}</h3><p>{template.modules.length} chapter modules · add lessons</p></div><ArrowRight size={18} aria-hidden="true" /></Link>)}</div><p className="course-footnote">Chapter outlines follow the school's prep-book study plan and <a href="https://www.ged.com/en/professional-development/develop-student-skills.html" target="_blank" rel="noreferrer">GED educator guidance</a>. MRLC materials need teacher review; course completion is separate from official GED readiness.</p></section>}
  </div>;
}
