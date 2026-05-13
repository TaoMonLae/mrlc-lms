import React, { useState } from 'react';
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
  Eye,
  Calendar,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle
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

// Mock Data
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'School Reopening & Safety Guidelines',
    body: 'Welcome back students! Please read the attached safety guidelines for the upcoming semester. We prioritize your health and safety above all else. Daily temperature checks will be mandatory...',
    audience: 'ALL',
    pinned: true,
    createdById: 'u1',
    createdByName: 'Admin User',
    status: 'ACTIVE',
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'ann-2',
    title: 'Final Exam Schedule - Term 1',
    body: 'The final exam schedule for Term 1 has been released. Please check your student portal for specific timings and room assignments. Ensure you arrive at least 15 minutes before the start time.',
    audience: 'STUDENTS',
    pinned: true,
    expiresAt: '2025-06-15T23:59:59Z',
    createdById: 'u1',
    createdByName: 'Admin User',
    status: 'ACTIVE',
    createdAt: '2025-05-10T10:30:00Z',
    updatedAt: '2025-05-10T10:30:00Z',
  },
  {
    id: 'ann-3',
    title: 'Staff Meeting: Curriculum Development',
    body: 'Reminder for all teaching staff about our monthly meeting regarding curriculum updates and student progress reporting. We will be discussing the new integration of digital assessment tools.',
    audience: 'TEACHERS',
    pinned: false,
    createdById: 'u1',
    createdByName: 'Admin User',
    status: 'ACTIVE',
    createdAt: '2025-05-12T14:00:00Z',
    updatedAt: '2025-05-12T14:00:00Z',
  },
  {
    id: 'ann-4',
    title: 'Mathematics Grade 10A: Quiz Tomorrow',
    body: 'Don\'t forget about the surprise-not-surprise quiz on Algebra tomorrow. Review chapters 4 and 5 in your textbooks. Focus on quadratic equations and their real-world applications.',
    audience: 'CLASS',
    classId: 'c1',
    className: 'Grade 10A',
    pinned: false,
    createdById: 't1',
    createdByName: 'Teacher Jane',
    status: 'ACTIVE',
    createdAt: '2025-05-13T09:15:00Z',
    updatedAt: '2025-05-13T09:15:00Z',
  }
];

export default function AnnouncementsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState<AnnouncementAudience | 'ALL_FILT'>('ALL_FILT');
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
  const { isAdmin, hasPermission } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_announcements');

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

  const handleArchive = (id: string) => {
    setAnnouncements(prev => prev.map(ann => 
      ann.id === id ? { ...ann, status: ann.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' } : ann
    ));
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
            <Megaphone className="h-6 w-6 text-indigo-600" />
            Announcements
          </h1>
          <p className="text-sm text-slate-500">
            Internal school communications and broadcasts.
          </p>
        </div>
        {canManage && (
          <Button render={<Link to="/announcements/new" />} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search announcements..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 ring-offset-indigo-600 focus-visible:ring-indigo-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 mr-1" />
          <select 
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-600 outline-none flex-1 md:flex-none min-w-[140px]"
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
            className={`group relative bg-white dark:bg-slate-900 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
              ann.pinned ? 'border-indigo-200 dark:border-indigo-900/50' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {ann.pinned && (
              <div className="absolute top-0 right-0 p-2">
                <div className="bg-indigo-600 text-white p-1 rounded-bl-lg rounded-tr-md shadow-sm">
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
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 border-slate-300 dark:border-slate-700">
                    Archived
                  </Badge>
                )}
              </div>
              
              <Link to={`/announcements/${ann.id}`} className="block group-hover:text-indigo-600 transition-colors">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-2">
                  {ann.title}
                </h3>
              </Link>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                {ann.body}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
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

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                render={<Link to={`/announcements/${ann.id}`} />}
                className="text-xs h-8 text-slate-600 hover:text-indigo-600"
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
                    <DropdownMenuItem onClick={() => handleArchive(ann.id)} className={ann.status === 'ARCHIVED' ? 'text-indigo-600' : 'text-amber-600'}>
                      <Archive className="mr-2 h-4 w-4" /> {ann.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}

        {sortedAnnouncements.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No announcements found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
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
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{announcements.filter(a => a.status === 'ACTIVE').length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Pin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pinned</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{announcements.filter(a => a.pinned).length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recent Views</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">1.2k</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiring Soon</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">3</p>
          </div>
        </div>
      </div>
    </div>
  );
}
