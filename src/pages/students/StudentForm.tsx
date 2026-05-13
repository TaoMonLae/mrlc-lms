import React from 'react';
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

interface StudentFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function StudentForm({ initialData, isEdit = false }: StudentFormProps) {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would save here
    navigate('/students');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Personal Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID <span className="text-red-500">*</span></Label>
            <Input id="studentId" defaultValue={initialData?.studentId} placeholder="e.g. ST-2024-001" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
            <Input id="firstName" defaultValue={initialData?.firstName} placeholder="First name" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
            <Input id="lastName" defaultValue={initialData?.lastName} placeholder="Last name" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" defaultValue={initialData?.dateOfBirth} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select defaultValue={initialData?.gender || "MALE"}>
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Academic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="classId">Assigned Class <span className="text-red-500">*</span></Label>
            <Select defaultValue={initialData?.classId || "ged-social-studies"} required>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ged-social-studies">GED Social Studies</SelectItem>
                <SelectItem value="pre-ged-english">Pre-GED English</SelectItem>
                <SelectItem value="ged-math">GED Math Prep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="enrollmentDate">Enrollment Date <span className="text-red-500">*</span></Label>
            <Input id="enrollmentDate" type="date" defaultValue={initialData?.enrollmentDate || new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Student Status</Label>
            <Select defaultValue={initialData?.status || "ACTIVE"}>
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Guardian & Background</h2>
        
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
             {/* Note: In a real schema this might be boolean + string */}
            <Label htmlFor="unhcrInfo">UNHCR Status / Number</Label>
            <Input id="unhcrInfo" defaultValue={initialData?.unhcrNumber} placeholder="If registered, enter number" />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" defaultValue={initialData?.notes} placeholder="Any medical or background notes..." rows={3} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => navigate('/students')}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isEdit ? 'Save Changes' : 'Create Student'}
        </Button>
      </div>
    </form>
  );
}
