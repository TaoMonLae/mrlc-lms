import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentForm from './StudentForm';

export default function StudentEdit() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/students/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch student details');
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchStudent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading student details...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Student profile not found.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/students" />} nativeButton={false}>
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/students/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Student Details</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Update information for {student.user?.firstName} {student.user?.lastName}.</p>
      </div>

      <StudentForm initialData={student} isEdit />
    </div>
  );
}
