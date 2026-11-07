import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronsUpDown, Loader2, Search, User, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, apiSend } from '../../lib/api';
import { officialDocumentViewPath } from '@/shared/officialDocuments';
import { DOCUMENT_TYPE_LABELS, documentTypeNoun } from './documentLabels';

export type StudentOption = { id: string; name: string; code: string; className: string | null };
export type ClassOption = { id: string; name: string; studentCount: number };
type Mode = 'student' | 'class';

const LARGE_CLASS_THRESHOLD = 30;
const inputClass = 'h-9 w-full rounded-sm border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35';

/**
 * One place to issue documents, for a single learner or a whole class.
 * Replaces the two near-identical "Generate" and "Bulk generate" forms.
 */
export default function IssueDocumentPanel({
  students, classes, termSuggestions, isAdmin, onIssued, onClose,
}: {
  students: StudentOption[];
  classes: ClassOption[];
  termSuggestions: string[];
  isAdmin: boolean;
  onIssued: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const termListId = useId();
  const [mode, setMode] = useState<Mode>('student');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [type, setType] = useState('REPORT_CARD');
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(false);

  const student = students.find((s) => s.id === studentId);
  const klass = classes.find((c) => c.id === classId);
  const count = mode === 'class' ? klass?.studentCount ?? 0 : 1;
  const ready = mode === 'student' ? !!student : !!klass && klass.studentCount > 0;
  const noun = documentTypeNoun(type, count);
  const termText = term.trim();

  useEffect(() => { setConfirmLarge(false); }, [mode, classId, type]);

  const summary = mode === 'student'
    ? (student ? <>Issues a {noun} for <strong className="text-foreground">{student.name}</strong>{termText ? <> · {termText}</> : null}.</> : 'Choose a student to continue.')
    : (klass
      ? <>Issues {count} {noun} to <strong className="text-foreground">{klass.name}</strong>{termText ? <> · {termText}</> : null}. Students who already have one for this period are skipped.</>
      : (isAdmin ? 'Choose a class to continue.' : 'Choose one of the classes you teach.'));

  const issue = async () => {
    if (!ready || busy) return;
    if (mode === 'class' && count >= LARGE_CLASS_THRESHOLD && !confirmLarge) { setConfirmLarge(true); return; }
    setBusy(true);
    try {
      if (mode === 'student') {
        const doc = await apiSend<{ id: string; type: string; documentNumber: string }>('/api/documents', 'POST', { type, studentId, term: termText || undefined });
        toast.success(`${DOCUMENT_TYPE_LABELS[type]} issued for ${student!.name}`, {
          description: type === 'STUDENT_ID_CARD' ? 'The learner can now view and print it from My Profile.' : doc.documentNumber,
          action: { label: 'Open', onClick: () => navigate(officialDocumentViewPath(doc)) },
        });
        setStudentId('');
      } else {
        const r = await apiSend<{ generated: number; skipped: number; failed: number; className: string }>(
          '/api/documents/bulk', 'POST', { type, classId, term: termText || undefined });
        const parts = [
          r.skipped ? `${r.skipped} skipped (already issued)` : '',
          r.failed ? `${r.failed} failed` : '',
        ].filter(Boolean).join(' · ');
        if (r.generated > 0) toast.success(`${r.generated} ${documentTypeNoun(type, r.generated)} issued to ${r.className}`, { description: parts || undefined });
        else if (r.skipped || r.failed) toast.info(`Nothing new issued to ${r.className}`, { description: parts });
        else toast.info(`${r.className} has no active students`);
        setClassId('');
      }
      setConfirmLarge(false);
      onIssued();
    } catch (e) {
      const existing = e instanceof ApiError ? e.data?.existingDocument : null;
      if (existing) {
        toast.error('Already issued for this period', {
          description: `${existing.documentNumber} is still active. Reissue or cancel it before issuing another.`,
          action: { label: 'Open existing', onClick: () => navigate(officialDocumentViewPath(existing)) },
        });
      } else {
        toast.error(e instanceof Error ? e.message : 'Could not issue the document');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="issue-heading" className="rounded-sm border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 id="issue-heading" className="text-base font-semibold text-foreground">Issue a document</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close issue panel"><X /></Button>
      </div>

      <div className="space-y-5 px-5 py-4">
        <div role="radiogroup" aria-label="Issue to" className="inline-flex rounded-sm border border-border bg-muted p-[2px]">
          {([['student', 'One student', User], ['class', 'Whole class', Users]] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${mode === value ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-1.5 min-w-0">
            <Label>{mode === 'student' ? 'Student' : 'Class'}</Label>
            {mode === 'student' ? (
              <StudentPicker students={students} value={studentId} onChange={setStudentId} />
            ) : (
              <Select value={classId} onValueChange={(v) => setClassId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a class">{klass ? `${klass.name} · ${klass.studentCount} active` : 'Choose a class'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No classes available</div>}
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.studentCount} active student{c.studentCount === 1 ? '' : 's'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label>Document</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="w-full"><SelectValue>{DOCUMENT_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${termListId}-input`}>Term or period <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <input
              id={`${termListId}-input`}
              list={termListId}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. Term 1 2026"
              maxLength={100}
              className={inputClass}
            />
            <datalist id={termListId}>{termSuggestions.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {confirmLarge
              ? <span className="text-foreground">This issues <strong>{count} {noun}</strong> at once. Select the button again to confirm.</span>
              : summary}
          </p>
          <div className="flex shrink-0 gap-2">
            {confirmLarge && <Button variant="outline" onClick={() => setConfirmLarge(false)}>Back</Button>}
            <Button onClick={issue} disabled={!ready || busy}>
              {busy && <Loader2 className="animate-spin" />}
              {confirmLarge ? `Confirm ${count} ${noun}` : mode === 'class' && klass ? `Issue ${count} ${noun}` : `Issue ${documentTypeNoun(type, 1)}`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Searchable student picker: type a name, student ID or class. */
function StudentPicker({ students, value, onChange }: { students: StudentOption[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = students.find((s) => s.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? students.filter((s) => `${s.name} ${s.code} ${s.className ?? ''}`.toLowerCase().includes(q))
      : students;
    return list.slice(0, 60);
  }, [students, query]);

  useEffect(() => { setActive(0); }, [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (id: string) => { onChange(id); setOpen(false); setQuery(''); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-sm border border-input bg-card px-3 text-left text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        }
      >
        {selected
          ? <span className="min-w-0 truncate text-foreground">{selected.name} <span className="text-muted-foreground">· {selected.code}</span></span>
          : <span className="text-muted-foreground">Search by name or student ID</span>}
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 border-0 bg-transparent p-0 shadow-none">
        {/* The box is drawn here so it always grows with the result list. */}
        <div className="overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-[0_8px_24px_rgb(15_23_42/0.14)]">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); choose(matches[active].id); }
            }}
            placeholder="Name, student ID or class"
            aria-label="Search students"
            role="combobox"
            aria-expanded="true"
            aria-controls="student-picker-list"
            aria-activedescendant={matches[active] ? `student-opt-${matches[active].id}` : undefined}
            className="h-10 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div ref={listRef} id="student-picker-list" role="listbox" aria-label="Students" className="max-h-72 overflow-y-auto p-1">
          {matches.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No student matches “{query}”.</p>}
          {matches.map((s, i) => (
            <div
              key={s.id}
              id={`student-opt-${s.id}`}
              data-index={i}
              role="option"
              aria-selected={s.id === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s.id)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-sm ${i === active ? 'bg-accent text-accent-foreground' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.code}{s.className ? ` · ${s.className}` : ''}</span>
              </span>
              {s.id === value && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
            </div>
          ))}
          {students.length > matches.length && !query && (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">Showing the first 60 students. Type to search all {students.length}.</p>
          )}
        </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
