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
import { toast } from 'sonner';

interface StudentFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function StudentForm({ initialData, isEdit = false }: StudentFormProps) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('MALE');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
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
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const studentId = (e.currentTarget.querySelector('#studentId') as HTMLInputElement).value;
      const firstName = (e.currentTarget.querySelector('#firstName') as HTMLInputElement).value;
      const lastName = (e.currentTarget.querySelector('#lastName') as HTMLInputElement).value;
      const dateOfBirth = (e.currentTarget.querySelector('#dateOfBirth') as HTMLInputElement).value;
      const nationality = (e.currentTarget.querySelector('#nationality') as HTMLInputElement).value;
      const address = (e.currentTarget.querySelector('#address') as HTMLTextAreaElement).value;
      const enrollmentDate = (e.currentTarget.querySelector('#enrollmentDate') as HTMLInputElement).value;
      const guardianName = (e.currentTarget.querySelector('#guardianName') as HTMLInputElement).value;
      const guardianPhone = (e.currentTarget.querySelector('#guardianPhone') as HTMLInputElement).value;

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
        nationality,
        address,
        classId: selectedClass || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate).toISOString() : new Date().toISOString(),
        status: selectedStatus,
        guardianName,
        guardianPhone,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Personal Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID <span className="text-red-500">*</span></Label>
            <Input id="studentId" defaultValue={initialData?.studentCode || initialData?.studentId} placeholder="e.g. ST-2024-001" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
            <Input id="firstName" defaultValue={initialData?.user?.firstName || initialData?.firstName} placeholder="First name" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
            <Input id="lastName" defaultValue={initialData?.user?.lastName || initialData?.lastName} placeholder="Last name" required />
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
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" defaultValue={initialData?.nationality} placeholder="e.g. Myanmar" />
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
          
          <div className="space-y-2">
            <Label htmlFor="unhcrInfo">UNHCR Status / Number</Label>
            <Input id="unhcrInfo" defaultValue={initialData?.unhcrNumber} placeholder="If registered, enter number" />
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
