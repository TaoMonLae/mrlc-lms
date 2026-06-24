import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, FileCheck2, Filter, Loader2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend, qs } from '../../lib/api';

interface AdmissionApplication {
  id: string;
  applicationNo?: string;
  applicantName: string;
  guardianName?: string;
  contactNumber?: string;
  targetLevel?: string;
  status: string;
  boardingType?: string;
  legalDocumentationStatus?: string;
  submittedAt: string;
  documents?: Array<{ checklistStatus: string }>;
}

const statusOptions = ['all', 'SUBMITTED', 'DOCUMENTS_PENDING', 'INTERVIEW_SCHEDULED', 'UNDER_REVIEW', 'APPROVED', 'WAITLISTED', 'REJECTED', 'ENROLLED', 'WITHDRAWN'];
const legalOptions = ['PENDING', 'VERIFIED', 'MISSING', 'EXPIRED'];
const boardingOptions = ['DAY', 'BOARDING'];
const idTypeOptions = ['UNHCR_ID', 'PPN', 'CCN', 'PASSPORT', 'OTHER'];

const emptyForm = {
  applicantName: '',
  preferredName: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  country: '',
  address: '',
  contactNumber: '',
  targetLevel: '',
  previousSchool: '',
  previousEducationLevel: '',
  previousEducationNotes: '',
  guardianName: '',
  guardianRelationship: '',
  guardianPhone: '',
  guardianEmail: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  identityType: '',
  identityNumber: '',
  legalDocumentationStatus: 'PENDING',
  boardingType: 'DAY',
  medicalInformation: '',
  allergies: '',
  medicationNotes: '',
  notes: '',
};

export default function AdmissionsList() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [targetLevel, setTargetLevel] = useState('');
  const [form, setForm] = useState<Record<string, string>>(emptyForm);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await apiGet<AdmissionApplication[]>(`/api/admissions${qs({ q: query, status, targetLevel })}`);
      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load admissions');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const setField = (name: string, value: string) => setForm((prev) => ({ ...prev, [name]: value }));

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await apiSend<AdmissionApplication>('/api/admissions', 'POST', form);
      toast.success('Application submitted');
      setForm(emptyForm);
      navigate(`/admissions/${created.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setSaving(false);
    }
  };

  const checklistSummary = (app: AdmissionApplication) => {
    const docs = app.documents || [];
    if (!docs.length) return 'No checklist';
    const verified = docs.filter((doc) => doc.checklistStatus === 'VERIFIED').length;
    return `${verified}/${docs.length} verified`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admissions & Enrollment</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Submit applications, review documents, schedule interviews, decide, waitlist, and enroll approved students.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_1fr]">
        <form onSubmit={submitApplication} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-indigo">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Application</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">No demo data is used; this creates a real admissions record.</p>
          </div>

          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Applicant</h3>
              <Field label="Full name" name="applicantName" value={form.applicantName} onChange={setField} required />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Preferred name" name="preferredName" value={form.preferredName} onChange={setField} />
                <Field label="Email" name="email" type="email" value={form.email} onChange={setField} />
                <Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={setField} />
                <SelectField label="Gender" name="gender" value={form.gender} onChange={setField} options={['MALE', 'FEMALE', 'OTHER']} />
                <Field label="Country" name="country" value={form.country} onChange={setField} />
                <Field label="Contact number" name="contactNumber" value={form.contactNumber} onChange={setField} />
              </div>
              <TextField label="Address" name="address" value={form.address} onChange={setField} />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Academic</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Target grade / level" name="targetLevel" value={form.targetLevel} onChange={setField} />
                <Field label="Previous school" name="previousSchool" value={form.previousSchool} onChange={setField} />
              </div>
              <Field label="Previous education level" name="previousEducationLevel" value={form.previousEducationLevel} onChange={setField} />
              <TextField label="Previous education notes" name="previousEducationNotes" value={form.previousEducationNotes} onChange={setField} />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Guardian & Emergency</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Guardian name" name="guardianName" value={form.guardianName} onChange={setField} />
                <Field label="Relationship" name="guardianRelationship" value={form.guardianRelationship} onChange={setField} />
                <Field label="Guardian phone" name="guardianPhone" value={form.guardianPhone} onChange={setField} />
                <Field label="Guardian email" name="guardianEmail" type="email" value={form.guardianEmail} onChange={setField} />
                <Field label="Emergency contact" name="emergencyContactName" value={form.emergencyContactName} onChange={setField} />
                <Field label="Emergency phone" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={setField} />
              </div>
              <Field label="Emergency relationship" name="emergencyContactRelationship" value={form.emergencyContactRelationship} onChange={setField} />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Legal, Boarding & Medical</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField label="ID type" name="identityType" value={form.identityType} onChange={setField} options={idTypeOptions} />
                <Field label="ID number" name="identityNumber" value={form.identityNumber} onChange={setField} />
                <SelectField label="Legal status" name="legalDocumentationStatus" value={form.legalDocumentationStatus} onChange={setField} options={legalOptions} />
                <SelectField label="Boarding type" name="boardingType" value={form.boardingType} onChange={setField} options={boardingOptions} />
              </div>
              <TextField label="Medical information" name="medicalInformation" value={form.medicalInformation} onChange={setField} />
              <Field label="Allergies" name="allergies" value={form.allergies} onChange={setField} />
              <Field label="Medication notes" name="medicationNotes" value={form.medicationNotes} onChange={setField} />
              <TextField label="Application notes" name="notes" value={form.notes} onChange={setField} />
            </section>
          </div>

          <Button type="submit" disabled={saving} className="mt-5 w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Submit Application
          </Button>
        </form>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-indigo">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, application no, guardian, ID..." className="pl-9" />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-surface-raised dark:text-white">
                {statusOptions.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
              </select>
              <Input value={targetLevel} onChange={(event) => setTargetLevel(event.target.value)} placeholder="Target level" />
              <Button type="button" onClick={loadApplications} disabled={loading} variant="outline">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                Filter
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-surface-indigo">
            {loading ? (
              <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : applications.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">No admission applications found.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {applications.map((application) => (
                  <Link key={application.id} to={`/admissions/${application.id}`} className="block p-4 transition hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{application.applicantName}</h3>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">{application.status.replaceAll('_', ' ')}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{application.applicationNo || 'No application number'} - {application.targetLevel || 'No target level'} - {application.guardianName || 'No guardian'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[360px]">
                        <Metric icon={FileCheck2} label="Checklist" value={checklistSummary(application)} />
                        <Metric icon={CalendarClock} label="Submitted" value={new Date(application.submittedAt).toLocaleDateString()} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required = false }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required ? ' *' : ''}</Label>
      <Input id={name} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} required={required} />
    </div>
  );
}

function TextField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} value={value} onChange={(event) => onChange(name, event.target.value)} rows={3} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} value={value} onChange={(event) => onChange(name, event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-surface-raised dark:text-white">
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
