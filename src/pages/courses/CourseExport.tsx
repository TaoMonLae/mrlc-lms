import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { downloadAuthenticatedFile } from '../../lib/api';
import { CourseErrorNotice } from './CourseUi';

export default function CourseExport({ courseId, disabled }: { courseId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [media, setMedia] = useState(true), [rights, setRights] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const download = async () => {
    if (lock.current || media && !rights) return;
    lock.current = true; setBusy(true); setError('');
    try { await downloadAuthenticatedFile(`/api/courses/${courseId}/export?${new URLSearchParams({ media: media ? '1' : '0', rights: rights ? '1' : '0' })}`, 'mrlc-course.zip'); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not export this course.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <><Button variant="outline" disabled={disabled} className="min-h-11" onClick={() => { setError(''); setRights(false); setOpen(true); }}><Download size={16} />Export ZIP</Button><Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}><DialogContent><DialogHeader><DialogTitle>Export course ZIP</DialogTitle><DialogDescription>Take the saved syllabus and editable lesson text to another LMS, or work on the files offline.</DialogDescription></DialogHeader>{error && <CourseErrorNotice message={error} />}<Label className="course-package-consent" htmlFor="export-media"><input id="export-media" type="checkbox" checked={media} disabled={busy} onChange={e => setMedia(e.target.checked)} /><span>Include eligible local PDFs and MP4/WebM videos</span></Label>{media && <Label className="course-package-consent" htmlFor="export-rights"><input id="export-rights" type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} /><span>I may copy and transfer the included materials.</span></Label>}<p className="text-sm leading-6 text-muted-foreground">Included media is limited to 80 MiB. Read README.txt in the ZIP for any omitted files. Exams, homework and Learning Quest practice need reconnecting after import. Student records are excluded.</p><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || media && !rights} onClick={download}><Download size={16} />{busy ? 'Preparing ZIP…' : 'Download ZIP'}</Button></DialogFooter></DialogContent></Dialog></>;
}
