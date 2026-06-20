import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Download, ExternalLink, FileText, Image as ImageIcon, Video, Link as LinkIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

type LibraryResource = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  type: string;
  externalUrl?: string | null;
  classId?: string | null;
  visibility?: string | null;
  createdAt: string;
};

export default function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = usePermissions();

  const [resource, setResource] = useState<LibraryResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchResource = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/library/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 404) {
            setResource(null);
          } else if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view this resource');
          } else {
            throw new Error('Failed to fetch resource');
          }
          return;
        }
        const data = await res.json();
        setResource(data);
      } catch (error) {
        console.error('Error fetching library resource:', error);
        toast.error('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [id]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="text-red-500 h-8 w-8" />;
      case 'IMAGE': return <ImageIcon className="text-blue-500 h-8 w-8" />;
      case 'VIDEO': return <Video className="text-purple-500 h-8 w-8" />;
      case 'LINK': return <LinkIcon className="text-emerald-500 h-8 w-8" />;
      case 'DOCUMENT': return <File className="text-blue-700 h-8 w-8" />;
      default: return <File className="text-slate-500 h-8 w-8" />;
    }
  };

  const getEmbedUrl = (url: string | undefined | null) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // YouTube
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        let videoId = u.searchParams.get('v');
        if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1);
        if (videoId) {
          // Use privacy-enhanced embed and comprehensive parameters to avoid Error 153
          const params = new URLSearchParams({
            rel: '0',              // Don't show related videos from other channels
            enablejsapi: '1',      // Enable JavaScript API
            widgetid: '1',         // Widget identifier
            origin: window.location.origin, // Current origin for security
            autoplay: '0',         // Don't autoplay
            modestbranding: '1',   // Minimal branding
            playsinline: '1',      // Play inline on mobile
            fs: '1',               // Allow fullscreen
          });
          return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
        }
      }
      // Vimeo
      if (u.hostname.includes('vimeo.com')) {
        const videoId = u.pathname.split('/').pop();
        if (videoId) return `https://player.vimeo.com/video/${videoId}`;
      }
    } catch {
      // Fallback to regex for URL strings that can't be parsed
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        const params = new URLSearchParams({
          rel: '0',
          enablejsapi: '1',
          widgetid: '1',
          origin: window.location.origin,
          autoplay: '0',
          modestbranding: '1',
          playsinline: '1',
          fs: '1',
        });
        return `https://www.youtube-nocookie.com/embed/${match[1]}?${params.toString()}`;
      }
    }
    return null;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success("Resource deleted");
      navigate("/library");
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading resource...</span>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/library" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 dark:bg-surface-indigo dark:border-surface-raised">
          Resource not found.
        </div>
      </div>
    );
  }

  const canManage = isAdmin || isTeacher;
  const embedUrl = getEmbedUrl(resource.externalUrl);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/library" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
                {getIconForType(resource.type)}
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{resource.title}</h1>
               <div className="flex flex-wrap items-center gap-2 mt-2">
                 <Badge variant="secondary" className="font-normal">{resource.type}</Badge>
                 {resource.visibility === 'TEACHERS_ONLY' ? (
                   <Badge variant="outline" className="font-normal border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400">
                     Internal Staff Only
                   </Badge>
                 ) : (
                   <Badge variant="outline" className="font-normal border-slate-200 text-slate-600 dark:border-surface-raised dark:text-slate-300">
                     Visible to Students
                   </Badge>
                 )}
               </div>
             </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link to={`/library/${resource.id}/edit`} />} nativeButton={false}>
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
            {embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title="Video player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-surface-indigo/50">
                {getIconForType(resource.type)}
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Preview not available</h3>
                <p className="text-slate-500 mt-1 max-w-sm">This file type cannot be previewed directly in the browser.</p>
                {resource.externalUrl && (
                  <div className="mt-6">
                    <Button render={<a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                         <ExternalLink className="mr-2 h-4 w-4" /> {resource.type === 'LINK' || resource.type === 'VIDEO' ? 'Open Link' : 'Open File'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{resource.description || 'No description available.'}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Information</h3>

            <dl className="space-y-4">
              {resource.author && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-300">Author</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">{resource.author}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Date Added</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{format(new Date(resource.createdAt), 'MMMM d, yyyy')}</dd>
              </div>
              {resource.classId && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-300">Assigned Class</dt>
                  <dd className="font-medium text-blue-600 dark:text-blue-400">
                    <Link to={`/classes/${resource.classId}`} className="hover:underline">View Class</Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

      </div>
    </div>
  );
}
