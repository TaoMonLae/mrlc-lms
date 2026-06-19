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
  'Malaysia',
  'Myanmar',
  'Thailand',
  'Bangladesh',
  'India',
  'Indonesia',
  'Pakistan',
  'Philippines',
  'Somalia',
  'Sri Lanka',
  'Syria',
  'Yemen',
  'Other',
];

const ID_TYPE_OPTIONS = [
  { value: 'UNHCR_ID', label: 'UNHCR ID' },
  { value: 'PPN', label: 'PPN' },
  { value: 'CCN', label: 'Community Card Number (CCN)' },
];

const EDUCATION_LEVELS = [
  'No Formal Education',
  'Primary School',
  'Secondary School',
  'GED Preparation',
  'GED Certificate',
  'Some College',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Other',
];

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) || '' };
};

export default function StudentForm({ initialData, isEdit = false }: StudentFormProps) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('MALE');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [selectedCountry, setSelectedCountry] = useState<string>(initialData?.country || '');
  const [selectedIdType, setSelectedIdType] = useState<string>(initialData?.identityType || '');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>(initialData?.educationLevel || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(initialData?.profilePhotoUrl || initialData?.user?.profilePhotoUrl || null);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [pendingProfilePhotoPreview, setPendingProfilePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') ?? '';
        const res = await fetch('/api/classes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (initialData) {
      if (initialData.classId) {
        setSelectedClass(initialData.classId);
      } else if (initialData.class?.id) {
        setSelectedClass(initialData.class.id);
      }
      if (initialData.gender) setSelectedGender(initialData.gender);
      if (initialData.status) setSelectedStatus(initialData.status);
      if (initialData.country) setSelectedCountry(initialData.country);
      if (initialData.identityType) setSelectedIdType(initialData.identityType);
      if (initialData.educationLevel) setSelectedEducationLevel(initialData.educationLevel);
      setProfilePhotoUrl(initialData.profilePhotoUrl || initialData.user?.profilePhotoUrl || null);
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (pendingProfilePhotoPreview) URL.revokeObjectURL(pendingProfilePhotoPreview);
    };
  }, [pendingProfilePhotoPreview]);

  const handlePendingPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be 5 MB or smaller');
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Profile picture must be an image file');
      event.target.value = '';
      return;
    }
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
    const res = await fetch('/api/profile-photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Student saved, but profile picture upload failed');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const studentId = (e.currentTarget.querySelector('#studentId') as HTMLInputElement).value;
      const fullName = (e.currentTarget.querySelector('#fullName') as HTMLInputElement).value;
      const { firstName, lastName } = splitFullName(fullName);
      const dateOfBirth = (e.currentTarget.querySelector('#dateOfBirth') as HTMLInputElement).value;
      const address = (e.currentTarget.querySelector('#address') as HTMLTextAreaElement).value;
      const enrollmentDate = (e.currentTarget.querySelector('#enrollmentDate') as HTMLInputElement).value;
      const guardianName = (e.currentTarget.querySelector('#guardianName') as HTMLInputElement).value;
      const guardianPhone = (e.currentTarget.querySelector('#guardianPhone') as HTMLInputElement).value;
      const contactNumber = (e.currentTarget.querySelector('#contactNumber') as HTMLInputElement).value;
      const identityNumber = (e.currentTarget.querySelector('#identityNumber') as HTMLInputElement).value;
      const emergencyContact = (e.currentTarget.querySelector('#emergencyContact') as HTMLInputElement).value;
      const notes = (e.currentTarget.querySelector('#notes') as HTMLTextAreaElement).value;

      const educationLevel = (e.currentTarget.querySelector('#educationLevel') as HTMLSelectElement)?.value || '';

      // Construct a valid email derived from student code/ID
      const sanitizedId = studentId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedId || 'student'}@mrlc-student.edu`;

      const payload = {
        studentCode: studentId,
        firstName,
        lastName,
        email,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        gender: selectedGender,
        country: selectedCountry,
        identityType: selectedIdType,
        identityNumber,
        contactNumber,
        address,
        classId: selectedClass || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate).toISOString() : new Date().toISOString(),
        status: selectedStatus,
        guardianName,
        guardianPhone,
        emergencyContact,
        notes,
        educationLevel: educationLevel || null,
      };

      const token = sessionStorage.getItem('auth_token') ?? '';
      const url = isEdit ? `/api/students/${initialData.id}` : '/api/students';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save student details');
      }

      const savedStudent = await res.json();
      if (!isEdit && savedStudent?.id && pendingProfilePhoto) {
        await uploadPendingProfilePhoto(savedStudent.id);
      }

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
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const defaultFullName = `${initialData?.user?.firstName || initialData?.firstName || ''} ${initialData?.user?.lastName || initialData?.lastName || ''}`.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Personal Information</h2>

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
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Choose Photo
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
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
            <Input id="fullName" defaultValue={defaultFullName} placeholder="Enter student's full name" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" defaultValue={getFormattedDate(initialData?.dateOfBirth)} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ID Type</Label>
            <Select value={selectedIdType} onValueChange={setSelectedIdType}>
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identityNumber">ID Number</Label>
            <Input id="identityNumber" defaultValue={initialData?.identityNumber} placeholder="Enter selected ID number" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Student Contact Number</Label>
            <Input id="contactNumber" defaultValue={initialData?.contactNumber} placeholder="+60..." />
          </div>
          
          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="address">Current Address</Label>
            <Textarea id="address" defaultValue={initialData?.address} placeholder="Full address" rows={3} />
          </div>
        </div>
      </div>

      {/* Academic & Enrollment */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Academic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="classId">Assigned Class <span className="text-red-500">*</span></Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} required>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="enrollmentDate">Enrollment Date <span className="text-red-500">*</span></Label>
            <Input id="enrollmentDate" type="date" defaultValue={getFormattedDate(initialData?.enrollmentDate) || new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Student Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="educationLevel">Education Level</Label>
            <Select value={selectedEducationLevel} onValueChange={setSelectedEducationLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select education level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Guardian & Background Info */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Guardian & Background</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="guardianName">Guardian Name</Label>
            <Input id="guardianName" defaultValue={initialData?.guardianName} placeholder="Name of parent/guardian" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="guardianPhone">Guardian Phone</Label>
            <Input id="guardianPhone" defaultValue={initialData?.guardianPhone} placeholder="+1234567890" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input id="emergencyContact" defaultValue={initialData?.emergencyContact} placeholder="Name and number" />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" defaultValue={initialData?.notes} placeholder="Any medical or background notes..." rows={3} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-surface-raised">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => navigate('/students')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Student')}
        </Button>
      </div>
    </form>
  );
}
