import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, Calendar, Clock, ExternalLink, MessageCircle, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { formatDurationVerbose } from '../../lib/video';
import { formatNoteTimestamp, parseNoteTimestamp } from '../../lib/video/noteTimestamp';
import type { VideoLesson } from '../../lib/video/types';

type Note = {
  id: string; userId: string; seconds: number; body: string; isQuestion: boolean;
  reply: string | null; author: string;
};
type CaptureRequest = { sequence: number; seconds: number };

export function VideoLessonSidebar({ video, canManage, userId, seek, currentTime, captureRequest, originalUrl, embedUrl, isYouTube, supportsTimestamps }: {
  video: VideoLesson;
  canManage: boolean;
  userId?: string;
  seek: (seconds: number) => void;
  currentTime: () => number;
  captureRequest: CaptureRequest;
  originalUrl: string | null;
  embedUrl: string | null;
  isYouTube: boolean;
  supportsTimestamps: boolean;
}) {
  const [tab, setTab] = useState<'notes' | 'about'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');
  const [revision, setRevision] = useState(0);
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'note' | 'question'>('note');
  const [timestamp, setTimestamp] = useState('0:00');
  const [timestampError, setTimestampError] = useState('');
  const [saving, setSaving] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const asideRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setNotesLoading(true);
    setNotesError('');
    apiGet<Note[]>(`/api/videos/${video.id}/notes`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setNotes(Array.isArray(data) ? data : []); })
      .catch((error) => { if (!controller.signal.aborted) setNotesError(error.message || 'Could not load notes'); })
      .finally(() => { if (!controller.signal.aborted) setNotesLoading(false); });
    return () => controller.abort();
  }, [video.id, revision]);

  useEffect(() => {
    if (!captureRequest.sequence) return;
    setTab('notes');
    setTimestamp(formatNoteTimestamp(captureRequest.seconds));
    setTimestampError('');
    asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    requestAnimationFrame(() => editorRef.current?.focus({ preventScroll: true }));
  }, [captureRequest]);

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    const seconds = parseNoteTimestamp(timestamp);
    if (seconds === null || seconds > (video.duration || 86400)) {
      setTimestampError(`Enter a time like 4:12${video.duration ? ` within this ${formatNoteTimestamp(video.duration)} lesson` : ''}.`);
      return;
    }
    setTimestampError('');
    setSaving(true);
    try {
      await apiSend(`/api/videos/${video.id}/notes`, 'POST', { body: body.trim(), seconds, isQuestion: mode === 'question' });
      setBody('');
      setRevision((value) => value + 1);
      toast.success(mode === 'question' ? 'Question sent to the lesson teacher' : 'Private note saved');
    } catch (error: any) {
      toast.error(error.message || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note or question?')) return;
    try {
      await apiSend(`/api/videos/${video.id}/notes/${id}`, 'DELETE');
      setRevision((value) => value + 1);
    } catch (error: any) { toast.error(error.message || 'Could not delete note'); }
  };

  const sendReply = async (event: FormEvent, id: string) => {
    event.preventDefault();
    try {
      await apiSend(`/api/videos/${video.id}/notes/${id}/reply`, 'PUT', { reply: replies[id]?.trim() || '' });
      setReplies((current) => ({ ...current, [id]: '' }));
      setRevision((value) => value + 1);
      toast.success('Reply saved');
    } catch (error: any) { toast.error(error.message || 'Could not save reply'); }
  };

  return <aside ref={asideRef} className="video-lesson-rail min-w-0 border border-border bg-card text-card-foreground" aria-label="Lesson workspace">
    <div className="flex border-b border-border" role="tablist" aria-label="Lesson workspace sections" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'notes' : 'about';
      setTab(next);
      document.getElementById(`lesson-${next}-tab`)?.focus();
    }}>
      <button id="lesson-notes-tab" type="button" role="tab" aria-controls="lesson-notes-panel" aria-selected={tab === 'notes'} tabIndex={tab === 'notes' ? 0 : -1} onClick={() => setTab('notes')} className={`min-h-12 flex-1 border-b-2 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-teal ${tab === 'notes' ? 'border-academic-teal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Notes & Questions</button>
      <button id="lesson-about-tab" type="button" role="tab" aria-controls="lesson-about-panel" aria-selected={tab === 'about'} tabIndex={tab === 'about' ? 0 : -1} onClick={() => setTab('about')} className={`min-h-12 flex-1 border-b-2 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-teal ${tab === 'about' ? 'border-academic-teal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>About</button>
    </div>

    <div id="lesson-notes-panel" role="tabpanel" aria-labelledby="lesson-notes-tab" hidden={tab !== 'notes'} className="p-4 sm:p-5">
      <p className="text-xs leading-5 text-muted-foreground">Private notes are yours. Questions go to the lesson teacher and admin.</p>
      <form onSubmit={saveNote} className="mt-4 space-y-3">
        <div className="flex gap-1 border border-border p-1" role="group" aria-label="What would you like to add?">
          <button type="button" aria-pressed={mode === 'note'} onClick={() => setMode('note')} className={`min-h-10 flex-1 px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal ${mode === 'note' ? 'bg-academic-navy-deep text-white' : 'text-muted-foreground hover:text-foreground'}`}>Private note</button>
          <button type="button" aria-pressed={mode === 'question'} onClick={() => setMode('question')} className={`min-h-10 flex-1 px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal ${mode === 'question' ? 'bg-academic-navy-deep text-white' : 'text-muted-foreground hover:text-foreground'}`}>Ask teacher</button>
        </div>
        <label className="block text-sm font-medium" htmlFor="lesson-note-body">{mode === 'question' ? 'Your question' : 'Your note'}</label>
        <Textarea id="lesson-note-body" ref={editorRef} required maxLength={3000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder={mode === 'question' ? 'What would you like to ask?' : 'Write down an idea from this moment…'} className="min-h-28 resize-y" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="lesson-note-time">At time <Input id="lesson-note-time" value={timestamp} onChange={(event) => { setTimestamp(event.target.value); setTimestampError(''); }} aria-invalid={Boolean(timestampError)} aria-describedby={timestampError ? 'lesson-note-time-error' : undefined} inputMode="numeric" className="mt-1 w-24 font-mono text-sm text-foreground" /></label>
          {supportsTimestamps && <Button type="button" size="sm" variant="ghost" onClick={() => { setTimestamp(formatNoteTimestamp(currentTime())); setTimestampError(''); }}>Use current time</Button>}
        </div>
        {timestampError && <p id="lesson-note-time-error" role="alert" className="text-xs text-destructive">{timestampError}</p>}
        <Button type="submit" disabled={saving || !body.trim()} className="min-h-11 w-full bg-academic-gold font-bold text-academic-navy-deep hover:bg-academic-gold/85">{saving ? 'Saving…' : mode === 'question' ? 'Send question' : 'Save note'}</Button>
      </form>
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Saved moments</h3><span className="text-xs tabular-nums text-muted-foreground">{notes.length}</span></div>
        {notesError && <p role="alert" className="mt-3 text-xs text-destructive">{notesError} <button type="button" onClick={() => setRevision((value) => value + 1)} className="font-semibold underline">Retry</button></p>}
        {notesLoading ? <p role="status" className="mt-4 text-sm text-muted-foreground">Loading notes…</p> : !notesError && !notes.length ? <p className="mt-4 text-sm leading-6 text-muted-foreground">No notes yet. Capture a moment while you watch.</p> : null}
        <div className="mt-2 divide-y divide-border">{notes.map((note) => <article key={note.id} className="py-4">
          <div className="flex items-start justify-between gap-2">
            {supportsTimestamps ? <button type="button" onClick={() => seek(note.seconds)} className="inline-flex min-h-8 items-center gap-2 text-left text-xs font-semibold text-academic-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal"><span className="font-mono">{formatNoteTimestamp(note.seconds)}</span>{note.isQuestion ? <MessageCircle className="size-3.5" aria-hidden="true" /> : <StickyNote className="size-3.5" aria-hidden="true" />}<span>{note.isQuestion ? `${note.author} · Question` : 'Private note'}</span></button> : <span className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="font-mono">{formatNoteTimestamp(note.seconds)}</span>{note.isQuestion ? `${note.author} · Question` : 'Private note'}</span>}
            {note.userId === userId && <button type="button" onClick={() => deleteNote(note.id)} className="min-h-8 shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal" aria-label={`Delete note at ${formatNoteTimestamp(note.seconds)}`}>Delete</button>}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{note.body}</p>
          {note.reply && <p className="mt-3 border-l-2 border-academic-teal pl-3 text-sm leading-6"><strong>Teacher reply: </strong>{note.reply}</p>}
          {canManage && note.isQuestion && <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => sendReply(event, note.id)}><Input aria-label={`Reply to ${note.author}`} required maxLength={3000} value={replies[note.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [note.id]: event.target.value }))} placeholder="Reply to this question" /><Button type="submit" size="sm" variant="outline" className="self-start">Save reply</Button></form>}
        </article>)}</div>
      </div>
    </div>

    <div id="lesson-about-panel" role="tabpanel" aria-labelledby="lesson-about-tab" hidden={tab !== 'about'} className="space-y-5 p-4 sm:p-5">
      <div><h2 className="text-base font-semibold">About this lesson</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{video.description || 'No description has been added for this lesson.'}</p></div>
      <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground"><p>By {video.uploadedByName}</p><p className="flex items-center gap-2"><Calendar className="size-4" aria-hidden="true" />{format(new Date(video.createdAt), 'dd MMM yyyy')}</p>{video.duration && <p className="flex items-center gap-2"><Clock className="size-4" aria-hidden="true" />{formatDurationVerbose(video.duration)}</p>}</div>
      <div className="flex flex-wrap gap-2">{video.isRequired && <Badge variant="outline"><AlertTriangle className="mr-1 size-3" />Required{video.dueDate ? ` · due ${format(new Date(video.dueDate), 'dd MMM')}` : ''}</Badge>}{video.subjectName && <Badge variant="secondary">{video.subjectName}</Badge>}{video.className && <Badge variant="outline"><BookOpen className="mr-1 size-3" />{video.className}</Badge>}{video.visibility === 'TEACHERS_ONLY' && <Badge variant="outline">Teachers only</Badge>}{video.status === 'DRAFT' && <Badge variant="outline">Draft</Badge>}</div>
      {originalUrl && <div className="border-t border-border pt-4"><a href={originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-academic-teal hover:underline"><ExternalLink className="size-4" />Open original video</a>{embedUrl && <p className="mt-2 text-xs leading-5 text-muted-foreground">{isYouTube ? 'Your playback position is saved in MRLC.' : 'This provider does not support automatic progress tracking.'} Watching outside MRLC is not tracked.</p>}</div>}
    </div>
  </aside>;
}
