import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Image as ImageIcon, Video, Link as LinkIcon, File, Download, ExternalLink, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions, useUser } from '../../lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK' | 'DOCUMENT' | 'OTHER';
  fileUrl?: string;
  externalUrl?: string;
  classId?: string;
  subjectId?: string;
  visibility: 'TEACHERS_ONLY' | 'STUDENTS' | 'ALL';
  uploadedById: string;
  uploadedByName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export default function LibraryList() {
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/library', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch library resources');
        const data = await res.json();
        setResources(
          (Array.isArray(data) ? data : []).map((r: any) => ({
            ...r,
            status: r.status || 'ACTIVE',
            uploadedByName: r.uploadedByName || 'School Library',
          }))
        );
      } catch (error) {
        console.error('Error fetching library resources:', error);
        toast.error('Failed to load library resources');
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="text-red-500" />;
      case 'IMAGE': return <ImageIcon className="text-blue-500" />;
      case 'VIDEO': return <Video className="text-purple-500" />;
      case 'LINK': return <LinkIcon className="text-emerald-500" />;
      case 'DOCUMENT': return <File className="text-blue-700" />;
      default: return <File className="text-slate-500" />;
    }
  };

  const filteredResources = resources.filter(r => {
    // Role-based visibility check
    if (!isAdmin && user) {
      if (r.visibility === 'TEACHERS_ONLY' && !isTeacher) return false;
      if (r.visibility === 'STUDENTS' && isTeacher) return true; // teachers usually see student resources
    }

    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchesVisibility = visibilityFilter === 'ALL' || r.visibility === visibilityFilter;

    return matchesSearch && matchesType && matchesVisibility && r.status === 'ACTIVE';
  });

  const canManage = (resource: Resource) => {
    if (isAdmin) return true;
    if (isTeacher && resource.uploadedById === user?.teacherId) return true;
    if (isTeacher && resource.uploadedById === user?.id) return true;
    return false;
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Library Central</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Discover and manage learning resources.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {(isAdmin || isTeacher) && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/library/new" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Resource
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search resources by title or description..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2"><Filter className="h-3 w-3" /><SelectValue placeholder="File Type" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="PDF">PDFs</SelectItem>
              <SelectItem value="IMAGE">Images</SelectItem>
              <SelectItem value="VIDEO">Videos</SelectItem>
              <SelectItem value="DOCUMENT">Documents</SelectItem>
              <SelectItem value="LINK">Links</SelectItem>
            </SelectContent>
          </Select>

          {(isAdmin || isTeacher) && (
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Access</SelectItem>
                <SelectItem value="ALL_LOGGED">Everyone</SelectItem>
                <SelectItem value="STUDENTS">Students Only</SelectItem>
                <SelectItem value="TEACHERS_ONLY">Teachers Only</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading resources...</span>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No resources found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.map((resource) => (
            <div key={resource.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-surface-raised rounded-xl">
                    {getIconForType(resource.type)}
                  </div>
                  {canManage(resource) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" />} nativeButton={true}>
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link to={`/library/${resource.id}/edit`} className="flex w-full" />} nativeButton={false}>
                          <Edit2 className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                  <Link to={`/library/${resource.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {resource.title}
                  </Link>
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-2 mb-4 flex-1">
                  {resource.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-auto">
                   <Badge variant="secondary" className="text-xs font-normal">
                     {resource.type}
                   </Badge>
                   {resource.visibility === 'TEACHERS_ONLY' && (
                     <Badge variant="outline" className="text-xs font-normal border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                       Teachers Only
                     </Badge>
                   )}
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-surface-raised/50 p-4 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between gap-3 text-xs text-slate-500">
                <div className="min-w-0">
                  <span className="block truncate max-w-[140px]">By {resource.uploadedByName || 'School Library'}</span>
                  <span>{formatDistanceToNow(new Date(resource.createdAt))} ago</span>
                </div>
                {resource.externalUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    render={<a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                  >
                    {resource.type === 'LINK' || resource.type === 'VIDEO' ? (
                      <ExternalLink className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
