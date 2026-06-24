import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, FileUp, GraduationCap, Loader2, Save, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend, authHeaders } from '../../lib/api';

interface AdmissionDocument {
  id: string;
  title: string;
  documentType: string;
  checklistStatus: string;
  fileUrl?: string | null;
  fileName?: string | null;
  notes?: string | null;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

interface AdmissionApplication {
  id: string;
  applicationNo?: string;
  applicantName: string;
  preferredName?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  country?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  targetLevel?: string | null;
  targetClassId?: string | null;
  previousSchool?: string | null;
  previousEducationLevel?: string | null;
  previousEducationNotes?: string | null;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  identityType?: string | null;
  identityNumber?: string | null;
  legalDocumentationStatus?: string | null;
  boardingType?: string | null;
  medicalInformation?: string | null;
  allergies?: string | null;
  medicationNotes?: string | null;
  interviewAt?: string | null;
  interviewMode?: string | null;
  interviewLocation?: string | null;
  interviewNotes?: string | null;
  decisionAt?: string | null;
  decisionByName?: string | null;
  decisionNotes?: string | null;
  status: string;
  notes?: string | null;
  convertedStudentId?: string | null;
  documents: AdmissionDocument[];
  timeline: TimelineEvent[];
}

const checklistStatuses = ['PENDING', 'RECEIVED', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED'];

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [interview, setInterview] = useState({ interviewAt: '', interviewMode: 'IN_PERSON', interviewLocation: '', interviewNotes: '' });
  const [decision, setDecision] = useState({ status: 'APPROVED', decisionNotes: '' });
  const [documentForm, setDocumentForm] = useState({ title: '', documentType: 'OTHER', checklistStatus: 'RECEIVED', notes: '' });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [conversion, setConversion] = useState({ studentCode: '', classId: '', enrollmentDate: new Date().toISOString().slice(0, 10), password: '' });

  const loadApplication = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiGet<AdmissionApplication>(`/api/admissions/${id}`);
      setApplication(data);
      if (data.interviewAt) {
        setInterview((prev) => ({ ...prev, interviewAt: data.interviewAt!.slice(0, 16), interviewMode: data.interviewMode || 'IN_PERSON', interviewLocation: data.interviewLocation || '', interviewNotes: data.interviewNotes || '' }));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load application');
      navigate('/admissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [id]);

  const scheduleInterview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setBusy('interview');
    try {
      const updated = await apiSend<AdmissionApplication>(`/api/admissions/${id}/interview`, 'POST', interview);
      setApplication(updated);
      toast.success('Interview scheduled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setBusy(null);
    }
  };

  const recordDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setBusy('decision');
    try {
      const updated = await apiSend<AdmissionApplication>(`/api/admissions/${id}/decision`, 'POST', decision);
      setApplication(updated);
      toast.success('Decision recorded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record decision');
    } finally {
      setBusy(null);
    }
  };

  const uploadDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setBusy('document');
    try {
      const body = new FormData();
      Object.entries(documentForm).forEach(([key, value]) => body.append(key, value));
      if (documentFile) body.append('file', documentFile);
      const res = await fetch(`/api/admissions/${id}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to upload document');
      toast.success('Document saved');
      setDocumentForm({ title: '', documentType: 'OTHER', checklistStatus: 'RECEIVED', notes: '' });
      setDocumentFile(null);
      await loadApplication();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setBusy(null);
    }
  };

  const updateDocumentStatus = async (document: AdmissionDocument, checklistStatus: string) => {
    if (!id) return;
    try {
      await apiSend(`/api/admissions/${id}/documents/${document.id}`, 'PUT', {
        title: document.title,
        documentType: document.documentType,
        checklistStatus,
        notes: document.notes || '',
      });
      await loadApplication();
      toast.success('Checklist updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update document');
    }
  };

  const convertToStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setBusy('convert');
    try {
      const result = await apiSend<any>(`/api/admissions/${id}/convert`, 'POST', {
        ...conversion,
        classId: conversion.classId || null,
        password: conversion.password || undefined,
      });
      toast.success(`Enrolled as ${result.student.studentCode}`);
      setApplication(result.application);
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll application');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>;
  }

  if (!application) return null;

  const verifiedDocs = application.documents.filter((doc) => doc.checklistStatus === 'VERIFIED').length;
  const canConvert = application.status === 'APPROVED' && !application.convertedStudentId;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2" render={<Link to="/admissions" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admissions
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{application.applicantName}</h1>
            <span className="rounded-md bg-aubergine-100 px-2 py-1 text-xs font-semibold text-aubergine-700 dark:bg-aubergine-500/20 dark:text-aubergine-200">{application.status.replaceAll('_', ' ')}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{application.applicationNo || application.id}</p>
        </div>
        {application.convertedStudentId && (
          <Button render={<Link to={`/students/${application.convertedStudentId}`} />} nativeButton={false}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Open Student Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
        <main className="space-y-6">
          <Panel title="Application Profile">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label="Preferred name" value={application.preferredName} />
              <Info label="Email" value={application.email} />
              <Info label="Date of birth" value={formatDate(application.dateOfBirth)} />
              <Info label="Gender" value={application.gender} />
              <Info label="Country" value={application.country} />
              <Info label="Contact" value={application.contactNumber} />
              <Info label="Target level" value={application.targetLevel} />
              <Info label="Previous school" value={application.previousSchool} />
              <Info label="Previous education" value={application.previousEducationLevel} />
              <Info label="ID type" value={application.identityType} />
              <Info label="ID number" value={application.identityNumber} />
              <Info label="Legal documentation" value={application.legalDocumentationStatus} />
              <Info label="Boarding/day student" value={application.boardingType} />
              <Info label="Guardian" value={application.guardianName} />
              <Info label="Guardian phone" value={application.guardianPhone} />
              <Info label="Emergency contact" value={[application.emergencyContactName, application.emergencyContactPhone].filter(Boolean).join(' - ')} />
            </div>
            <LongInfo label="Address" value={application.address} />
            <LongInfo label="Medical information" value={application.medicalInformation} />
            <LongInfo label="Allergies / medication" value={[application.allergies, application.medicationNotes].filter(Boolean).join('\n')} />
            <LongInfo label="Application notes" value={application.notes} />
          </Panel>

          <Panel title={`Document Checklist (${verifiedDocs}/${application.documents.length} verified)`}>
            <div className="space-y-3">
              {application.documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{document.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{document.documentType.replaceAll('_', ' ')} - {document.fileName || 'No file uploaded'}</div>
                      {document.fileUrl && <a href={document.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-aubergine-600">Open document</a>}
                    </div>
                    <select value={document.checklistStatus} onChange={(event) => updateDocumentStatus(document, event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-surface-raised dark:text-white">
                      {checklistStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={uploadDocument} className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-white/5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Upload or add checklist item</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input value={documentForm.title} onChange={(event) => setDocumentForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Document title" required />
                <Input value={documentForm.documentType} onChange={(event) => setDocumentForm((prev) => ({ ...prev, documentType: event.target.value }))} placeholder="Document type" />
                <select value={documentForm.checklistStatus} onChange={(event) => setDocumentForm((prev) => ({ ...prev, checklistStatus: event.target.value }))} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-surface-raised dark:text-white">
                  {checklistStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
                <Input type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
              </div>
              <Textarea value={documentForm.notes} onChange={(event) => setDocumentForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Document notes" className="mt-3" />
              <Button type="submit" disabled={busy === 'document'} className="mt-3">
                {busy === 'document' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Save Document
              </Button>
            </form>
          </Panel>

          <Panel title="Status Timeline">
            <div className="space-y-4">
              {application.timeline.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aubergine-100 text-aubergine-700 dark:bg-aubergine-500/20 dark:text-aubergine-200">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{item.title}</div>
                    <div className="text-sm text-slate-500">{formatDateTime(item.createdAt)} - {item.createdByName || 'System'}</div>
                    {item.fromStatus || item.toStatus ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.fromStatus || 'Start'}{' -> '}{item.toStatus || 'No status'}</div> : null}
                    {item.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </main>

        <aside className="space-y-6">
          <Panel title="Interview">
            <form onSubmit={scheduleInterview} className="space-y-3">
              <Field label="Interview date/time" type="datetime-local" value={interview.interviewAt} onChange={(value) => setInterview((prev) => ({ ...prev, interviewAt: value }))} required />
              <Field label="Mode" value={interview.interviewMode} onChange={(value) => setInterview((prev) => ({ ...prev, interviewMode: value }))} />
              <Field label="Location / link" value={interview.interviewLocation} onChange={(value) => setInterview((prev) => ({ ...prev, interviewLocation: value }))} />
              <Textarea value={interview.interviewNotes} onChange={(event) => setInterview((prev) => ({ ...prev, interviewNotes: event.target.value }))} placeholder="Interview notes" />
              <Button type="submit" disabled={busy === 'interview'} className="w-full">
                {busy === 'interview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Schedule Interview
              </Button>
            </form>
          </Panel>

          <Panel title="Admission Decision">
            <form onSubmit={recordDecision} className="space-y-3">
              <select value={decision.status} onChange={(event) => setDecision((prev) => ({ ...prev, status: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-surface-raised dark:text-white">
                {['APPROVED', 'WAITLISTED', 'REJECTED'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <Textarea value={decision.decisionNotes} onChange={(event) => setDecision((prev) => ({ ...prev, decisionNotes: event.target.value }))} placeholder="Decision notes" />
              <Button type="submit" disabled={busy === 'decision'} className="w-full">
                {busy === 'decision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Record Decision
              </Button>
            </form>
          </Panel>

          <Panel title="Enrollment Conversion">
            <form onSubmit={convertToStudent} className="space-y-3">
              <Field label="Student ID" value={conversion.studentCode} onChange={(value) => setConversion((prev) => ({ ...prev, studentCode: value }))} placeholder="Leave blank to generate" disabled={!canConvert} />
              <Field label="Class ID" value={conversion.classId} onChange={(value) => setConversion((prev) => ({ ...prev, classId: value }))} placeholder="Optional" disabled={!canConvert} />
              <Field label="Enrollment date" type="date" value={conversion.enrollmentDate} onChange={(value) => setConversion((prev) => ({ ...prev, enrollmentDate: value }))} disabled={!canConvert} />
              <Field label="Initial password" type="password" value={conversion.password} onChange={(value) => setConversion((prev) => ({ ...prev, password: value }))} placeholder="Leave blank to force default change" disabled={!canConvert} />
              <Button type="submit" disabled={!canConvert || busy === 'convert'} className="w-full">
                {busy === 'convert' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                Convert to Student
              </Button>
              {!canConvert && <p className="text-xs text-slate-500">Only approved, not-yet-enrolled applications can be converted.</p>}
            </form>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-indigo">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value || 'Not set'}</div>
    </div>
  );
}

function LongInfo({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
}
