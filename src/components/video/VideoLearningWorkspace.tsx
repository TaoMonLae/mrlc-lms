import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { BookOpenCheck, ListVideo, MessageCircle, StickyNote, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { formatDuration as formatPositiveDuration } from '../../lib/video';
import type { VideoLesson } from '../../lib/video/types';
import type { VideoLearningConfig } from '../../../shared/videoLearning';
import AnimatedContent from '../react-bits/AnimatedContent';
import './video-learning.css';
type Activity = { id: string; title: string; status: string; href: string };
type Learning = VideoLearningConfig & { quiz: Activity | null; homework: Activity | null; learningComplete: boolean };
type Note = { id: string; userId: string; seconds: number; body: string; isQuestion: boolean; reply: string | null; author: string };
type ReportRow = { studentId: string; name: string; watched: boolean; quiz: string; homework: string; learningComplete: boolean };
const empty: VideoLearningConfig = { examId: null, homeworkId: null, requireQuiz: false, chapters: [] };
const panel = 'rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5';
const selectClass = 'video-learning-select w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
const statusText = (value: string) => value.replaceAll('_', ' ').toLowerCase();
const formatDuration = (seconds: number) => formatPositiveDuration(seconds) || '0:00';

export function VideoLearningWorkspace({ video, canManage, userId, watched, seek, currentTime }: {
  video: VideoLesson; canManage: boolean; userId?: string; watched: boolean;
  seek: (seconds: number) => void; currentTime: () => number;
}) {
  const [learning, setLearning] = useState<Learning | null>(null);
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]); const [notesError, setNotesError] = useState('');
  const [draft, setDraft] = useState<VideoLearningConfig>(empty);
  const [options, setOptions] = useState<{ exams: { id: string; title: string; status: string; passMark: number | null }[]; homeworks: { id: string; title: string; status: string }[] }>({ exams: [], homeworks: [] });
  const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);
  const editingRef = useRef(editing); editingRef.current = editing;
  const [body, setBody] = useState(''); const [isQuestion, setIsQuestion] = useState(false); const [seconds, setSeconds] = useState(0);
  const [noteSaving, setNoteSaving] = useState(false); const [reply, setReply] = useState<Record<string, string>>({});
  const [report, setReport] = useState<ReportRow[]>([]); const [reportError, setReportError] = useState('');
  const [reportFilter, setReportFilter] = useState('all'); const [reminding, setReminding] = useState(false);
  useEffect(() => { setLearning(null); setEditing(false); editingRef.current = false; setBody(''); setReply({}); }, [video.id]);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    apiGet<Learning>(`/api/videos/${video.id}/learning`, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      // The endpoint returns an object; malformed responses must not pretend learning is empty.
      if (!data || !Array.isArray(data.chapters)) throw new Error('Could not load lesson activities.');
      setLearning(data); if (!editingRef.current) setDraft({ examId: data.examId, homeworkId: data.homeworkId, requireQuiz: data.requireQuiz, chapters: data.chapters });
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [video.id, revision]);
  useEffect(() => {
    const controller = new AbortController(); setNotesError(''); setNotes([]);
    apiGet<Note[]>(`/api/videos/${video.id}/notes`, { signal: controller.signal }).then(d => { if (!controller.signal.aborted) setNotes(Array.isArray(d) ? d : []); }).catch(e => { if (!controller.signal.aborted) setNotesError(e.message); });
    return () => controller.abort();
  }, [video.id, revision]);
  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController(); setReportError('');
    apiGet<ReportRow[]>(`/api/videos/${video.id}/learning/report`, { signal: controller.signal }).then(d => { if (!controller.signal.aborted) setReport(Array.isArray(d) ? d : []); }).catch(e => { if (!controller.signal.aborted) setReportError(e.message); });
    return () => controller.abort();
  }, [video.id, canManage, revision]);
  const openEditor = async () => {
    try { const d = await apiGet<typeof options>(`/api/videos/${video.id}/learning/options`); if (learning) setDraft({ examId: learning.examId, homeworkId: learning.homeworkId, requireQuiz: learning.requireQuiz, chapters: learning.chapters }); setOptions(d); setEditing(true); } catch (e: any) { toast.error(e.message); }
  };
  const save = async () => {
    setSaving(true);
    try { await apiSend(`/api/videos/${video.id}/learning`, 'PUT', draft); setEditing(false); setRevision(r => r + 1); toast.success('Lesson activities saved'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const addNote = async (event: React.FormEvent) => {
    event.preventDefault(); setNoteSaving(true);
    try { await apiSend(`/api/videos/${video.id}/notes`, 'POST', { body, seconds, isQuestion }); setBody(''); setRevision(r => r + 1); toast.success(isQuestion ? 'Question sent to the lesson teacher' : 'Private note saved'); } catch (e: any) { toast.error(e.message); } finally { setNoteSaving(false); }
  };
  const sendReminders = async (target: string) => {
    if (!window.confirm(`Send an in-app ${target} reminder to students who have not finished? At most one per student per day.`)) return;
    setReminding(true);
    try { const result = await apiSend<{ sent: number }>(`/api/videos/${video.id}/learning/reminders`, 'POST', { target }); toast.success(`${result.sent} reminder(s) sent`); } catch (e: any) { toast.error(e.message); } finally { setReminding(false); }
  };
  return <div className="min-w-0 space-y-5">
    <AnimatedContent className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="size-4" />Learning Activities</h2>
        <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => setRevision(r => r + 1)}>Refresh Status</Button>{canManage && learning && <Button variant="outline" size="sm" onClick={openEditor}>Configure Activities</Button>}</div>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : !learning ? <p className="mt-3 text-sm text-muted-foreground">Loading activities…</p> : <>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Lesson activity checklist">
          <li className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">01 · Watch</p><p className="mt-1 text-sm font-medium">{watched ? 'Watched' : 'Watch the lesson'}</p></li>
          <li className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">02 · Check Understanding</p>{learning.quiz ? <><Link className="mt-1 block break-words text-sm font-medium text-academic-teal hover:underline" to={learning.quiz.href}>{learning.quiz.title}</Link><p className="mt-1 text-xs text-muted-foreground">{statusText(learning.quiz.status)}{learning.requireQuiz ? ' · passing score required' : ''}</p></> : <p className="mt-1 text-sm text-muted-foreground">{learning.examId ? 'Quiz is not available. Ask your teacher.' : 'No quiz assigned'}</p>}</li>
          <li className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">03 · Apply</p>{learning.homework ? <><Link className="mt-1 block break-words text-sm font-medium text-academic-teal hover:underline" to={learning.homework.href}>{learning.homework.title}</Link><p className="mt-1 text-xs text-muted-foreground">{statusText(learning.homework.status)}</p></> : <p className="mt-1 text-sm text-muted-foreground">{learning.homeworkId ? 'Homework is not available. Ask your teacher.' : 'No homework assigned'}</p>}</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">Watching is a playback signal, not proof of learning. Quiz results follow the assessment’s release rules.{learning.learningComplete ? ' Watch and required quiz completed.' : ''}</p>
        {learning.chapters.length > 0 && <nav aria-label="Lesson chapters" className="mt-5 border-t border-border pt-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListVideo className="size-4" />Chapters</h3><div className="flex flex-col gap-1">{learning.chapters.map(c => <Button key={c.seconds} variant="ghost" className="h-auto min-h-10 justify-start whitespace-normal text-left" onClick={() => seek(c.seconds)}><span className="shrink-0 font-mono text-xs text-academic-teal">{formatDuration(c.seconds)}</span>{c.title}</Button>)}</div></nav>}
      </>}
      {editing && <div className="mt-5 space-y-4 border-t border-border pt-4">
        {!video.classId && <p className="text-sm text-muted-foreground">Assign a class in Edit Video Lesson before attaching quizzes or homework.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>Quiz</span><select aria-label="Linked quiz" className={selectClass} value={draft.examId || ''} onChange={e => setDraft(d => ({ ...d, examId: e.target.value || null, requireQuiz: e.target.value ? d.requireQuiz : false }))}><option value="">No Quiz</option>{options.exams.map(e => <option key={e.id} value={e.id}>{e.title} · {e.status}</option>)}</select><Link className="block text-xs text-academic-teal hover:underline" to="/exams/new?type=QUIZ">Create a Quiz in Assessments</Link></label>
        <label className="space-y-2 text-sm"><span>Homework</span><select aria-label="Linked homework" className={selectClass} value={draft.homeworkId || ''} onChange={e => setDraft(d => ({ ...d, homeworkId: e.target.value || null }))}><option value="">No Homework</option>{options.homeworks.map(e => <option key={e.id} value={e.id}>{e.title} · {e.status}</option>)}</select><Link className="block text-xs text-academic-teal hover:underline" to="/teacher/homework">Create Homework in the Homework Workspace</Link></label></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.requireQuiz} disabled={!draft.examId} onChange={e => setDraft(d => ({ ...d, requireQuiz: e.target.checked }))} />Require a passing quiz score for learning completion</label>
        <div className="space-y-2"><h3 className="text-sm font-semibold">Chapter Timestamps</h3>{draft.chapters.map((c, i) => <div key={i} className="grid grid-cols-[90px_minmax(0,1fr)_auto] gap-2"><Input aria-label={`Chapter ${i + 1} seconds`} type="number" min="0" value={c.seconds} onChange={e => setDraft(d => ({ ...d, chapters: d.chapters.map((c, j) => j === i ? { ...c, seconds: Number(e.target.value) } : c) }))} /><Input aria-label={`Chapter ${i + 1} title`} placeholder="Chapter title" value={c.title} onChange={e => setDraft(d => ({ ...d, chapters: d.chapters.map((c, j) => j === i ? { ...c, title: e.target.value } : c) }))} /><Button aria-label={`Remove chapter ${i + 1}`} variant="ghost" onClick={() => setDraft(d => ({ ...d, chapters: d.chapters.filter((_, j) => i !== j) }))}>×</Button></div>)}<Button size="sm" variant="outline" onClick={() => setDraft(d => ({ ...d, chapters: [...d.chapters, { title: '', seconds: d.chapters.length ? d.chapters.at(-1)!.seconds + 60 : 0 }] }))}>Add Chapter</Button><p className="text-xs text-muted-foreground">Use seconds in increasing order, starting at 0. Example: 90 = 1:30.</p></div>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={() => { setEditing(false); if (learning) setDraft(learning); }}>Cancel Activities</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Activities'}</Button></div>
      </div>}
    </AnimatedContent>
    <section className={panel} aria-label="Lesson notes and questions"><h2 className="flex items-center gap-2 font-semibold"><StickyNote className="size-4" />Notes & Questions</h2><p className="mt-1 text-xs text-muted-foreground">Notes are private. Questions are shared only with the lesson teacher and admin.</p>
      <form onSubmit={addNote} className="mt-4 space-y-3"><label className="block space-y-2 text-sm"><span>{isQuestion ? 'Your question' : 'Your private note'}</span><Textarea required maxLength={3000} value={body} onChange={e => setBody(e.target.value)} /></label><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs">Timestamp (seconds)<Input className="w-24" type="number" min="0" max={video.duration || 86400} value={seconds} onChange={e => setSeconds(Number(e.target.value))} /></label><Button type="button" size="sm" variant="outline" onClick={() => setSeconds(Math.max(0, Math.floor(currentTime())))}>Use Current Time</Button><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isQuestion} onChange={e => setIsQuestion(e.target.checked)} />Ask the Teacher</label><Button type="submit" size="sm" disabled={noteSaving}>{noteSaving ? 'Saving…' : isQuestion ? 'Send Question' : 'Save Note'}</Button></div></form>
      {notesError && <p role="alert" className="mt-3 text-sm text-destructive">{notesError}</p>}
      <div className="mt-4 space-y-3">{notes.map(n => <article key={n.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => seek(n.seconds)}>{formatDuration(n.seconds)} · {n.isQuestion ? <MessageCircle className="size-3" /> : <StickyNote className="size-3" />}{n.isQuestion ? `${n.author} · Question` : 'Private Note'}</Button>{n.userId === userId && <Button size="sm" variant="ghost" onClick={async () => { if (!window.confirm('Delete this note/question?')) return; try { await apiSend(`/api/videos/${video.id}/notes/${n.id}`, 'DELETE'); setRevision(r => r + 1); } catch (e: any) { toast.error(e.message); } }}>Delete Note</Button>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{n.body}</p>{n.reply && <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-academic-teal pl-3 text-sm"><span className="font-medium">Teacher Reply: </span>{n.reply}</p>}{canManage && n.isQuestion && <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async e => { e.preventDefault(); try { await apiSend(`/api/videos/${video.id}/notes/${n.id}/reply`, 'PUT', { reply: reply[n.id] || '' }); setRevision(r => r + 1); } catch (e: any) { toast.error(e.message); } }}><Input aria-label={`Reply to ${n.author}`} required maxLength={3000} value={reply[n.id] || ''} onChange={e => setReply(r => ({ ...r, [n.id]: e.target.value }))} /><Button type="submit" size="sm">Save Reply</Button></form>}</article>)}</div>
    </section>
    {canManage && <section className={panel} aria-label="Learning report"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Learning Report</h2><select aria-label="Filter learning report" className={`${selectClass} sm:w-auto`} value={reportFilter} onChange={e => setReportFilter(e.target.value)}><option value="all">All Students</option><option value="watch">Not Watched</option><option value="quiz">Quiz Not Passed</option><option value="homework">Homework Missing / Redo</option></select></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={reminding} onClick={() => sendReminders('watch')}><Bell className="size-3" />Remind to Watch</Button>{learning?.examId && <Button size="sm" variant="outline" disabled={reminding} onClick={() => sendReminders('quiz')}>Remind About Quiz</Button>}{learning?.homeworkId && <Button size="sm" variant="outline" disabled={reminding} onClick={() => sendReminders('homework')}>Remind About Homework</Button>}</div><p className="mt-2 text-xs text-muted-foreground">In-app reminders only, deduplicated per student/activity/day. Homework submission is separate from watch + quiz completion.</p>
      {reportError ? <p role="alert" className="mt-3 text-sm text-destructive">{reportError}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="p-2">Student</th><th className="p-2">Watch</th><th className="p-2">Quiz</th><th className="p-2">Homework</th><th className="p-2">Learning</th></tr></thead><tbody>{report.filter(r => reportFilter === 'all' || reportFilter === 'watch' && !r.watched || reportFilter === 'quiz' && !['passed', 'not_assigned'].includes(r.quiz) || reportFilter === 'homework' && ['not_submitted', 'REDO'].includes(r.homework)).map(r => <tr key={r.studentId} className="border-b border-border"><td className="p-2 font-medium">{r.name}</td><td className="p-2">{r.watched ? 'Watched' : 'Not finished'}</td><td className="p-2">{statusText(r.quiz)}</td><td className="p-2">{statusText(r.homework)}</td><td className="p-2">{r.learningComplete ? 'Complete' : 'Pending'}</td></tr>)}</tbody></table>{report.length === 0 && <p className="p-3 text-sm text-muted-foreground">No students in this lesson audience.</p>}</div>}
    </section>}
  </div>;
}
