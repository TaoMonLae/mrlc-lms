import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  Pin, 
  Clock, 
  Users, 
  MoreVertical, 
  Edit, 
  Archive, 
  Calendar,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/src/lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Types
export type AnnouncementAudience = 'ALL' | 'TEACHERS' | 'STUDENTS' | 'CLASS';
export type AnnouncementStatus = 'ACTIVE' | 'ARCHIVED';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classId?: string;
  className?: string; // For display
  pinned: boolean;
  expiresAt?: string;
  createdById: string;
  createdByName: string;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState<AnnouncementAudience | 'ALL_FILT'>('ALL_FILT');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, hasPermission } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_announcements');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/announcements', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch announcements');
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        toast.error('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ann.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAudience = filterAudience === 'ALL_FILT' || ann.audience === filterAudience;
    return matchesSearch && matchesAudience;
  });

  // Sort: Pinned first, then by createdAt desc
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const activeCount = announcements.filter(a => a.status === 'ACTIVE').length;
  const pinnedCount = announcements.filter(a => a.pinned).length;
  const totalRecordsCount = announcements.length;
  const expiringSoonCount = announcements.filter(a => {
    if (!a.expiresAt || a.status !== 'ACTIVE') return false;
    const expiresAt = new Date(a.expiresAt).getTime();
    return expiresAt >= now && expiresAt <= weekFromNow;
  }).length;

  const handleArchive = async (id: string) => {
    const current = announcements.find(a => a.id === id);
    if (!current) return;
    const nextStatus: AnnouncementStatus = current.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setAnnouncements(prev => prev.map(ann =>
        ann.id === id ? { ...ann, status: nextStatus } : ann
      ));
      toast.success(nextStatus === 'ARCHIVED' ? 'Announcement archived' : 'Announcement restored');
    } catch {
      toast.error('Failed to update announcement');
    }
  };

  const getAudienceColor = (audience: AnnouncementAudience) => {
    switch (audience) {
      case 'ALL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'TEACHERS': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'STUDENTS': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'CLASS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-aubergine-600" />
            Announcements
          </h1>
          <p className="text-sm text-slate-500">
            Internal school communications and broadcasts.
          </p>
        </div>
        {canManage && (
          <Button render={<Link to="/announcements/new" />} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search announcements..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 ring-offset-aubergine-600 focus-visible:ring-aubergine-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 mr-1" />
          <select 
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-sm focus:ring-2 focus:ring-aubergine-600 outline-none flex-1 md:flex-none min-w-[140px]"
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value as any)}
          >
            <option value="ALL_FILT">All Audiences</option>
            <option value="ALL">Everyone</option>
            <option value="TEACHERS">Teachers Only</option>
            <option value="STUDENTS">Students Only</option>
            <option value="CLASS">Specific Class</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAnnouncements.map((ann) => (
          <div 
            key={ann.id} 
            className={`group relative bg-white dark:bg-surface-indigo border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
              ann.pinned ? 'border-aubergine-200 dark:border-aubergine-900/50' : 'border-slate-200 dark:border-surface-raised'
            }`}
          >
            {ann.pinned && (
              <div className="absolute top-0 right-0 p-2">
                <div className="bg-aubergine-600 text-white p-1 rounded-bl-lg rounded-tr-md shadow-sm">
                  <Pin className="h-3 w-3 fill-current" />
                </div>
              </div>
            )}

            <div className="p-5 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className={`${getAudienceColor(ann.audience)} border-none text-[10px] uppercase tracking-wider font-bold h-5`}>
                  {ann.audience === 'CLASS' ? ann.className : ann.audience}
                </Badge>
                {ann.status === 'ARCHIVED' && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 border-slate-300 dark:border-surface-raised">
                    Archived
                  </Badge>
                )}
              </div>
              
              <Link to={`/announcements/${ann.id}`} className="block group-hover:text-aubergine-600 transition-colors">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-2">
                  {ann.title}
                </h3>
              </Link>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                {ann.body}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-surface-raised text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {format(new Date(ann.createdAt), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {ann.createdByName}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-surface-raised/50 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                render={<Link to={`/announcements/${ann.id}`} />}
                className="text-xs h-8 text-slate-600 hover:text-aubergine-600"
              >
                Read More <ChevronRight className="ml-1 h-3 w-3" />
              </Button>

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-white" />} nativeButton={true}>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem render={<Link to={`/announcements/${ann.id}/edit`} className="w-full flex items-center" />}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(ann.id)} className={ann.status === 'ARCHIVED' ? 'text-aubergine-600' : 'text-amber-600'}>
                      <Archive className="mr-2 h-4 w-4" /> {ann.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            Loading announcements...
          </div>
        )}

        {!loading && sortedAnnouncements.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-xl border border-dashed border-slate-300 dark:border-surface-raised">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No announcements found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {announcements.length === 0 ? 'No announcements have been created yet.' : 'Try adjusting your search or filters.'}
            </p>
            {canManage && (
              <Button render={<Link to="/announcements/new" />} variant="outline" className="mt-6">
                Create First Announcement
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Short Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-aubergine-100 dark:bg-aubergine-900/30 rounded-full flex items-center justify-center text-aubergine-600 dark:text-aubergine-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Pin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pinned</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{pinnedCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalRecordsCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiring Soon</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{expiringSoonCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
