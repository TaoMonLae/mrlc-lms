import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentForm from './StudentForm';

export default function StudentNew() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/students" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add New Student</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Enter details to enroll a new student into the system.</p>
      </div>

      <StudentForm />
    </div>
  );
}
