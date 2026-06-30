import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  BookOpen,
  Briefcase,
  AlertCircle,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface StudentProfile {
  name: string; studentId: string; role: string; status: string; class: string;
  profilePhotoUrl?: string | null;
  email: string; phone: string; address: string; birthDate: string; gender: string;
  enrollmentDate: string; guardian: { name: string; relationship: string; phone: string; email: string };
}

export default function StudentProfilePage() {
  const currentAcademicYear = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
  const [student, setStudent] = useState<StudentProfile>({
    name: '', studentId: '', role: 'Student', status: 'Active', class: '',
    email: '', phone: '', address: '', birthDate: '', gender: '',
    enrollmentDate: '', guardian: { name: '', relationship: '', phone: '', email: '' },
  });

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    apiGet<StudentProfile>('/api/student/profile')
      .then((r) => r && setStudent(r))
      .catch(() => {
        if (import.meta.env.DEV) {
          setStudent({
            name: 'Min Khant', studentId: 'ST-2024-001', role: 'Student', status: 'Active', class: 'Class A',
            email: 'minkhant@school.edu', phone: '+95 9 123 456 789', address: 'Yangon, Myanmar',
            birthDate: '2008-05-15', gender: 'Male', enrollmentDate: '2024-01-10',
            guardian: { name: 'U Maung Maung', relationship: 'Father', phone: '+95 9 987 654 321', email: 'umaungmaung@gmail.com' },
          });
        }
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Print Button - Hidden in print */}
      <div className="flex justify-end no-print">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print PDF
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-surface-indigo p-8 rounded-2xl border border-slate-200 dark:border-surface-raised shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-aubergine-500/5 rounded-full -mr-16 -mt-16" />

        <ProfilePhotoUploader
          currentUrl={student.profilePhotoUrl}
          fallbackText={student.name.charAt(0) || 'S'}
          targetType="student"
          onUploaded={(url) => setStudent((prev) => ({ ...prev, profilePhotoUrl: url }))}
          imageClassName="h-24 w-24 rounded-2xl"
          buttonLabel="Change Picture"
        />
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2 justify-center md:justify-start">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{sanitizeText(student.name)}</h1>
            <Badge className="w-fit mx-auto md:mx-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 uppercase font-bold text-[10px] tracking-widest">{sanitizeText(student.status)}</Badge>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-slate-500 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {student.studentId}</span>
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {student.class}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {student.enrollmentDate ? new Date(student.enrollmentDate).getFullYear() : '—'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* General Information */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-aubergine-600" /> General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Full Name" value={student.name} />
                <InfoItem label="Student ID" value={student.studentId} />
                <InfoItem label="Date of Birth" value={student.birthDate} />
                <InfoItem label="Gender" value={student.gender} />
                <InfoItem label="Class" value={student.class} />
                <InfoItem label="Enrollment Date" value={student.enrollmentDate} />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-aubergine-600" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Email Address" value={student.email} />
                <InfoItem label="Phone Number" value={student.phone} />
                <div className="sm:col-span-2">
                  <InfoItem label="Current Address" value={student.address} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guardian Information */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-aubergine-600" /> Guardian Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Guardian Name" value={student.guardian.name} />
                <InfoItem label="Relationship" value={student.guardian.relationship} />
                <InfoItem label="Guardian Phone" value={student.guardian.phone} />
                <InfoItem label="Guardian Email" value={student.guardian.email || 'N/A'} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Security Box */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center text-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest mb-2">Need to update info?</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              For security reasons, students cannot modify their own profile data. Please contact the administrative office if you need to update any information.
            </p>
          </div>

          {/* Academic Summary */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Academic Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 font-medium">Monthly Attendance</span>
                  <span className="text-emerald-600 font-bold">92%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-2 border-t border-slate-100 dark:border-surface-raised pt-3">
                  <span className="text-slate-500 font-medium font-bold uppercase tracking-tighter">Current Class</span>
                  <span className="text-aubergine-600 font-bold">{student.class}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-2 border-t border-slate-100 dark:border-surface-raised pt-3">
                  <span className="text-slate-500 font-medium font-bold uppercase tracking-tighter">Academic Year</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{currentAcademicYear}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const sanitizedValue = value ? sanitizeText(value) : value;
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 leading-none mb-1.5">{sanitizeText(label)}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sanitizedValue}</p>
    </div>
  );
}
