import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit2, ShieldAlert, CheckCircle2, UserX, UserCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { User } from '../../lib/permissions';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@school.edu',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    name: 'Sarah Principal',
    username: 'sprincipal',
    email: 'sarah.p@school.edu',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'u3',
    name: 'John Teacher',
    username: 'jteacher',
    role: 'TEACHER',
    teacherId: 't1',
    status: 'ACTIVE',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'u4',
    name: 'Mike Student',
    username: 'mstudent',
    role: 'STUDENT',
    studentId: 's1',
    status: 'DISABLED',
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
  }
];

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
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

  const handleToggleStatus = (userId: string, currentStatus: string, role: string) => {
    if (role === 'ADMIN' && currentStatus === 'ACTIVE' && activeAdminCount <= 1) {
      toast.error('Cannot disable the last active administrator.');
      return;
    }
    
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, status: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' };
      }
      return u;
    }));
    toast.success(`User status updated.`);
  };

  const handleResetPassword = () => {
    toast.success('Password reset link has been generated.');
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'TEACHER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'STUDENT': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage user accounts and roles for the school system.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" render={<Link to="/settings/roles" />} nativeButton={false}>
            <Shield className="mr-2 h-4 w-4" />
            Roles & Permissions
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 w-full sm:w-auto" render={<Link to="/users/new" />} nativeButton={false}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
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
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-xs text-slate-500 mt-1">@{user.username} {user.email && `• ${user.email}`}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
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
                      <Link to={`/students/${user.studentId}`} className="text-orange-600 hover:underline flex items-center gap-1">
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
                          <DropdownMenuItem onClick={handleResetPassword}>
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
                     No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
