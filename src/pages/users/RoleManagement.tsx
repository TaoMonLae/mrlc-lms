import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserRole,
  Permission,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
} from '@/src/lib/permissions';
import PermissionMatrix from '../../components/users/PermissionMatrix';

interface RoleManagementProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  STAFF: 'Staff',
  ACCOUNTANT: 'Accountant',
  CASE_WORKER: 'Case Worker',
  LIBRARIAN: 'Librarian',
};

const CATEGORY_LABELS: Record<string, string> = {
  USER_MANAGEMENT: 'User Management',
  STUDENT_MANAGEMENT: 'Student Management',
  TEACHER_MANAGEMENT: 'Teacher Management',
  ACADEMIC_MANAGEMENT: 'Academic Management',
  EXAM_MANAGEMENT: 'Exam & Assessment',
  ATTENDANCE_MANAGEMENT: 'Attendance Management',
  FINANCIAL_MANAGEMENT: 'Financial Management',
  LIBRARY_MANAGEMENT: 'Library & Resources',
  COMMUNICATIONS: 'Communications',
  CASE_MANAGEMENT: 'Case Management',
  SYSTEM_MANAGEMENT: 'System & Reports',
  CONTENT_MANAGEMENT: 'Content Management',
  SUPER_ADMIN: 'Super Admin',
};

export default function RoleManagement({ open, onClose }: RoleManagementProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER');
  const currentPermissions = ROLE_PERMISSIONS[selectedRole] || [];

  const getCategoryPermissions = (category: string): Permission[] =>
    (PERMISSION_CATEGORIES[category] || []) as Permission[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Role Access Reference
          </DialogTitle>
          <DialogDescription>
            Review the system-defined access granted to each account role.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-6">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Role permissions are deployment-managed and cannot be changed from this screen.</span>
          </div>

          <div className="space-y-2">
            <Label>Select role to review</Label>
            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{ROLE_LABELS[selectedRole]} access</span>
              <Badge variant="secondary">{currentPermissions.length} permissions</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedRole === 'TEACHER'
                ? 'Full-time, part-time, and volunteer are employment classifications. They all use the Teacher role; class and subject assignments determine which academic records a teacher can access.'
                : selectedRole === 'ADMIN'
                  ? 'Administrators have full system access.'
                  : 'Every active user with this role receives the access listed below.'}
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
              const granted = getCategoryPermissions(categoryKey).filter((permission) =>
                currentPermissions.includes(permission),
              );
              if (granted.length === 0) return null;
              return (
                <section key={categoryKey} className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{categoryLabel}</h4>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {granted.map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">{PERMISSION_LABELS[permission]}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="min-w-0 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">All roles overview</h4>
            <PermissionMatrix showAllPermissions={false} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
