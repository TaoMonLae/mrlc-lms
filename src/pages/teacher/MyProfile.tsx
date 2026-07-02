import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';

/**
 * Resolves the signed-in teacher's own record and forwards to the standard
 * teacher profile page, where they can view details and edit personal fields.
 */
export default function MyProfile() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiGet<{ id: string }>('/api/teacher/me')
      .then((t) => setTeacherId(t.id))
      .catch((e: any) => {
        toast.error(e?.message || 'No teacher profile is linked to your account. Contact an administrator.');
        setFailed(true);
      });
  }, []);

  if (failed) return <Navigate to="/teacher/dashboard" replace />;
  if (teacherId) return <Navigate to={`/teachers/${teacherId}`} replace />;
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <span className="ml-3 text-slate-500">Loading your profile...</span>
    </div>
  );
}
