import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/src/lib/permissions';
import { Shield, GraduationCap, User, Users, DollarSign, Briefcase, BookOpen } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  showDescription?: boolean;
  className?: string;
}

const ROLE_CONFIG: Record<UserRole, { icon: any; color: string; description: string }> = {
  ADMIN: {
    icon: Shield,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900',
    description: 'Full system access'
  },
  TEACHER: {
    icon: GraduationCap,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    description: 'Educational content & classes'
  },
  STUDENT: {
    icon: User,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900',
    description: 'Learning access'
  },
  STAFF: {
    icon: Users,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-900',
    description: 'Basic access'
  },
  ACCOUNTANT: {
    icon: DollarSign,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    description: 'Financial management'
  },
  CASE_WORKER: {
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    description: 'Student support'
  },
  LIBRARIAN: {
    icon: BookOpen,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
    description: 'Library management'
  },
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  STAFF: 'Staff',
  ACCOUNTANT: 'Accountant',
  CASE_WORKER: 'Case Worker',
  LIBRARIAN: 'Librarian',
};

export default function RoleBadge({ role, showDescription = false, className = '' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {ROLE_LABELS[role]}
      </Badge>
      {showDescription && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {config.description}
        </span>
      )}
    </div>
  );
}