import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBadge, Plus, Loader2, ExternalLink, Link2, Ban, RefreshCw, Eye, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';

const TYPE_LABELS: Record<string, string> = {
  REPORT_CARD: 'Report Card',
  TRANSCRIPT: 'Transcript',
  ENROLLMENT_CONFIRMATION: 'Enrollment Confirmation',
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  PROGRESS_REPORT: 'Progress Report',
};

type Doc = {
  id: string; documentNumber: string; verifyToken: string; type: string; status: string;
  studentName: string; studentCode: string; term: string | null; issueDate: string; downloadCount: number;
};

const statusStyle = (s: string) =>
  s === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : s === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600';

export default function DocumentsPage() {
  const { isAdmin } = usePermissions();
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentId, setStudentId] = useState('');
  const [docType, setDocType] = useState('REPORT_CARD');
  const [term, setTerm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  // Bulk generation for a whole class
  const [eligibleClasses, setEligibleClasses] = useState<{ id: string; name: string; studentCount: number }[]>([]);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkType, setBulkType] = useState('REPORT_CARD');
  const [bulkTerm, setBulkTerm] = useState('');
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const loadDocs = () => {
    setLoading(true);
    const params = typeFilter !== 'all' ? `?type=${typeFilter}` : '';
    apiGet<Doc[]>(`/api/documents${params}`).then(setDocs).catch(() => toast.error('Failed to load documents')).finally(() => setLoading(false));
  };

  useEffect(() => {
    apiGet<any[]>('/api/students')
      .then((ss) => setStudents(ss.map((s: any) => ({
        id: s.id, name: `${s.user?.firstName ?? s.firstName ?? ''} ${s.user?.lastName ?? s.lastName ?? ''}`.trim() || s.studentCode,
      }))))
      .catch(() => {});
  }, []);
  useEffect(loadDocs, [typeFilter]);

  useEffect(() => {
    apiGet<{ id: string; name: string; studentCount: number }[]>('/api/documents/eligible-classes')
      .then(setEligibleClasses)
      .catch(() => {});
  }, []);

  const selectedBulkClass = eligibleClasses.find((c) => c.id === bulkClassId);

  const generateBulk = async () => {
    if (!bulkClassId) { toast.error('Select a class'); return; }
    // Confirmation for large classes to prevent accidental bulk runs
    const LARGE_CLASS_THRESHOLD = 30;
    if (selectedBulkClass && selectedBulkClass.studentCount >= LARGE_CLASS_THRESHOLD) {
      const confirmed = window.confirm(
        `You are about to generate documents for ${selectedBulkClass.studentCount} students in ${selectedBulkClass.name}. Continue?`
      );
      if (!confirmed) return;
    }
    setBulkGenerating(true);
    try {
      const r = await apiSend<{ generated: number; skipped: number; failed: number; total: number; className: string }>(
        '/api/documents/bulk', 'POST', { type: bulkType, classId: bulkClassId, term: bulkTerm || undefined });
      if (r.generated > 0) toast.success(`${r.generated} ${TYPE_LABELS[bulkType]}${r.generated === 1 ? '' : 's'} generated for ${r.className}`);
      if (r.skipped > 0) toast.info(`${r.skipped} student(s) skipped (existing document)`);
      if (r.failed > 0) toast.warning(`${r.failed} student(s) failed`);
      if (r.generated === 0 && r.skipped === 0 && r.failed === 0) toast.info('No active students in that class');
      setBulkTerm('');
      loadDocs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to bulk generate');
    } finally {
      setBulkGenerating(false);
    }
  };

  const generate = async () => {
    if (!studentId) { toast.error('Select a student'); return; }
    setGenerating(true);
    try {
      const doc = await apiSend<Doc>('/api/documents', 'POST', { type: docType, studentId, term: term || undefined });
      toast.success(`${TYPE_LABELS[docType]} generated (${doc.documentNumber})`);
      setTerm('');
      loadDocs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const copyVerifyLink = (d: Doc) => {
    navigator.clipboard.writeText(`${window.location.origin}/verify/${d.verifyToken}`);
    toast.success('Verification link copied');
  };

  const cancelDoc = async (d: Doc) => {
    const reason = prompt('Reason for cancellation (optional):') ?? undefined;
    try {
      await apiSend(`/api/documents/${d.id}/cancel`, 'POST', { reason });
      toast.success('Document cancelled');
      loadDocs();
    } catch (e: any) { toast.error(e.message || 'Failed to cancel'); }
  };

  const reissue = async (d: Doc) => {
    if (!confirm('Reissue this document with fresh data? The current one will be marked as reissued.')) return;
    try {
      const fresh = await apiSend<Doc>(`/api/documents/${d.id}/reissue`, 'POST');
      toast.success(`Reissued as ${fresh.documentNumber}`);
      loadDocs();
    } catch (e: any) { toast.error(e.message || 'Failed to reissue'); }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileBadge className="h-6 w-6 text-aubergine-600" /> Official Documents
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Generate verifiable report cards, transcripts and certificates.</p>
      </div>

      {/* Generate */}
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Generate a Document</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student">
                  {students.find((s) => s.id === studentId)?.name || 'Select student'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue>{TYPE_LABELS[docType]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Term / Period (optional)</Label>
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Term 1 2026" className="h-9 w-full rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-3 text-sm" />
          </div>
          <Button onClick={generate} disabled={generating} className="bg-primary text-primary-foreground">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Generate
          </Button>
        </div>
      </div>

      {/* Bulk generate for a class */}
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-aubergine-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Bulk generate for a class</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Issue one document type for every active student in a class at once{isAdmin ? '' : ' — you can only pick classes you teach'}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={bulkClassId} onValueChange={setBulkClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class">
                  {selectedBulkClass ? `${selectedBulkClass.name} (${selectedBulkClass.studentCount})` : 'Select class'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {eligibleClasses.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No classes available</div>}
                {eligibleClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} · {c.studentCount} student{c.studentCount === 1 ? '' : 's'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={bulkType} onValueChange={setBulkType}>
              <SelectTrigger><SelectValue>{TYPE_LABELS[bulkType]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Term / Period (optional)</Label>
            <input value={bulkTerm} onChange={(e) => setBulkTerm(e.target.value)} placeholder="e.g. Term 1 2026" className="h-9 w-full rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-3 text-sm" />
          </div>
          <Button onClick={generateBulk} disabled={bulkGenerating || !bulkClassId} className="bg-primary text-primary-foreground">
            {bulkGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Layers className="h-4 w-4 mr-1" />}
            Generate {selectedBulkClass ? `× ${selectedBulkClass.studentCount}` : 'for class'}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-surface-raised">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Issued Documents</h3>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue>{typeFilter === 'all' ? 'All Types' : TYPE_LABELS[typeFilter]}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-6 py-3">Document No.</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Downloads</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading…</td></tr>}
              {!loading && docs.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No documents generated yet.</td></tr>}
              {!loading && docs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-900 dark:text-white">{d.documentNumber}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{TYPE_LABELS[d.type] || d.type}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.studentName} <span className="text-xs text-slate-400 font-mono">{d.studentCode}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(d.issueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center"><Badge className={`${statusStyle(d.status)} border-0`}>{d.status}</Badge></td>
                  <td className="px-4 py-3 text-center text-slate-500">{d.downloadCount}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8">Actions</Button>} nativeButton={true} />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link to={`/documents/${d.id}/print`} className="flex w-full" />} nativeButton={false}><Eye className="h-4 w-4 mr-2" /> Open / Print</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyVerifyLink(d)}><Link2 className="h-4 w-4 mr-2" /> Copy verify link</DropdownMenuItem>
                        <DropdownMenuItem render={<a href={`/verify/${d.verifyToken}`} target="_blank" rel="noreferrer" className="flex w-full" />} nativeButton={false}><ExternalLink className="h-4 w-4 mr-2" /> Public verify page</DropdownMenuItem>
                        {isAdmin && d.status === 'ACTIVE' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => reissue(d)}><RefreshCw className="h-4 w-4 mr-2" /> Reissue</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => cancelDoc(d)}><Ban className="h-4 w-4 mr-2" /> Cancel</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
