import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';

interface StudentFormProps {
  initialData?: any;
  isEdit?: boolean;
}

const COUNTRY_OPTIONS = [
  'Malaysia', 'Myanmar', 'Thailand', 'Bangladesh', 'India', 'Indonesia',
  'Pakistan', 'Philippines', 'Somalia', 'Sri Lanka', 'Syria', 'Yemen', 'Other',
];

const ID_TYPE_OPTIONS = [
  { value: 'UNHCR_ID', label: 'UNHCR ID' },
  { value: 'PPN', label: 'PPN' },
  { value: 'CCN', label: 'Community Card Number (CCN)' },
];

const EDUCATION_LEVELS = [
  'No Formal Education', 'Primary School', 'Secondary School', 'GED Preparation',
  'GED Certificate', 'Some College', "Bachelor's Degree", "Master's Degree", 'Other',
];

const LEGAL_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
  { value: 'NOT_REQUIRED', label: 'Not Required' },
];

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) || '' };
};

const sectionClass = 'bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm';
const headingClass = 'text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-surface-raised pb-2';

export default function StudentForm({ initialData, isEdit = false }: StudentFormProps) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('MALE');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [selectedCountry, setSelectedCountry] = useState<string>(initialData?.country || '');
  const [selectedIdType, setSelectedIdType] = useState<string>(initialData?.identityType || '');
  const [selectedLegalStatus, setSelectedLegalStatus] = useState<string>(initialData?.legalDocumentationStatus || '');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>(initialData?.educationLevel || '');
  const [selectedPrevEduLevel, setSelectedPrevEduLevel] = useState<string>(initialData?.previousEducationLevel || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(initialData?.profilePhotoUrl || initialData?.user?.profilePhotoUrl || null);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [pendingProfilePhotoPreview, setPendingProfilePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') ?? '';
        const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setClasses(await res.json());
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (initialData) {
      if (initialData.classId) setSelectedClass(initialData.classId);
      else if (initialData.class?.id) setSelectedClass(initialData.class.id);
      if (initialData.gender) setSelectedGender(initialData.gender);
      if (initialData.status) setSelectedStatus(initialData.status);
      if (initialData.country) setSelectedCountry(initialData.country);
      if (initialData.identityType) setSelectedIdType(initialData.identityType);
      if (initialData.legalDocumentationStatus) setSelectedLegalStatus(initialData.legalDocumentationStatus);
      if (initialData.educationLevel) setSelectedEducationLevel(initialData.educationLevel);
      if (initialData.previousEducationLevel) setSelectedPrevEduLevel(initialData.previousEducationLevel);
      setProfilePhotoUrl(initialData.profilePhotoUrl || initialData.user?.profilePhotoUrl || null);
    }
  }, [initialData]);

  useEffect(() => () => {
    if (pendingProfilePhotoPreview) URL.revokeObjectURL(pendingProfilePhotoPreview);
  }, [pendingProfilePhotoPreview]);

  const handlePendingPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Profile picture must be 5 MB or smaller'); event.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { toast.error('Profile picture must be an image file'); event.target.value = ''; return; }
    if (pendingProfilePhotoPreview) URL.revokeObjectURL(pendingProfilePhotoPreview);
    setPendingProfilePhoto(file);
    setPendingProfilePhotoPreview(URL.createObjectURL(file));
  };

  const uploadPendingProfilePhoto = async (studentId: string) => {
    if (!pendingProfilePhoto) return;
    const token = sessionStorage.getItem('auth_token') ?? '';
    const body = new FormData();
    body.append('file', pendingProfilePhoto);
    body.append('targetType', 'student');
    body.append('targetId', studentId);
    const res = await fetch('/api/profile-photo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Student saved, but profile picture upload failed');
  };

  const val = (form: HTMLFormElement, id: string) =>
    (form.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const form = e.currentTarget;
      const studentId = val(form, 'studentId');
      const fullName = val(form, 'fullName');
      const { firstName, lastName } = splitFullName(fullName);

      const emergencyContactName = val(form, 'emergencyContactName');
      const emergencyContactPhone = val(form, 'emergencyContactPhone');

      const sanitizedId = studentId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedId || 'student'}@mrlc-student.edu`;

      const payload = {
        studentCode: studentId,
        firstName,
        lastName,
        email,
        preferredName: val(form, 'preferredName'),
        dateOfBirth: val(form, 'dateOfBirth') ? new Date(val(form, 'dateOfBirth')).toISOString() : null,
        gender: selectedGender,
        country: selectedCountry,
        contactNumber: val(form, 'contactNumber'),
        address: val(form, 'address'),
        // Identity & legal
        identityType: selectedIdType,
        identityNumber: val(form, 'identityNumber'),
        legalDocumentationStatus: selectedLegalStatus || null,
        // Academic
        classId: selectedClass || null,
        educationLevel: selectedEducationLevel || null,
        previousSchool: val(form, 'previousSchool'),
        previousEducationLevel: selectedPrevEduLevel || null,
        enrollmentDate: val(form, 'enrollmentDate') ? new Date(val(form, 'enrollmentDate')).toISOString() : new Date().toISOString(),
        status: selectedStatus,
        // Guardian
        guardianName: val(form, 'guardianName'),
        guardianRelationship: val(form, 'guardianRelationship'),
        guardianPhone: val(form, 'guardianPhone'),
        guardianEmail: val(form, 'guardianEmail'),
        // Emergency contact
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship: val(form, 'emergencyContactRelationship'),
        emergencyContact: [emergencyContactName, emergencyContactPhone].filter(Boolean).join(' - '),
        // Health
        medicalInformation: val(form, 'medicalInformation'),
        allergies: val(form, 'allergies'),
        // Notes
        notes: val(form, 'notes'),
      };

      const token = sessionStorage.getItem('auth_token') ?? '';
      const url = isEdit ? `/api/students/${initialData.id}` : '/api/students';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save student details');
      }
      const savedStudent = await res.json();
      if (!isEdit && savedStudent?.id && pendingProfilePhoto) await uploadPendingProfilePhoto(savedStudent.id);

      toast.success(isEdit ? 'Student updated successfully' : 'Student enrolled successfully');
      navigate('/students');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return dateStr; }
  };

  const defaultFullName = `${initialData?.user?.firstName || initialData?.firstName || ''} ${initialData?.user?.lastName || initialData?.lastName || ''}`.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Personal Information</h2>

        {isEdit && initialData?.id ? (
          <div className="mb-6">
            <ProfilePhotoUploader
              currentUrl={profilePhotoUrl}
              fallbackText={`${initialData?.user?.firstName?.[0] || initialData?.firstName?.[0] || ''}${initialData?.user?.lastName?.[0] || initialData?.lastName?.[0] || ''}`}
              targetType="student"
              targetId={initialData.id}
              onUploaded={setProfilePhotoUrl}
              imageClassName="h-24 w-24 rounded-full"
            />
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-start gap-3">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 dark:bg-surface-raised border border-slate-200 dark:border-surface-raised flex items-center justify-center">
                {pendingProfilePhotoPreview ? (
                  <img src={pendingProfilePhotoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div>
                <Label htmlFor="profilePhoto" className="cursor-pointer">
                  <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-surface-raised px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-surface-raised">
                    <UploadCloud className="mr-2 h-4 w-4" /> Choose Photo
                  </div>
                </Label>
                <input id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handlePendingPhotoChange} />
                <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP, GIF, or SVG up to 5 MB.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID <span className="text-red-500">*</span></Label>
            <Input id="studentId" defaultValue={initialData?.studentCode || initialData?.studentId} placeholder="e.g. ST-2024-001" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
            <Input id="fullName" defaultValue={defaultFullName} placeholder="Enter student's full name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred Name</Label>
            <Input id="preferredName" defaultValue={initialData?.preferredName} placeholder="Nickname / preferred name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" defaultValue={getFormattedDate(initialData?.dateOfBirth)} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country / Nationality</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger><SelectValue placeholder="Select country">{selectedCountry || 'Select country'}</SelectValue></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Student Contact Number</Label>
            <Input id="contactNumber" defaultValue={initialData?.contactNumber} placeholder="+60..." />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="address">Current Address</Label>
            <Textarea id="address" defaultValue={initialData?.address} placeholder="Full address" rows={2} />
          </div>
        </div>
      </div>

      {/* Identity & Legal */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Identity &amp; Legal Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>ID Type</Label>
            <Select value={selectedIdType} onValueChange={setSelectedIdType}>
              <SelectTrigger><SelectValue placeholder="Select ID type">{ID_TYPE_OPTIONS.find((o) => o.value === selectedIdType)?.label || 'Select ID type'}</SelectValue></SelectTrigger>
              <SelectContent>
                {ID_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="identityNumber">ID Number</Label>
            <Input id="identityNumber" defaultValue={initialData?.identityNumber} placeholder="Enter selected ID number" />
          </div>
          <div className="space-y-2">
            <Label>Legal Documentation Status</Label>
            <Select value={selectedLegalStatus} onValueChange={setSelectedLegalStatus}>
              <SelectTrigger><SelectValue placeholder="Select status">{LEGAL_STATUS_OPTIONS.find((o) => o.value === selectedLegalStatus)?.label || 'Select status'}</SelectValue></SelectTrigger>
              <SelectContent>
                {LEGAL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Academic Background */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Academic Background &amp; Enrollment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="classId">Assigned Class <span className="text-red-500">*</span></Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} required>
              <SelectTrigger><SelectValue placeholder="Select class">{classes.find((c) => c.id === selectedClass)?.name || 'Select class'}</SelectValue></SelectTrigger>
              <SelectContent>
                {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Current Education Level</Label>
            <Select value={selectedEducationLevel} onValueChange={setSelectedEducationLevel}>
              <SelectTrigger><SelectValue placeholder="Select level">{selectedEducationLevel || 'Select level'}</SelectValue></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Previous Education Level</Label>
            <Select value={selectedPrevEduLevel} onValueChange={setSelectedPrevEduLevel}>
              <SelectTrigger><SelectValue placeholder="Select level">{selectedPrevEduLevel || 'Select level'}</SelectValue></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="previousSchool">Previous School</Label>
            <Input id="previousSchool" defaultValue={initialData?.previousSchool} placeholder="Name of previous school (if any)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrollmentDate">Enrollment Date <span className="text-red-500">*</span></Label>
            <Input id="enrollmentDate" type="date" defaultValue={getFormattedDate(initialData?.enrollmentDate) || new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="space-y-2">
            <Label>Student Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Guardian Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="guardianName">Guardian Name</Label>
            <Input id="guardianName" defaultValue={initialData?.guardianName} placeholder="Name of parent/guardian" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianRelationship">Relationship</Label>
            <Input id="guardianRelationship" defaultValue={initialData?.guardianRelationship} placeholder="e.g. Mother, Uncle" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianPhone">Guardian Phone</Label>
            <Input id="guardianPhone" defaultValue={initialData?.guardianPhone} placeholder="+60..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianEmail">Guardian Email</Label>
            <Input id="guardianEmail" type="email" defaultValue={initialData?.guardianEmail} placeholder="guardian@example.com" />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Emergency Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contact Name</Label>
            <Input id="emergencyContactName" defaultValue={initialData?.emergencyContactName} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
            <Input id="emergencyContactPhone" defaultValue={initialData?.emergencyContactPhone} placeholder="+60..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelationship">Relationship</Label>
            <Input id="emergencyContactRelationship" defaultValue={initialData?.emergencyContactRelationship} placeholder="e.g. Aunt, Friend" />
          </div>
        </div>
      </div>

      {/* Health & Medical */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Health &amp; Medical</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="medicalInformation">Medical Information</Label>
            <Textarea id="medicalInformation" defaultValue={initialData?.medicalInformation} placeholder="Conditions, medications, ongoing care…" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea id="allergies" defaultValue={initialData?.allergies} placeholder="Known allergies (food, medication, etc.)" rows={3} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Internal Notes</h2>
        <Textarea id="notes" defaultValue={initialData?.notes} placeholder="Any background notes for staff…" rows={3} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-surface-raised">
        <Button type="button" variant="outline" onClick={() => navigate('/students')} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Student')}
        </Button>
      </div>
    </form>
  );
}
