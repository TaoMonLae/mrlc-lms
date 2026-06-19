import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, ShieldAlert, Shield, Clock, CheckCircle2, AlertTriangle, MessageSquare, AlertCircle, Plus, FileText, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermissions, useUser } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Safely format a date — returns a placeholder instead of throwing on
// missing/invalid values (date-fns `format` throws on Invalid Date).
const safeFormat = (value: any, pattern: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : format(d, pattern);
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [newNote, setNewNote] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/cases/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setCaseData)
      .catch(() => toast.error('Failed to load case'));
  }, [id]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <Badge variant="destructive" className="py-1 uppercase text-xs">Urgent</Badge>;
      case 'HIGH': return <Badge className="bg-aubergine-100 text-aubergine-800 hover:bg-aubergine-100 dark:bg-aubergine-900/30 dark:text-aubergine-400 border-0 py-1 uppercase text-xs">High</Badge>;
      case 'MEDIUM': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-1 uppercase text-xs">Medium</Badge>;
      case 'LOW': return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-surface-raised dark:text-slate-300 border-0 py-1 uppercase text-xs">Low</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-sm"><AlertTriangle className="w-4 h-4 mr-1"/> Open</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-sm"><Clock className="w-4 h-4 mr-1"/> In Progress</Badge>;
      case 'FOLLOW_UP': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-sm"><Clock className="w-4 h-4 mr-1"/> Follow Up</Badge>;
      case 'RESOLVED': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> Resolved</Badge>;
      case 'CLOSED': return <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-surface-raised text-sm">Closed</Badge>;
      default: return null;
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    const token = sessionStorage.getItem('auth_token');
    try {
      const res = await fetch(`/api/cases/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add note');
      }
      const note = await res.json();
      setCaseData((prev: any) => prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev);
      toast.success('Note added successfully');
      setNewNote('');
      setIsPrivateNote(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCase = async () => {
    setIsDeleting(true);
    const token = sessionStorage.getItem('auth_token');
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete case');
      }
      toast.success('Case deleted.');
      navigate('/cases');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete case');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!caseData) {
    return <div className="p-8 text-center text-slate-500">Loading case...</div>;
  }

  // Normalize the API record (Prisma CaseRecord) into the shape this view uses.
  const activeCase = {
    id: caseData.id,
    caseNumber: caseData.caseNumber || `CAS-${String(caseData.id || '').slice(0, 8).toUpperCase()}`,
    title: caseData.title,
    description: caseData.description,
    type: caseData.type || caseData.category || 'GENERAL',
    priority: caseData.priority,
    status: caseData.status,
    studentId: caseData.studentId,
    studentName:
      caseData.studentName ||
      (caseData.student?.user
        ? `${caseData.student.user.firstName ?? ''} ${caseData.student.user.lastName ?? ''}`.trim()
        : '') ||
      'Unknown student',
    assignedToName: caseData.assignedToName || 'Unassigned',
    openedByName: caseData.openedByName || '—',
    openedAt: caseData.openedAt || caseData.createdAt,
    notes: (caseData.notes || []).map((n: any) => ({
      id: n.id,
      note: n.content ?? n.note ?? '',
      createdByName:
        n.createdByName ||
        (n.createdBy ? `${n.createdBy.firstName ?? ''} ${n.createdBy.lastName ?? ''}`.trim() : '') ||
        'Staff',
      createdAt: n.createdAt,
      isPrivate: Boolean(n.isPrivate),
    })),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/cases" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cases
          </Button>
          <div className="flex items-center gap-3">
             <div className={`p-3 rounded-xl border shadow-sm ${activeCase.type === 'PROTECTION' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30 text-red-500' : 'bg-white dark:bg-surface-indigo border-slate-200 dark:border-surface-raised text-slate-500'}`}>
                {activeCase.type === 'PROTECTION' ? <ShieldAlert className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{activeCase.title}</h1>
               <div className="flex items-center gap-2 mt-2">
                 <span className="font-mono text-sm text-slate-500">{activeCase.caseNumber}</span>
                 <span className="text-slate-300 dark:text-slate-700">•</span>
                 <Link to={`/students/${activeCase.studentId}`} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {activeCase.studentName}
                 </Link>
               </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" render={<Link to={`/cases/${id}/edit`} />} nativeButton={false}>
             <Edit2 className="mr-2 h-4 w-4" /> Edit Details
           </Button>
           {hasPermission('manage_cases') && (
             <Button
               variant="outline"
               className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
               onClick={() => setConfirmDelete(true)}
             >
               <Trash2 className="mr-2 h-4 w-4" /> Delete Case
             </Button>
           )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Case
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{activeCase.title}</strong>? This will also remove all case notes and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCase} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
               <div className="space-y-4 w-full">
                  <div className="flex gap-2">
                    {getStatusBadge(activeCase.status)}
                    {getPriorityBadge(activeCase.priority)}
                    <Badge variant="outline" className="text-slate-600 dark:text-slate-300 font-normal uppercase">{activeCase.type}</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Description / Concern</h3>
                    <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{activeCase.description}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 border-b border-slate-200 dark:border-surface-raised bg-slate-50/50 dark:bg-surface-raised/50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-slate-500" /> Case Notes & Timeline
                </h3>
             </div>
             <div className="p-6 space-y-8">
                
                {/* Timeline Items */}
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                  
                  {activeCase.notes.map((note) => (
                    <div key={note.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-100 dark:bg-surface-raised text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                        {note.isPrivate ? <AlertCircle className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4" />}
                      </div>
                      
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm relative">
                        {/* Connecting Arrow */}
                        <div className="absolute top-[15px] -left-2 w-2 h-2 bg-white dark:bg-surface-indigo border-t border-l border-slate-200 dark:border-surface-raised transform -rotate-45 md:group-even:hidden"></div>
                        <div className="absolute top-[15px] -right-2 w-2 h-2 bg-white dark:bg-surface-indigo border-t border-r border-slate-200 dark:border-surface-raised transform rotate-45 hidden md:group-even:block"></div>
                        
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">{note.createdByName}</span>
                          <span className="text-xs text-slate-500">{safeFormat(note.createdAt, 'MMM d, h:mm a')}</span>
                        </div>
                        {note.isPrivate && (
                           <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mb-2 border border-amber-200 dark:border-amber-800/50">
                             Internal Only
                           </span>
                        )}
                        <p className="text-sm text-slate-700 dark:text-slate-300">{note.note}</p>
                      </div>
                    </div>
                  ))}

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">Case Opened</span>
                          <span className="text-xs text-slate-500">{safeFormat(activeCase.openedAt, 'MMM d, yyyy')}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Opened by {activeCase.openedByName}</p>
                      </div>
                  </div>

                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-surface-raised space-y-4">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Add New Note
                  </h4>
                  <Textarea 
                    placeholder="Type your follow-up note or update here..." 
                    rows={4}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        checked={isPrivateNote}
                        onChange={(e) => setIsPrivateNote(e.target.checked)}
                      />
                      Make this an internal private note
                    </label>
                    <Button 
                      className="bg-slate-900 hover:bg-slate-800 text-white" 
                      onClick={handleAddNote}
                      disabled={isSubmitting || !newNote.trim()}
                    >
                      {isSubmitting ? 'Posting...' : 'Post Note'}
                    </Button>
                  </div>
                </div>

             </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Case Details</h3>
            
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Assigned To</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{activeCase.assignedToName || 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Opened By</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{activeCase.openedByName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Opened On</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{safeFormat(activeCase.openedAt, 'MMMM d, yyyy h:mm a')}</dd>
              </div>
            </dl>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl shadow-sm p-6 overflow-hidden text-sm text-amber-800 dark:text-amber-300">
             <AlertTriangle className="w-5 h-5 mb-2" />
             <p className="font-semibold mb-1">Privacy Notice</p>
             <p>Case data contains sensitive information. Do not share externally unless mandated by local safeguarding laws. Ensure notes accurately reflect facts.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
