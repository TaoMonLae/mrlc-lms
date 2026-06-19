import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Pin, 
  Edit, 
  Archive, 
  Calendar, 
  ShieldCheck,
  Share2,
  Printer,
  ChevronRight,
  User,
  Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/src/lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Announcement, AnnouncementAudience } from './AnnouncementsList';

export default function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, hasPermission } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_announcements');

  useEffect(() => {
    if (!id) return;
    const fetchAnnouncement = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/announcements/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('Announcement not found');
          navigate('/announcements');
          return;
        }
        setAnnouncement(await res.json());
      } catch (error) {
        console.error('Error fetching announcement:', error);
        toast.error('Failed to load announcement');
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading announcement...</span>
      </div>
    );
  }

  if (!announcement) return null;

  const getAudienceColor = (audience: AnnouncementAudience) => {
    switch (audience) {
      case 'ALL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'TEACHERS': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'STUDENTS': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'CLASS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            render={<Link to="/announcements" />}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-surface-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-aubergine-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Announcement Details</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button variant="outline" size="sm" onClick={handleShare} className="h-9 px-3">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-3">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button render={<Link to={`/announcements/${id}/edit`} />} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden bg-slate-50/50 dark:bg-surface-indigo/50">
            <CardContent className="p-5 space-y-6">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Published By</h4>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-aubergine-100 dark:bg-aubergine-900/30 rounded-full flex items-center justify-center text-aubergine-600 dark:text-aubergine-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{announcement.createdByName}</p>
                    <p className="text-xs text-slate-500">School Faculty</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200 dark:bg-surface-raised" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Published
                  </span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">
                    {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Users className="h-3 w-3" /> Audience
                  </span>
                  <Badge variant="secondary" className={`${getAudienceColor(announcement.audience)} border-none text-[10px] h-5`}>
                    {announcement.audience}
                  </Badge>
                </div>

                {announcement.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-2 text-rose-500">
                      <Calendar className="h-3 w-3" /> Expires
                    </span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      {format(new Date(announcement.expiresAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Pin className="h-3 w-3" /> Priority
                  </span>
                  <span className={`text-xs font-bold ${announcement.pinned ? 'text-aubergine-600' : 'text-slate-900 dark:text-white'}`}>
                    {announcement.pinned ? 'HIGH / PINNED' : 'NORMAL'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-aubergine-50 dark:bg-aubergine-900/20 rounded-xl p-4 flex gap-3 border border-aubergine-100 dark:border-aubergine-900/50">
            <ShieldCheck className="h-5 w-5 text-aubergine-600 shrink-0" />
            <p className="text-[11px] text-aubergine-800 dark:text-aubergine-400 leading-relaxed font-medium">
              This message is verified by the school administration and is part of official school communications.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="order-1 lg:order-2 lg:col-span-3">
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm min-h-[500px]">
            <CardContent className="p-8 md:p-12">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {announcement.pinned && (
                      <Badge className="bg-aubergine-600 text-white hover:bg-aubergine-600 border-none px-2 h-6 flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">
                        <Pin className="h-3 w-3 fill-current" /> Important
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-slate-300 dark:border-surface-raised text-slate-500 px-2 h-6 uppercase tracking-wider font-bold text-[10px]">
                      Announcement
                    </Badge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {announcement.title}
                  </h1>
                </div>

                <Separator className="bg-slate-100 dark:bg-surface-raised" />

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {announcement.body.split('\n').map((para, i) => (
                    <p key={i} className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6 font-medium">
                      {para}
                    </p>
                  ))}
                </div>
                
                <div className="pt-12">
                   <div className="flex flex-col gap-4 p-6 bg-slate-50 dark:bg-surface-raised/30 rounded-2xl border border-slate-100 dark:border-surface-raised">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-aubergine-600" />
                        Announcement Actions
                      </h4>
                      <p className="text-sm text-slate-500">Need more information or want to follow up on this announcement?</p>
                      <div className="flex flex-wrap gap-3 mt-2">
                         <Button variant="secondary" className="h-10 text-xs">Contact Administrator</Button>
                         <Button variant="ghost" className="h-10 text-xs text-aubergine-600 hover:text-aubergine-700 hover:bg-aubergine-50 dark:hover:bg-aubergine-900/20">Suggest Changes</Button>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex items-center justify-between text-slate-400">
              <Link to="/announcements" className="text-sm font-bold flex items-center gap-2 hover:text-aubergine-600 transition-colors">
                <ChevronRight className="h-4 w-4 rotate-180" /> Back to all announcements
              </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
