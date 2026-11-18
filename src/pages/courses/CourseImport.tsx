import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Download, FileArchive, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authHeaders, downloadAuthenticatedFile } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { COURSE_PACKAGE_MAX_BYTES, type CoursePackagePreview } from '../../../shared/coursePackage';
import { CourseBack, CourseErrorNotice, CourseFacts, CourseIntro } from './CourseUi';

const fileSize = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.ceil(bytes / 1024))} KiB` : `${(bytes / 1048576).toFixed(1)} MiB`;

export default function CourseImport() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<CoursePackagePreview | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | 'template' | null>(null), [error, setError] = useState(''), [rights, setRights] = useState(false);
  const [result, setResult] = useState<{ id: string; warnings: string[] } | null>(null);
  const requestKey = useRef(crypto.randomUUID()), pending = useRef(false), controller = useRef<AbortController | null>(null), mounted = useRef(true);
  const identity = useRef(user?.id); identity.current = user?.id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (busy === 'import') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload);
  }, [busy]);
  const send = async (confirm = false) => {
    if (!file || pending.current || confirm && (!rights || !preview)) return;
    pending.current = true; setBusy(confirm ? 'import' : 'preview'); setError('');
    const authId = identity.current; controller.current = new AbortController();
    try {
      const form = new FormData(); form.append('file', file);
      if (confirm) { form.append('digest', preview!.digest); form.append('requestKey', requestKey.current); form.append('rights', 'true'); }
      const response = await fetch(confirm ? '/api/courses/import' : '/api/courses/import/preview', { method: 'POST', headers: authHeaders(), body: form, signal: controller.current.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Could not ${confirm ? 'import' : 'preview'} the ZIP. Please try again.`);
      if (mounted.current && identity.current === authId) { if (confirm) setResult(data); else setPreview(data); }
    } catch (e) { if (mounted.current && identity.current === authId && (e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Could not process this package.'); }
    finally { if (mounted.current && identity.current === authId) setBusy(null); pending.current = false; }
  };
  const template = async () => {
    if (pending.current) return; pending.current = true; setBusy('template'); setError('');
    try { await downloadAuthenticatedFile('/api/courses/package-template', 'mrlc-offline-course-starter.zip'); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Could not download the starter.'); }
    finally { if (mounted.current) setBusy(null); pending.current = false; }
  };
  return <div className="courses-workspace"><CourseBack /><CourseIntro title="Import a course" description="Move a course from your local LMS, or bring in a package you prepared offline. Review its contents before creating a draft." />
    {error && <CourseErrorNotice message={error} />}
    {result ? <section className="course-sheet"><div className="course-import-success"><Check size={22} aria-hidden="true" /><div><h2>Your course draft is ready</h2><p>Review the lessons and reconnect any missing activities. An administrator must approve the course before students can use it.</p></div></div>{result.warnings.length > 0 && <ul className="course-checklist mt-5">{result.warnings.map((warning, n) => <li key={n}>{warning}</li>)}</ul>}<Link to={`/courses/${result.id}/edit`} className={buttonVariants({ className: 'min-h-11 mt-5' })}>Open imported draft<ArrowRight size={16} /></Link></section> : <div className="course-import-grid"><section className="course-sheet"><div className="course-section-heading"><h2>Choose your package</h2><p>An MRLC course ZIP can contain the syllabus, lesson text, PDFs and MP4/WebM videos.</p></div><div className="course-field"><Label htmlFor="course-zip">Course ZIP</Label><input id="course-zip" type="file" accept=".zip,application/zip" disabled={!!busy} aria-describedby="course-zip-help" className="course-file-input" onChange={e => {
      const next = e.target.files?.[0] ?? null; setFile(null); setPreview(null); setRights(false); setError(''); requestKey.current = crypto.randomUUID();
      if (next && (!/\.zip$/i.test(next.name) || next.size > COURSE_PACKAGE_MAX_BYTES)) { setError('Choose an MRLC .zip package smaller than 90 MiB.'); e.target.value = ''; return; }
      setFile(next);
    }} /><p id="course-zip-help" className="course-helper">Up to 90 MiB per ZIP, with up to 80 MiB of included media. Large videos can be uploaded separately after importing.</p></div><Button variant={preview ? 'outline' : 'default'} onClick={() => send()} disabled={!file || !!busy} className="min-h-11 mt-5"><Upload size={16} />{busy === 'preview' ? 'Checking package…' : 'Preview package'}</Button>
      <div className="course-import-help"><h3>Starting from scratch?</h3><p>Download an example with a syllabus and an editable lesson text file. Its README explains how to add modules and media.</p><Button variant="outline" onClick={template} disabled={!!busy} className="min-h-11"><Download size={16} />{busy === 'template' ? 'Downloading…' : 'Download starter ZIP'}</Button></div></section>
      <section className="course-sheet" aria-labelledby="package-preview-heading" aria-live="polite"><div className="course-section-heading"><h2 id="package-preview-heading">Package preview</h2><p>{preview ? 'Check the learning path and any resources that need attention.' : 'Choose a ZIP and preview it to see what will be imported.'}</p></div>{preview ? <><h3 className="mb-3">{preview.course.title}</h3><CourseFacts draft={preview.course} /><p className="course-summary">{preview.course.summary}</p><ol className="course-package-modules">{preview.course.modules.map(module => <li key={module.id}><strong>{module.title}</strong><span>{module.items.length} lessons</span></li>)}</ol>{preview.resources.length > 0 && <div className="course-package-resources"><h3>Learning resources</h3>{preview.resources.map(resource => <div key={resource.key}><span>{resource.title}</span><span>{resource.included ? `${fileSize(resource.bytes)} included` : 'Reconnect after import'}</span></div>)}</div>}{preview.warnings.length > 0 && <ul className="course-checklist mt-5">{preview.warnings.map((warning, n) => <li key={n}>{warning}</li>)}</ul>}<Label className="course-package-consent" htmlFor="import-rights"><input id="import-rights" type="checkbox" checked={rights} disabled={!!busy} onChange={e => setRights(e.target.checked)} /><span>I may copy and share these materials in this school’s LMS.</span></Label><Button onClick={() => send(true)} disabled={!rights || !!busy} className="min-h-11"><FileArchive size={16} />{busy === 'import' ? 'Creating draft…' : 'Import as new draft'}</Button><p className="course-helper mt-3">Existing courses and student records stay unchanged. Imported files remain staff-only until approval.</p></> : <div className="course-empty"><FileArchive size={28} className="mx-auto mb-4" aria-hidden="true" />The syllabus and file summary will appear here.</div>}</section></div>}
  </div>;
}
