import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiSend } from '../../lib/api';

type TeacherPermission = { teacherUserId: string; name: string; allowed: boolean };
export type PermissionScope = 'editors' | 'answer-key-permissions';

export default function ExamPermissionsDialog({ examId, scope, onClose }: {
  examId: string; scope: PermissionScope; onClose: () => void;
}) {
  const sharing = scope === 'editors';
  const path = `/api/exams/${encodeURIComponent(examId)}/${scope}`;
  const [rows, setRows] = useState<TeacherPermission[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    apiGet<TeacherPermission[]>(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Could not load teachers.'); });
    return () => controller.abort();
  }, [path, retry]);

  async function change(row: TeacherPermission) {
    const allowed = !row.allowed;
    setBusy(row.teacherUserId); setError(''); setNotice('');
    try {
      await apiSend(path, 'PUT', { teacherUserId: row.teacherUserId, allowed });
      setRows(current => current?.map(item => item.teacherUserId === row.teacherUserId ? { ...item, allowed } : item) ?? null);
      setNotice(`Access updated for ${row.name}.`);
    } catch (reason: any) { setError(reason.message || 'Could not update access.'); }
    finally { setBusy(''); }
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogTitle>{sharing ? 'Manage editing access' : 'Answer-key permissions'}</DialogTitle>
      <DialogDescription>{sharing ? 'Teachers assigned to this class can view the exam. Choose who can also edit it and manage student responses.' : 'Choose which assigned teachers may correct the answer key after publication. Existing submitted answers are rescored when a key changes.'}</DialogDescription>
      {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p>{rows === null && <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button>}</div>}
      {rows === null && !error && <p role="status" className="text-sm text-muted-foreground">Loading teachers…</p>}
      {rows?.length === 0 && <p className="text-sm text-muted-foreground">{sharing ? 'No other active teachers are assigned to this class.' : 'No active teachers are assigned to this class.'}</p>}
      {rows && rows.length > 0 && <ul className="max-h-[50dvh] overflow-y-auto divide-y divide-border border-y border-border">
        {rows.map(row => <li key={row.teacherUserId} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="break-words font-medium">{row.name}</p>
            <p className="text-sm text-muted-foreground">{sharing ? row.allowed ? 'Can edit' : 'View only' : row.allowed ? 'Can correct answers' : 'No correction access'}</p>
          </div>
          <Button variant="outline" disabled={!!busy} className="min-h-11 shrink-0"
            aria-label={`${row.allowed ? 'Revoke' : 'Grant'} ${sharing ? 'editing' : 'answer-key'} access for ${row.name}`} onClick={() => change(row)}>
            {busy === row.teacherUserId ? 'Saving…' : row.allowed ? sharing ? 'Make view only' : 'Revoke' : sharing ? 'Allow editing' : 'Grant access'}
          </Button>
        </li>)}
      </ul>}
      <p className="sr-only" role="status">{notice}</p>
      <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Done</Button></div>
    </DialogContent>
  </Dialog>;
}
