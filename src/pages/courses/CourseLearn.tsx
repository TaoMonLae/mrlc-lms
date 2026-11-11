import {FlashcardDeck, ChapterAssess, PreviewTest} from '../../components/courses/ChapterLab';
import type {ChapterStudioData} from '../../../shared/gedChapterStudio';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { apiGet, apiSend } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { rememberCourseReturn } from '../../lib/courseReturn';
import { COURSE_KIND_LABELS, courseProgress, courseResourceHref, courseVideoEmbedUrl, type CourseEnrollmentRecord, type CourseRecord } from '../../../shared/courses';
import { CourseUnitTest } from '../../components/courses/CourseUnitTest';
import { CourseBack, CourseCompleteMark, CourseErrorNotice, CourseFacts, CourseIntro, CourseProgressBar } from './CourseUi';

function Reading({ item }: { item: CourseEnrollmentRecord['syllabus']['modules'][number]['items'][number] }) {
  if (item.kind !== 'TEXT' || !item.title.startsWith('Try it:') || !item.content.includes(' Check:')) {
    return <div className="course-prose">{item.content}</div>;
  }
  const [task, rest] = item.content.split(' Check:');
  const [check, ...followUp] = rest.split('\n\n');
  return <><div className="course-prose">{task}</div><details className="course-practice-check"><summary>Check your reasoning</summary><p>{check.trim()}</p></details><div className="course-prose">{followUp.join('\n\n')}</div></>;
}

type Learning = CourseEnrollmentRecord & { unavailableIds: string[] };
export default function CourseLearn() {
  const { user } = useAuth();
  const { id, enrollmentId } = useParams(); const preview = !!id;
  const [params, setParams] = useSearchParams(); const selectedId = params.get('lesson');
  const [data, setData] = useState<Learning | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0), [refreshing, setRefreshing] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false), active = useRef(true), identity = useRef(`${id}:${enrollmentId}`); identity.current = `${id}:${enrollmentId}`;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setData(null); setLoading(true); setError(''); setActionError(''); }, [id, enrollmentId]);
  useEffect(() => {
    const controller = new AbortController(); setRefreshing(true); setError('');
    const url = preview ? `/api/courses/${id}` : `/api/my-courses/${enrollmentId}`;
    apiGet<CourseRecord | Learning>(url, { signal: controller.signal }).then(row => {
      if (controller.signal.aborted) return;
      if (preview) { const course = row as CourseRecord; setData({ id: course.id, courseId: course.id, className: 'Student preview', version: course.publishedVersion ?? 0, syllabus: course.draft, assignedAt: '', completedIds: [], unavailableIds: [] }); }
      else setData(row as Learning);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [id, enrollmentId, preview, retry]);
  useEffect(() => {
    if (preview) return;
    const refresh = () => { if (!lock.current) setRetry(n => n + 1); };
    window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh);
  }, [preview]);
  const select = (itemId: string | null) => { const next = new URLSearchParams(params); if (itemId) next.set('lesson', itemId); else next.delete('lesson'); next.delete('study'); setParams(next, { replace: true }); setActionError(''); };
  const items = data?.syllabus.modules.flatMap(m => m.items) ?? [], item = items.find(i => i.id === selectedId);
  const module = data?.syllabus.modules.find(m => m.items.some(i => i.id === selectedId));
  const index = item ? items.indexOf(item) : -1, next = items[index + 1], previous = items[index - 1];
  const progress = data ? courseProgress(data.syllabus, data.completedIds) : null;
  const href = item ? courseResourceHref(item) : null, unavailable = !!item && data?.unavailableIds.includes(item.id);
  const markComplete = async () => {
    if (!item || !enrollmentId || preview || lock.current) return;
    const key = identity.current; lock.current = true; setBusy(true); setActionError('');
    try {
      const result = await apiSend<Learning>(`/api/my-courses/${enrollmentId}/complete`, 'POST', { itemId: item.id });
      if (active.current && identity.current === key) { setData(result); if(lab && mode==='Learn') openMode('Flashcards'); else select(next?.id ?? null); }
    } catch (e) { if (active.current && identity.current === key) setActionError(e instanceof Error ? e.message : 'Could not save your progress.'); }
    finally { if (active.current && identity.current === key) setBusy(false); lock.current = false; }
  };
  if (loading) return <div className="courses-workspace"><p className="course-empty" role="status">Loading your course…</p></div>;
  if (error && !data) return <div className="courses-workspace"><CourseBack /><CourseErrorNotice message={error} retry={() => setRetry(n => n + 1)} /></div>;
  if (!data || !progress) return null;
  const upcoming = items.find(row => row.id === progress.nextId);
  const upcomingUnit = data.syllabus.modules.find(unit => unit.items.some(row => row.id === upcoming?.id));
  const studio = (module as (typeof module & {studio?:ChapterStudioData}))?.studio;
  const reading = module?.items.find(row=>row.kind==='TEXT' && row.title.startsWith('Learn:'));
  const exercise = module?.items.find(row=>row.kind==='TEXT' && row.title.startsWith('Try it:'));
  const test = module?.items.find(row=>row.kind==='QUIZ');
  const mode = item?.id===reading?.id ? params.get('study')==='cards'?'Flashcards':'Learn' : item?.id===exercise?.id?'Assess':item?.id===test?.id?'Test':null;
  const lab = !!(studio && item && reading && exercise && test && mode);
  const openMode = (step:string) => {
    const value = new URLSearchParams(params);
    value.set('lesson', (step==='Test'?test:step==='Assess'?exercise:reading)!.id);
    if(step==='Flashcards')value.set('study','cards');else value.delete('study');
    setParams(value);setActionError('');
  };
  const complete = item ? data.completedIds.includes(item.id) : false;
  return <div className="courses-workspace"><CourseBack to={preview ? `/courses/${id}/edit` : '/courses'}>{preview ? 'Back to course editor' : 'My courses'}</CourseBack>
    {preview && <div className="course-preview-banner"><strong>Draft preview</strong><span>This is how the course will read. Activity links and completion are available after approval and assignment.</span></div>}
    <CourseIntro title={data.syllabus.title} description={data.syllabus.summary} actions={!preview && <Button variant="outline" className="min-h-11" disabled={refreshing || busy} onClick={() => setRetry(n => n + 1)}><RefreshCw size={16} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />{refreshing ? 'Updating…' : 'Refresh progress'}</Button>}><CourseFacts draft={data.syllabus} /></CourseIntro>
    {!preview && <div className="course-learner-progress"><p>{data.className} · Assigned version {data.version}</p><CourseProgressBar {...progress} /></div>}
    {error && <CourseErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
    {!item && upcoming && <section className="course-resume-panel"><div><p>{progress.completed ? 'Continue your course' : 'First lesson'} · {upcomingUnit?.title}</p><h2>{upcoming.title}</h2><span>{COURSE_KIND_LABELS[upcoming.kind]} · About {upcoming.minutes} min</span></div><Button onClick={() => select(upcoming.id)}>{progress.completed ? 'Resume lesson' : 'Open first lesson'}<ArrowRight size={16} /></Button></section>}
    <div className="course-learning-grid"><nav className="course-learning-outline" aria-label="Course lessons"><button className={`course-outline-overview ${!item ? 'is-selected' : ''}`} type="button" aria-current={!item ? 'page' : undefined} onClick={() => select(null)}>Course overview</button>{data.syllabus.modules.map((m, moduleIndex) => <details key={m.id} open={m.id === (module?.id ?? upcomingUnit?.id)}><summary><span>Unit {moduleIndex + 1}</span><strong>{m.title}</strong><small>{m.items.filter(row => data.completedIds.includes(row.id)).length} of {m.items.length} activities completed</small></summary><ol>{m.items.map(i => <li key={i.id}><button type="button" className={i.id === selectedId ? 'is-selected' : ''} aria-current={i.id === selectedId ? 'step' : undefined} onClick={() => select(i.id)}><CourseCompleteMark complete={data.completedIds.includes(i.id)} /><span>{i.title}<small>{COURSE_KIND_LABELS[i.kind]} · {i.minutes} min</small></span></button></li>)}</ol>{!m.items.length && <p className="course-helper p-4">Lessons have not been added yet.</p>}</details>)}</nav>
      <section className="course-sheet course-reading" aria-label="Learning content">{item ? <><div className="course-lesson-meta"><span>{module?.title}</span><span>{index + 1} of {items.length}</span></div><h2>{lab?module?.title:item.title}</h2>{lab && <nav className="chapter-path" aria-label="Chapter study steps">{['Learn','Flashcards','Assess','Test'].map((step,i)=><button key={step} aria-current={mode===step?'step':undefined} onClick={()=>openMode(step)}><small>0{i+1}</small>{step}</button>)}</nav>}{!lab && <p className="course-meta">{COURSE_KIND_LABELS[item.kind]} · About {item.minutes} min</p>}{actionError && <CourseErrorNotice message={actionError} />}
        {lab && mode==='Learn' && <div className="chapter-goal"><strong>Learning goal</strong><p>{module?.outcomes}</p></div>}
        {lab && mode==='Flashcards' ? <FlashcardDeck key={module!.id} studio={studio!} sessionKey={`chapter-deck:${user?.id}:${data.id}:${module!.id}`}/> : item.content ? <Reading key={item.id} item={item} /> : item.kind === 'TEXT' && <p className="course-empty">Lesson content has not been written yet.</p>}
        {lab && mode==='Learn' && <div className="chapter-lab"><h3>Your chapter case</h3><blockquote className="course-quiz-source">{studio!.scenario}</blockquote><p>Think about this question as you study the terms: {studio!.question}</p><Button variant="outline" onClick={()=>openMode('Flashcards')}>Study the flashcards</Button></div>}
        {lab && mode==='Assess' && <ChapterAssess key={module!.id} studio={studio!}/>}
        {item.kind === 'QUIZ' && (preview && lab ? <PreviewTest key={item.id} item={item}/> : preview ? <p className="course-helper">Students start the timed unit test here. {item.questions?.length ?? 0} original questions; answers and explanations appear after submission.</p> : enrollmentId && <CourseUnitTest key={`${enrollmentId}:${item.id}`} enrollmentId={enrollmentId} item={item} onComplete={() => setRetry(value => value + 1)} />)}
        {item.kind === 'QUIZ' && !preview && data.quizResults?.some(result => result.itemId === item.id) && <details className="course-practice-check"><summary>Your test record</summary><ol>{data.quizResults.filter(result => result.itemId === item.id).map((result, index) => <li key={result.submittedAt}>Attempt {index + 1} · {result.score}/{result.total} · {result.passed ? 'Passed' : 'Review needed'} · {new Date(result.submittedAt).toLocaleString()}</li>)}</ol></details>}
        {item.kind === 'VIDEO_LINK' && <div className="course-activity"><h3>Watch in this course</h3>{courseVideoEmbedUrl(item.url) ? <iframe className="course-video-frame" src={courseVideoEmbedUrl(item.url)!} title={item.title} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <p>Ask your teacher to update this video link.</p>}<p className="course-helper">After watching, mark this lesson complete.</p></div>}
        {!['TEXT', 'QUIZ', 'VIDEO_LINK'].includes(item.kind) && <div className="course-activity"><h3>{COURSE_KIND_LABELS[item.kind]}</h3>{unavailable ? <p role="status">This resource is no longer available to your class. Ask your teacher to update the course.</p> : preview ? <p>Students will open the linked activity here. Your draft does not grant access to the resource.</p> : href ? item.kind === 'LINK' ? <a className={buttonVariants({ variant: 'outline', className: 'min-h-11' })} href={href} target="_blank" rel="noopener noreferrer">Open external reading<ExternalLink size={16} aria-hidden="true" /></a> : <Link className={buttonVariants({ variant: 'outline', className: 'min-h-11' })} to={href} onClick={() => { if (user?.id && enrollmentId) rememberCourseReturn(user.id, `/courses/learn/${enrollmentId}?lesson=${item.id}`); }}>Open {COURSE_KIND_LABELS[item.kind].toLowerCase()}<ArrowRight size={16} aria-hidden="true" /></Link> : <p>A learning resource still needs to be selected.</p>}<p className="course-helper">{item.kind === 'EBOOK' ? 'The book’s saved completion record updates this lesson. Follow the reading instructions above.' : item.kind === 'EXAM' ? 'Review the linked exam before starting. Completion updates when a valid submitted attempt is released.' : ['VIDEO', 'PRACTICE', 'HOMEWORK'].includes(item.kind) ? 'Complete the activity, then return here. Your saved activity record updates course progress.' : 'Read the source, then return here to mark the lesson complete.'}</p></div>}
        {item.source && !lab && <aside className="course-attribution"><h3>Source & attribution</h3><p>{item.source}</p></aside>}
        <div className="course-lesson-footer"><div>{previous && <Button variant="ghost" disabled={busy} onClick={() => select(previous.id)}><ArrowLeft size={16} />Previous</Button>}</div><div className="course-actions">{!preview && complete && <span className="course-ready"><Check size={17} aria-hidden="true" />Completed</span>}{!preview && !complete && ['TEXT', 'LINK', 'VIDEO_LINK'].includes(item.kind) && <Button className="min-h-11" disabled={busy || unavailable} onClick={markComplete}>{busy ? 'Saving progress…' : 'Mark complete & continue'}<ArrowRight size={16} /></Button>}{(preview || complete || !['TEXT', 'LINK', 'VIDEO_LINK', 'QUIZ'].includes(item.kind)) && <Button className="min-h-11" variant={complete || preview ? 'default' : 'outline'} disabled={busy} onClick={() => select(next?.id ?? null)}>{next ? 'Next lesson' : 'Course overview'}<ArrowRight size={16} /></Button>}</div></div>
      </> : <><h2>{!preview && progress.total > 0 && progress.completed === progress.total ? 'You completed this course' : 'Your learning path'}</h2><p className="course-prose">{data.syllabus.objectives || 'Learning outcomes will appear here.'}</p><div className="course-outcomes">{data.syllabus.modules.map((m, n) => <div key={m.id}><span>{String(n + 1).padStart(2, '0')}</span><div><h3>{m.title}</h3><p>{m.outcomes || 'Learning outcome to be added.'}</p></div></div>)}</div>{items.length > 0 && <Button className="min-h-11 mt-6" onClick={() => select(progress.nextId ?? items[0].id)}>{preview ? 'Preview first lesson' : progress.nextId ? progress.completed ? 'Continue learning' : 'Start learning' : 'Review lessons'}<ArrowRight size={16} /></Button>}{!preview && data.syllabus.level === 'GED' && data.syllabus.subject !== 'Other' && <p className="course-footnote"><Link className="course-text-link" to={`/games/language-quest?q=${encodeURIComponent('GED ' + data.syllabus.subject)}#course-library`}>Optional Learning Quest practice<ArrowRight size={15} aria-hidden="true" /></Link> Extra practice is separate from your unit test record.</p>}<p className="course-footnote">Course completion records your work through this syllabus. Your teacher will use assessments and feedback to review GED readiness.</p></>}
      </section>
    </div>
  </div>;
}
