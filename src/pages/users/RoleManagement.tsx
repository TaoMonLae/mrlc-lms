import React, { useState } from 'react';
import { Save, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { UserRole, Permission, PERMISSION_LABELS, PERMISSION_CATEGORIES, ROLE_PERMISSIONS } from '@/src/lib/permissions';
import { toast } from 'sonner';
import PermissionMatrix from '../../components/users/PermissionMatrix';

interface RoleManagementProps {
  open: boolean;
  onClose: () => void;
  onSave?: (roleConfig: Record<UserRole, Permission[]>) => void;
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

export default function RoleManagement({ open, onClose, onSave }: RoleManagementProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER');
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>(ROLE_PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentPermissions = rolePermissions[selectedRole] || [];

  const togglePermission = (permission: Permission) => {
    setHasChanges(true);
    setRolePermissions(prev => {
      const updated = { ...prev };
      const currentPerms = updated[selectedRole] || [];

      if (currentPerms.includes(permission)) {
        updated[selectedRole] = currentPerms.filter(p => p !== permission);
      } else {
        updated[selectedRole] = [...currentPerms, permission];
      }

      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to the backend
      // For now, we'll just call the onSave callback
      if (onSave) {
        await onSave(rolePermissions);
      }
      toast.success('Role permissions updated successfully');
      setHasChanges(false);
      onClose();
    } catch (error) {
      toast.error('Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRolePermissions(ROLE_PERMISSIONS);
    setHasChanges(false);
    toast.success('Role permissions reset to defaults');
  };

  const getCategoryPermissions = (category: string): Permission[] => {
    return (PERMISSION_CATEGORIES[category] || []) as Permission[];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Role & Permissions Management
          </DialogTitle>
          <DialogDescription>
            Configure which permissions each role has access to. Changes will affect all users with the selected role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role Selector */}
          <div className="space-y-2">
            <Label>Select Role to Configure</Label>
            <Select value={selectedRole} onValueChange={(val: UserRole) => setSelectedRole(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission Summary */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {ROLE_LABELS[selectedRole]} Permissions
              </span>
              <Badge variant="secondary">
                {currentPermissions.length} permissions
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedRole === 'ADMIN'
                ? 'Administrators have full system access and cannot be restricted.'
                : 'Customize which features and capabilities this role can access.'
              }
            </p>
          </div>

          {/* Permission Categories */}
          {!hasChanges && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Permissions will be applied system-wide. Make changes carefully.</span>
            </div>
          )}

          {hasChanges && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>You have unsaved changes. Don't forget to save before closing.</span>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
              const categoryPerms = getCategoryPermissions(categoryKey);
              if (categoryPerms.length === 0) return null;

              return (
                <div key={categoryKey} className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {categoryLabel}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryPerms.map(permission => {
                      const isGranted = currentPermissions.includes(permission);
                      const isDisabled = selectedRole === 'ADMIN';

                      return (
                        <button
                          key={permission}
                          type="button"
                          onClick={() => !isDisabled && togglePermission(permission)}
                          disabled={isDisabled}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            isDisabled
                              ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-60'
                              : isGranted
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900 hover:bg-green-100 dark:hover:bg-green-900/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isGranted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isGranted && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <span className={`text-sm ${
                            isGranted
                              ? 'text-green-700 dark:text-green-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {PERMISSION_LABELS[permission]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permission Matrix Overview */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Current Role Permissions Overview
          </h4>
          <PermissionMatrix showAllPermissions={false} />
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Reset to Defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}