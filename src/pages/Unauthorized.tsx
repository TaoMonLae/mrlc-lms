import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-canvas p-4">
      <div className="bg-white dark:bg-surface-indigo rounded-2xl shadow-xl border border-slate-200 dark:border-surface-raised p-8 max-w-md w-full text-center">
        <div className="mx-auto h-20 w-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-300 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        
        <Button className="w-full" render={<Link to="/" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
