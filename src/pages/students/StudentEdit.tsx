import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentForm from './StudentForm';

// Mock data fetch
const getMockData = (id: string) => {
  return {
    id,
    studentId: 'ST-2024-001',
    firstName: 'Min Khant',
    lastName: 'Aung',
    dateOfBirth: '2005-08-15',
    gender: 'MALE',
    nationality: 'Myanmar',
    address: '123 Main St, Yangon',
    classId: 'ged-social-studies',
    enrollmentDate: '2024-01-15',
    status: 'ACTIVE',
    guardianName: 'U Aung',
    guardianPhone: '+95912345678',
    emergencyContact: 'Daw Su +95987654321',
    unhcrNumber: '',
    notes: 'Needs extra help with English'
  };
};

export default function StudentEdit() {
  const { id } = useParams<{ id: string }>();
  const initialData = getMockData(id || '1');

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/students/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Student Details</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Update information for {initialData.firstName} {initialData.lastName}.</p>
      </div>

      <StudentForm initialData={initialData} isEdit />
    </div>
  );
}
