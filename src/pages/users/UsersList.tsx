import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit2, ShieldAlert, CheckCircle2, UserX, UserCheck, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { User } from '../../lib/permissions';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import RoleManagement from './RoleManagement';
import RoleBadge from '../../components/users/RoleBadge';

interface ApiUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: User['role'];
  isActive: boolean;
  createdAt?: string;
  studentProfile?: { id: string } | null;
  teacherProfile?: { id: string } | null;
}

function mapUser(u: ApiUser): User {
  return {
    id: u.id,
    name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
    username: u.email ? u.email.split('@')[0] : '',
    email: u.email,
    role: u.role,
    status: u.isActive ? 'ACTIVE' : 'DISABLED',
    studentId: u.studentProfile?.id,
    teacherId: u.teacherProfile?.id,
    createdAt: u.createdAt ?? new Date().toISOString(),
    updatedAt: u.createdAt ?? new Date().toISOString(),
  };
}

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load users');
        const data: ApiUser[] = await res.json();
        setUsers(data.map(mapUser));
      } catch (e: any) {
        toast.error(e.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Count active admins to prevent deleting the last one
  const activeAdminCount = users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE').length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          u.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = async (userId: string, currentStatus: string, role: string) => {
    if (role === 'ADMIN' && currentStatus === 'ACTIVE' && activeAdminCount <= 1) {
      toast.error('Cannot disable the last active administrator.');
      return;
    }

    const newStatus: 'ACTIVE' | 'DISABLED' = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update status');
      }
      setUsers(users.map(u => (u.id === userId ? { ...u, status: newStatus } : u)));
      toast.success('User status updated.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setResetting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${resetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reset password');
      }
      toast.success(`Password reset for ${resetUser.name}. They must change it on next login.`);
      setResetUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'TEACHER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'STUDENT': return 'bg-aubergine-100 text-aubergine-800 dark:bg-aubergine-900/30 dark:text-aubergine-300 border-aubergine-200 dark:border-aubergine-800';
      default: return 'bg-slate-100 text-slate-800 dark:bg-surface-raised dark:text-slate-300 border-slate-200 dark:border-surface-raised';
    }
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage user accounts and roles for the school system.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setRoleManagementOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Roles & Permissions
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/users/new" />} nativeButton={false}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, username, email, or role..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="TEACHER">Teacher</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="LIBRARIAN">Librarian</SelectItem>
              <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
              <SelectItem value="CASE_WORKER">Case Worker</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden md:block bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Linked Profile</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} className="h-9 w-9 text-xs" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-500 mt-1">@{user.username} {user.email && `• ${user.email}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'} className={user.status === 'ACTIVE' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-500 text-white hover:bg-slate-600'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {user.teacherId ? (
                      <Link to={`/teachers/${user.teacherId}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        Teacher Profile
                      </Link>
                    ) : user.studentId ? (
                      <Link to={`/students/${user.studentId}`} className="text-aubergine-600 hover:underline flex items-center gap-1">
                        Student Profile
                      </Link>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 gap-1">
                    {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />} nativeButton={true}>
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem render={<Link to={`/users/${user.id}/edit`} className="flex w-full" />} nativeButton={false}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setResetUser(user); setNewPassword(''); }}>
                            <ShieldAlert className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        {user.status === 'ACTIVE' ? (
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                            onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                          >
                            <UserX className="mr-2 h-4 w-4" /> Disable User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                            onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Activate User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                     {loading ? 'Loading users…' : 'No users found matching your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo py-10 text-center text-slate-500">
            {loading ? 'Loading users…' : 'No users found matching your filters.'}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={user.name} className="h-9 w-9 text-xs" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">@{user.username}{user.email && ` • ${user.email}`}</div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mr-1 shrink-0" aria-label={`Options for ${user.name}`} />} nativeButton={true}>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem render={<Link to={`/users/${user.id}/edit`} className="flex w-full" />} nativeButton={false}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setResetUser(user); setNewPassword(''); }}>
                        <ShieldAlert className="mr-2 h-4 w-4" /> Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    {user.status === 'ACTIVE' ? (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                        onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                      >
                        <UserX className="mr-2 h-4 w-4" /> Disable User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                        onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" /> Activate User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'} className={user.status === 'ACTIVE' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-500 text-white hover:bg-slate-600'}>
                  {user.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-surface-raised text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Linked Profile</span>
                  {user.teacherId ? (
                    <Link to={`/teachers/${user.teacherId}`} className="text-blue-600 hover:underline">Teacher Profile</Link>
                  ) : user.studentId ? (
                    <Link to={`/students/${user.studentId}`} className="text-aubergine-600 hover:underline">Student Profile</Link>
                  ) : (
                    <span className="text-slate-400 italic">None</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Last Login</span>
                  <span className="text-slate-700 dark:text-slate-300">{user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={resetUser !== null} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPassword(''); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="pt-1">
              Set a new password for <strong className="text-slate-900 dark:text-white">{resetUser?.name}</strong>. They will be required to change it on their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoleManagement
        open={roleManagementOpen}
        onClose={() => setRoleManagementOpen(false)}
        onSave={(roleConfig) => {
          // Handle role configuration save
          console.log('Role configuration saved:', roleConfig);
          // In a real implementation, this would save to backend
        }}
      />
    </div>
  );
}
